/**
 * Kontrak Antarmuka (Interface) & Tipe Data Bersama untuk Repository.
 * Digunakan oleh implementasi Stub (In-Memory) dan Database PostgreSQL (Backend 1).
 */

export class DatabaseServiceUnavailableError extends Error {
  public readonly status = 503;
  public readonly code = 'SERVICE_UNAVAILABLE';

  constructor(message = 'Layanan database sedang tidak tersedia atau gagal dihubungi.') {
    super(message);
    this.name = 'DatabaseServiceUnavailableError';
  }
}

export class NotImplementedError extends Error {
  public readonly status = 501;
  public readonly code = 'NOT_IMPLEMENTED';

  constructor(message = 'Operasi ini tidak tersedia pada Backend 2.') {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export interface RoomData {
  id: string;
  name: string;
  subject?: string;
  class?: string;
  deadline?: string;
  aiEnabled: boolean;
  teacherId: string;
}

export interface MemberData {
  id: string;
  name: string;
}

export interface GroupData {
  id: string;
  roomId: string;
  name: string;
  members: MemberData[];
}

export interface TaskData {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: 'todo' | 'in_progress' | 'done';
  weight: number; // 1-100 persen
  deadline?: string;
  evidenceType?: 'google_docs' | 'slide' | 'handwritten_photo' | 'web_link';
  evidenceUrl?: string;
  evidenceStatus?: 'valid' | 'incomplete' | 'suspicious' | 'pending';
  evidenceFeedback?: string;
  createdAt: string;
  doneAt?: string;
}

export interface ActivityData {
  id: string;
  groupId: string;
  memberId: string;
  type: 'document' | 'comment' | 'log' | 'upload';
  description?: string;
  at: string;
}

export interface TeacherData {
  id: string;
  name: string;
  email?: string; // Opsional sesuai skema User terbaru
}

export interface AiMessage {
  id: string;
  groupId: string;
  senderType: 'member' | 'student' | 'ai';
  senderId?: string;
  senderName: string;
  action?: 'chat' | 'ideas' | 'split_roles' | 'check_completeness' | 'nudge' | 'deadline_nudge' | string;
  content: string;
  payload?: any; // Kolom Json payload di skema Backend 1
  structuredPayload?: any; // Kompatibilitas backwards service
  createdAt: string;
}

export interface AiSuggestion {
  id: string;
  groupId: string;
  type: 'role_split' | 'assignee';
  payload: any;
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface AiFlag {
  id: string;
  groupId: string;
  memberId?: string; // Opsional sesuai skema terbaru (misal untuk isu level tugas/kelompok)
  kind: 'ghosting' | 'low_contribution' | 'task_overdue' | string;
  detail: any;
  resolvedAt?: string;
  createdAt: string;
}

export interface AiContributionSnapshot {
  groupId: string;
  memberId: string;
  percentage: number;
  breakdown: {
    documents: number;
    comments: number;
    logs: number;
    tasksDone: number;
  };
  computedAt: string;
}

export interface PeerReport {
  id: string;
  roomId: string;
  groupId: string;
  reporterId: string; // ID siswa pelapor (DIJAGA PRIVASINYA)
  reportedMemberId: string;
  reportedMemberName: string;
  rating: number; // 1 - 5
  feedback: string;
  createdAt: string;
}

export interface IRepository {
  getRoom(roomId: string): Promise<RoomData | null>;
  getGroup(groupId: string): Promise<GroupData | null>;
  getTasks(groupId: string): Promise<TaskData[]>;
  getTaskById(taskId: string): Promise<TaskData | null>;
  updateTask(taskId: string, patch: Partial<TaskData>): Promise<TaskData | null>;
  createTasks(groupId: string, newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]): Promise<TaskData[]>;
  getActivity(groupId: string, since?: string): Promise<ActivityData[]>;
  getTeacherOfGroup(groupId: string): Promise<TeacherData | null>;
  getGroupsByRoom(roomId: string): Promise<GroupData[]>;
  savePeerReport(report: Omit<PeerReport, 'id' | 'createdAt'>): Promise<PeerReport>;
  getPeerReportsByRoom(roomId: string): Promise<PeerReport[]>;
  getPeerReportsByGroup(groupId: string): Promise<PeerReport[]>;
  saveAiMessage(msg: Omit<AiMessage, 'id' | 'createdAt'>): Promise<AiMessage>;
  getAiMessages(groupId: string, since?: string, limit?: number): Promise<AiMessage[]>;
  saveAiSuggestion(sug: Omit<AiSuggestion, 'id' | 'createdAt'>): Promise<AiSuggestion>;
  getAiSuggestion(id: string): Promise<AiSuggestion | null>;
  updateAiSuggestionStatus(id: string, status: 'pending' | 'applied' | 'dismissed'): Promise<AiSuggestion | null>;
  applySuggestionTasks(
    suggestionId: string,
    groupId: string,
    newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]
  ): Promise<TaskData[]>;
  saveAiFlag(flag: Omit<AiFlag, 'id' | 'createdAt'>): Promise<AiFlag>;
  getAiFlags(groupId?: string): Promise<AiFlag[]>;
  saveSnapshot(snapshot: AiContributionSnapshot): Promise<void>;
  getLatestSnapshots(groupId: string): Promise<AiContributionSnapshot[]>;
}
