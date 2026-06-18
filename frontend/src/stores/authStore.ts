import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AdminResponse } from '@/types';

interface AuthState {
  admin: AdminResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isAuthenticated: api.isAuthenticated,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ access_token: string; refresh_token: string; admin: AdminResponse }>('/auth/login', { email, password });
      if (res.success && res.data) {
        api.setTokens(res.data.access_token, res.data.refresh_token);
        set({ admin: res.data.admin, isAuthenticated: true, isLoading: false });
        return null;
      }
      set({ isLoading: false });
      return res.message || res.error || 'Login failed';
    } catch {
      set({ isLoading: false });
      return 'An unexpected error occurred';
    }
  },

  logout: () => {
    api.clearTokens();
    set({ admin: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const res = await api.get<AdminResponse>('/auth/me');
    if (res.success && res.data) {
      set({ admin: res.data });
    }
  },
}));