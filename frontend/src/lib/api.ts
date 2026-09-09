const API_BASE = '/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    throw new Error('غير مصرح');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'خطأ في الخادم' }));
    throw new Error(err.detail || 'خطأ في الخادم');
  }
  if (res.status === 204) return {} as T;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return res.json();
  return res as unknown as T;
}

export async function login(username: string, password: string) {
  const data = await api<{ access_token: string; refresh_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  return data;
}

export async function getMe() {
  return api<{ username: string; full_name: string; permissions: string[]; roles: string[] }>('/auth/me');
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}
