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
    const detail = err.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
        : 'خطأ في الخادم';
    throw new Error(message || 'خطأ في الخادم');
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
  return api<{ username: string; full_name: string; permissions: string[]; roles: string[]; is_superuser: boolean; must_change_password?: boolean }>('/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return api<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.blob();
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'خطأ في الخادم' }));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'خطأ في الرفع');
  }
  return res.json();
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('فشل التحميل');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openPrintPage(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('فشل فتح صفحة الطباعة');
  const html = await res.text();
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
