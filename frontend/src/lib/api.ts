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

  const timeoutMs = options.timeoutMs ?? 35000;
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
          ? 'Terlalu banyak permintaan ke layanan AI/Server. Mohon tunggu beberapa detik.'
          : response.status === 503
          ? 'Layanan sedang menyiapkan koneksi database atau AI (cold start). Silakan coba lagi sebentar lagi.'
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

// --- Detail Room (GET /api/rooms/:pin) ---
export interface RoomDetailStudent {
  room: {
    id: string;
    title: string;
    subject?: string;
    className?: string;
    deadline?: string;
    status: string;
  };
  participantCount: number;
  groups: Array<{
    id: string;
    groupNumber: number;
    name: string;
    members: Array<{ id: string; name: string }>;
  }>;
  me: {
    id: string;
    name: string;
    groupId?: string | null;
  };
}

export interface RoomDetailTeacher {
  room: {
    id: string;
    pin: string;
    title: string;
    subject?: string;
    className?: string;
    aiEnabled: boolean;
    deadline?: string;
    status: string;
  };
  participants: Array<{
    id: string;
    name: string;
    role: string;
    groupId?: string | null;
  }>;
  groups: Array<{
    id: string;
    groupNumber: number;
    name: string;
    members: Array<{ id: string; name: string }>;
  }>;
}

export async function getRoomDetail(pin: string): Promise<RoomDetailStudent | RoomDetailTeacher> {
  return apiFetch<RoomDetailStudent | RoomDetailTeacher>(`/api/rooms/${encodeURIComponent(pin)}`);
}

// --- Group Tasks (Tahap 1 & Tahap 3 Backend) ---
export interface GroupTask {
  id: string;
  groupId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  weight: number;
  progress: number;
  deadline?: string | null;
  createdAt: string;
  doneAt?: string | null;
}

export async function fetchGroupTasks(groupId: string): Promise<GroupTask[]> {
  return apiFetch<GroupTask[]>(`/api/groups/${encodeURIComponent(groupId)}/tasks`);
}

export async function createGroupTask(
  groupId: string,
  payload: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    weight?: number;
    deadline?: string | null;
  }
): Promise<GroupTask> {
  return apiFetch<GroupTask>(`/api/groups/${encodeURIComponent(groupId)}/tasks`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateGroupTaskDetail(
  taskId: string,
  payload: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    weight?: number;
    deadline?: string | null;
  }
): Promise<GroupTask> {
  return apiFetch<GroupTask>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateGroupTaskProgress(
  taskId: string,
  progress: number,
  note?: string
): Promise<GroupTask> {
  return apiFetch<GroupTask>(`/api/tasks/${encodeURIComponent(taskId)}/progress`, {
    method: 'PATCH',
    body: { progress, note },
  });
}

// --- Peer Reports ---
export async function submitPeerReport(
  groupId: string,
  payload: {
    reportedId: string;
    rating: number;
    feedback: string;
  }
): Promise<{ saved: boolean }> {
  return apiFetch<{ saved: boolean }>(`/api/groups/${encodeURIComponent(groupId)}/reports`, {
    method: 'POST',
    body: payload,
  });
}

export interface TeacherPeerReport {
  id: string;
  roomId: string;
  groupId: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export async function fetchRoomPeerReports(roomId: string): Promise<TeacherPeerReport[]> {
  return apiFetch<TeacherPeerReport[]>(`/api/rooms/${encodeURIComponent(roomId)}/reports`);
}

// --- Student Chat Messages (Backend 1) ---
export interface GroupMessage {
  id: string;
  groupId: string;
  senderName: string;
  content: string;
  isAi: boolean;
  createdAt: string;
  action?: string | null;
  payload?: any;
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  return apiFetch<GroupMessage[]>(`/api/groups/${encodeURIComponent(groupId)}/messages`);
}

export async function sendGroupMessage(groupId: string, content: string): Promise<GroupMessage> {
  return apiFetch<GroupMessage>(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    body: { content },
  });
}

// --- Progress Monitor Guru (Backend 1) ---
export interface RoomProgressData {
  roomId: string;
  groups: Array<{
    groupId: string;
    name: string;
    progressPercent: number;
    statusCounts: { todo: number; inProgress: number; done: number };
    nearestDeadline?: string | null;
    members: Array<{
      participantId: string;
      name: string;
      taskCount: number;
      progressPercent: number | null;
    }>;
  }>;
}

export async function fetchRoomProgress(roomId: string): Promise<RoomProgressData> {
  return apiFetch<RoomProgressData>(`/api/rooms/${encodeURIComponent(roomId)}/progress`);
}

// --- AI Engine (Backend 2) ---
export interface AiChatResponse {
  reply: string;
  source?: 'gemini' | 'fallback';
}

export async function chatWithAi(groupId: string, message: string): Promise<AiChatResponse> {
  return apiFetch<AiChatResponse>(`/api/ai/groups/${encodeURIComponent(groupId)}/chat`, {
    method: 'POST',
    body: { message },
  });
}

export interface RoleSplitSuggestion {
  id: string;
  groupId: string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  suggestedAt: string;
  source?: string;
  roles: Array<{
    title: string;
    description: string;
    targetPercent: number;
    deliverableFormat: string;
    suggestedMemberName: string;
    assigneeId?: string | null;
  }>;
}

export async function requestRoleSplit(groupId: string): Promise<RoleSplitSuggestion> {
  return apiFetch<RoleSplitSuggestion>(`/api/ai/groups/${encodeURIComponent(groupId)}/split-roles`, {
    method: 'POST',
  });
}

export async function applySuggestion(suggestionId: string): Promise<{ applied: boolean }> {
  return apiFetch<{ applied: boolean }>(`/api/ai/suggestions/${encodeURIComponent(suggestionId)}/apply`, {
    method: 'POST',
  });
}

export async function dismissSuggestion(suggestionId: string): Promise<{ dismissed: boolean }> {
  return apiFetch<{ dismissed: boolean }>(`/api/ai/suggestions/${encodeURIComponent(suggestionId)}/dismiss`, {
    method: 'POST',
  });
}

export interface TeacherAiSummary {
  summary: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  nearestDeadline: string | null;
  highlights: string[];
  generatedAt: string;
  source?: 'ai' | 'fallback';
}

export async function fetchTeacherSummary(groupId: string): Promise<TeacherAiSummary> {
  return apiFetch<TeacherAiSummary>(`/api/ai/groups/${encodeURIComponent(groupId)}/teacher-summary`);
}

export interface GhostingAlertItem {
  groupId: string;
  groupName: string;
  taskId: string;
  taskTitle: string;
  assigneeId?: string;
  assigneeName?: string;
  deadline: string;
  hoursOverdue: number;
  status: string;
  message: string;
}

export async function fetchRoomAlerts(roomId: string): Promise<{ alerts: GhostingAlertItem[] }> {
  return apiFetch<{ alerts: GhostingAlertItem[] }>(`/api/ai/rooms/${encodeURIComponent(roomId)}/alerts`);
}

export interface FairnessAnalysisResult {
  fairnessScore: number;
  summary: string;
  alerts: string[];
  teacherAdvice: string;
  totalReports: number;
  generatedAt: string;
  source: 'ai' | 'fallback';
}

export async function analyzeRoomFairness(roomId: string): Promise<FairnessAnalysisResult> {
  return apiFetch<FairnessAnalysisResult>(`/api/ai/rooms/${encodeURIComponent(roomId)}/analyze-fairness`, {
    method: 'POST',
  });
}

export async function splitRoomGroupsAuto(pin: string, count?: number): Promise<any> {
  return apiFetch<any>(`/api/rooms/${encodeURIComponent(pin)}/groups/split${count ? `?count=${count}` : ''}`, {
    method: 'POST',
  });
}
