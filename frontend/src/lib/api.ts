export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface UserSession {
  token: string;
  role: 'STUDENT' | 'TEACHER';
  participant: {
    id: string;
    roomId: string;
    name: string;
    role: 'STUDENT' | 'TEACHER';
    groupId?: string | null;
  };
  pin?: string;
  isCreator?: boolean;
  teacherCode?: string;
}

const SESSION_KEY = 'kelompok_adil_session';

export function saveSession(session: UserSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Gagal menyimpan sesi ke localStorage', err);
  }
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch (err) {
    console.error('Gagal membaca sesi dari localStorage', err);
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Gagal menghapus sesi dari localStorage', err);
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const AI_BASE = (import.meta.env.VITE_AI_URL || '').replace(/\/+$/, '');

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  onSlow?: (isSlow: boolean) => void;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isAi = path.startsWith('/api/ai');
  const base = isAi ? AI_BASE : API_BASE;
  const url = `${base}${path}`;

  const session = getSession();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const timeoutMs = options.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let slowTimer: ReturnType<typeof setTimeout> | null = null;
  if (options.onSlow) {
    slowTimer = setTimeout(() => {
      options.onSlow?.(true);
    }, 2500);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (slowTimer) clearTimeout(slowTimer);
    options.onSlow?.(false);

    if (response.status === 401) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      throw new Error('Sesi telah berakhir atau tidak sah. Silakan masuk kembali.');
    }

    let payload: any = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }

    if (!response.ok) {
      const err = payload?.error;
      const message =
        err?.message ||
        payload?.message ||
        (response.status === 404
          ? 'Data tidak ditemukan.'
          : response.status === 403
          ? 'Akses ditolak.'
          : response.status === 429
          ? 'Terlalu banyak permintaan. Mohon tunggu sebentar.'
          : response.status === 503
          ? 'Layanan sedang menyiapkan koneksi database atau AI. Coba lagi beberapa saat lagi.'
          : 'Terjadi kesalahan pada server.');
      const customErr: any = new Error(message);
      customErr.code = err?.code || `HTTP_${response.status}`;
      customErr.status = response.status;
      throw customErr;
    }

    return (payload?.data !== undefined ? payload.data : payload) as T;
  } catch (err: any) {
    if (slowTimer) clearTimeout(slowTimer);
    options.onSlow?.(false);
    if (err.name === 'AbortError') {
      throw new Error('Permintaan memakan waktu terlalu lama (timeout). Silakan periksa koneksi Anda.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// --- Health ---
export interface HealthResponse {
  status: string;
  db: 'connected' | 'error' | string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

// --- Auth & Rooms ---
export interface JoinStudentResponse {
  participant: {
    id: string;
    roomId: string;
    name: string;
    role: 'STUDENT';
    groupId?: string | null;
  };
  token: string;
}

export interface TeacherLoginResponse {
  participant: {
    id: string;
    roomId: string;
    name: string;
    role: 'TEACHER';
    groupId?: string | null;
  };
  token: string;
}

export interface CreateRoomResponse {
  room: {
    id: string;
    pin: string;
    title: string;
    subject?: string;
    className?: string;
    targetGroups: number;
    status: string;
    deadline?: string;
  };
  teacherCode: string;
  pin: string;
  isNewTeacherCode: boolean;
}

export async function joinAsStudent(pin: string, name: string): Promise<JoinStudentResponse> {
  return apiFetch<JoinStudentResponse>(`/api/rooms/${encodeURIComponent(pin)}/join`, {
    method: 'POST',
    body: { name },
  });
}

export async function loginAsTeacher(pin: string, name: string, code: string): Promise<TeacherLoginResponse> {
  return apiFetch<TeacherLoginResponse>(`/api/rooms/${encodeURIComponent(pin)}/teacher-login`, {
    method: 'POST',
    body: { name, code },
  });
}

export async function createRoom(payload: {
  title: string;
  subject?: string;
  className?: string;
  targetGroups?: number;
}): Promise<CreateRoomResponse> {
  return apiFetch<CreateRoomResponse>('/api/rooms', {
    method: 'POST',
    body: payload,
  });
}

export async function registerTeacher(name: string): Promise<{ user: any; token: string }> {
  return apiFetch<{ user: any; token: string }>('/api/teachers/register', {
    method: 'POST',
    body: { name },
  });
}
