const API_TIMEOUT = 45000;

function getApiBaseUrl(): string {
  const buildUrl = process.env.NEXT_PUBLIC_API_URL;
  if (buildUrl) return buildUrl;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.onrender.com')) return `https://${host.replace('frontend', 'backend')}/api/v1`;
  }
  return 'http://localhost:8080/api/v1';
}
const API_BASE = getApiBaseUrl();

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

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      const data: ApiResponse<T> = text ? JSON.parse(text) : { success: res.ok };

      if (!res.ok && res.status === 401 && this.refreshToken) {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
        if (refreshRes.ok) {
          const refreshText = await refreshRes.text();
          const refreshData = refreshText ? JSON.parse(refreshText) : null;
          if (refreshData?.data) {
            this.setTokens(refreshData.data.access_token, refreshData.data.refresh_token);
            headers['Authorization'] = `Bearer ${this.token}`;
            const retry = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
            const retryText = await retry.text();
            return retryText ? JSON.parse(retryText) : { success: retry.ok };
          }
        }
        this.clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError') return { success: false, message: 'Request timed out. Backend may be unreachable.' };
      return { success: false, message: err?.message || 'Network error. Check that the backend is running.' };
    }
  }

  get = <T>(path: string) => this.request<T>('GET', path);
  post = <T>(path: string, body?: any) => this.request<T>('POST', path, body);
  put = <T>(path: string, body?: any) => this.request<T>('PUT', path, body);
  del = <T>(path: string) => this.request<T>('DELETE', path);
}

export const api = new ApiClient();
export type { ApiResponse };