const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: { page: number; limit: number; total: number; total_pages: number; has_next: boolean; has_prev: boolean };
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(access: string, refresh: string) {
    this.token = access;
    this.refreshToken = refresh;
    localStorage.setItem('token', access);
    localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  get isAuthenticated() {
    return !!this.token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await res.json();

    if (!res.ok && res.status === 401 && this.refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        this.setTokens(refreshData.data.access_token, refreshData.data.refresh_token);
        headers['Authorization'] = `Bearer ${this.token}`;
        const retry = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
        return retry.json();
      }
      this.clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return data;
  }

  get = <T>(path: string) => this.request<T>('GET', path);
  post = <T>(path: string, body?: any) => this.request<T>('POST', path, body);
  put = <T>(path: string, body?: any) => this.request<T>('PUT', path, body);
  del = <T>(path: string) => this.request<T>('DELETE', path);
}

export const api = new ApiClient();
export type { ApiResponse };