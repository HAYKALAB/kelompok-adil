/**
 * In-Memory Stub Repository untuk data dari Backend 1.
 * Mengimplementasikan kontrak IRepository dan memilih instance berdasarkan REPO_MODE.
 */

export * from './repository.interface.js';
import {
  IRepository,
  RoomData,
  MemberData,
  GroupData,
  TaskData,
  ActivityData,
  TeacherData,
  AiMessage,
  AiSuggestion,
  AiFlag,
  AiContributionSnapshot,
  PeerReport,
} from './repository.interface.js';

export class DatabaseServiceUnavailableError extends Error {
  public readonly status = 503;
  public readonly code = 'SERVICE_UNAVAILABLE';

  constructor(message = 'Layanan database sedang tidak tersedia atau sedang dalam penyesuaian skema.') {
    super(message);
    this.name = 'DatabaseServiceUnavailableError';
  }
}

// In-Memory Database Store
export class RepositoryStub implements IRepository {
  private rooms: Map<string, RoomData> = new Map();
  private groups: Map<string, GroupData> = new Map();
  private tasks: Map<string, TaskData> = new Map();
  private activities: ActivityData[] = [];
  private teachers: Map<string, TeacherData> = new Map();
  private peerReports: PeerReport[] = [];

  // Tabel AI
  private aiMessages: AiMessage[] = [];
  private aiSuggestions: Map<string, AiSuggestion> = new Map();
  private aiFlags: AiFlag[] = [];
  private aiSnapshots: AiContributionSnapshot[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Teacher
    this.teachers.set('guru-1', {
      id: 'guru-1',
      name: 'Ibu Ratna, M.Pd.',
      email: 'ratna@sekolah.sch.id',
    });

    // Room 1: Majapahit (XI IPS 2)
    this.rooms.set('room-1', {
      id: 'room-1',
      name: 'Proyek Sejarah Majapahit',
      subject: 'Sejarah Nusantara',
      class: 'XI IPS 2',
      deadline: '2026-11-20T23:59:00+07:00',
      aiEnabled: true,
      teacherId: 'guru-1',
    });

    // Group 1 (Kelompok 1 Majapahit)
    this.groups.set('group-1', {
      id: 'group-1',
      roomId: 'room-1',
      name: 'Kelompok 1: Majapahit',
      members: [
        { id: 'm-dafano', name: 'Dafano' },
        { id: 'm-nadya', name: 'Nadya' },
        { id: 'm-bima', name: 'Bima' },
        { id: 'm-salsa', name: 'Salsa' },
      ],
    });

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

    // Group 1: Majapahit (Dafano 41%, Bima 24%, Salsa 22%, Nadya 13%)
    const g1Tasks: TaskData[] = [
      {
        id: 'task-1',
        groupId: 'group-1',
        title: 'Studi Pustaka Negarakretagama & Analisis Tokoh',
        description: 'Membaca kakawin pupuh 13-16 dan merangkum biografi Kertanegara',
        assigneeId: 'm-dafano',
        status: 'done',
        weight: 41,
        deadline: twoDaysAgo,
        evidenceType: 'google_docs',
        evidenceUrl: 'https://docs.google.com/document/d/1example-dafano',
        evidenceStatus: 'valid',
        evidenceFeedback: 'Analisis teks lengkap dan mencakup 3 sumber primer.',
        createdAt: twoDaysAgo,
        doneAt: oneDayAgo,
      },
      {
        id: 'task-2',
        groupId: 'group-1',
        title: 'Peta Wilayah Kekuasaan Maritim',
        description: 'Visualisasi jalur ekspedisi laut Majapahit',
        assigneeId: 'm-bima',
        status: 'in_progress',
        weight: 24,
        deadline: '2026-11-16T23:59:00+07:00',
        evidenceType: 'slide',
        createdAt: twoDaysAgo,
      },
      {
        id: 'task-3',
        groupId: 'group-1',
        title: 'Slide Presentasi Canva & Format Desain',
        description: 'Menata template slide dan keterbacaan materi presentasi',
        assigneeId: 'm-salsa',
        status: 'in_progress',
        weight: 22,
        deadline: '2026-11-18T23:59:00+07:00',
        evidenceType: 'slide',
        createdAt: twoDaysAgo,
      },
      {
        id: 'task-4',
        groupId: 'group-1',
        title: 'Sistematika Bab Latar Belakang & Kesimpulan',
        description: 'Menyusun narasi pengantar dan simpulan akhir',
        assigneeId: 'm-nadya',
        status: 'in_progress',
        weight: 13,
        deadline: '2026-11-19T23:59:00+07:00',
        evidenceType: 'google_docs',
        createdAt: twoDaysAgo,
      },
    ];

    g1Tasks.forEach((t) => this.tasks.set(t.id, t));

    // Room 2: Sriwijaya Bahari (XI IPA 2)
    this.rooms.set('room-2', {
      id: 'room-2',
      name: 'Turnamen Sejarah Maritim',
      subject: 'Sejarah Nusantara',
      class: 'XI IPA 2',
      deadline: '2026-11-15T23:59:00+07:00',
      aiEnabled: true,
      teacherId: 'guru-1',
    });

    // Group 2 (Kelompok 2: Sriwijaya Bahari - Kasus Ghosting Rafi Ahmad)
    this.groups.set('group-2', {
      id: 'group-2',
      roomId: 'room-2',
      name: 'Kelompok 2: Sriwijaya Bahari',
      members: [
        { id: 'm-intan', name: 'Intan Permata' },
        { id: 'm-fajar', name: 'Fajar Nugraha' },
        { id: 'm-dani', name: 'Dani Saputra' },
        { id: 'm-rafi', name: 'Rafi Ahmad' },
      ],
    });

    // Tasks Group 2 (Sriwijaya: Intan 42%, Fajar 38%, Dani 15%, Rafi 5%)
    const fourDaysAgo = new Date(now.getTime() - 80 * 3600 * 1000).toISOString();
    const g2Tasks: TaskData[] = [
      {
        id: 'task-sri-1',
        groupId: 'group-2',
        title: 'Riset Prasasti Kedukan Bukit & Talang Tuo',
        description: 'Transkripsi isi prasasti dan rute pelayaran dapunta hyang',
        assigneeId: 'm-intan',
        status: 'done',
        weight: 30,
        deadline: fourDaysAgo,
        evidenceType: 'google_docs',
        evidenceUrl: 'https://docs.google.com/document/d/sriwijaya-intan',
        evidenceStatus: 'valid',
        createdAt: fourDaysAgo,
        doneAt: twoDaysAgo,
      },
      {
        id: 'task-sri-2',
        groupId: 'group-2',
        title: 'Peta Jalur Niaga Selat Malaka & Selat Sunda',
        description: 'Peta grafis bandar perdagangan laut',
        assigneeId: 'm-fajar',
        status: 'done',
        weight: 25,
        deadline: fourDaysAgo,
        evidenceType: 'slide',
        evidenceUrl: 'https://canva.com/design/sriwijaya-fajar',
        evidenceStatus: 'valid',
        createdAt: fourDaysAgo,
        doneAt: oneDayAgo,
      },
      {
        id: 'task-sri-3',
        groupId: 'group-2',
        title: 'Hubungan Diplomasi Dinasti Tang & India',
        description: 'Catatan naskah I-Tsing tentang Sriwijaya',
        assigneeId: 'm-dani',
        status: 'in_progress',
        weight: 15,
        deadline: '2026-11-12T23:59:00+07:00',
        evidenceType: 'google_docs',
        createdAt: fourDaysAgo,
      },
      {
        id: 'task-sri-4',
        groupId: 'group-2',
        title: 'Rute Niaga Palembang & Komoditas Rempah',
        description: 'Kajian komoditas kapur barus dan timah',
        assigneeId: 'm-rafi',
        status: 'todo',
        weight: 20,
        deadline: twoDaysAgo,
        evidenceType: 'google_docs',
        createdAt: fourDaysAgo,
      },
    ];

    g2Tasks.forEach((t) => this.tasks.set(t.id, t));

    // Activities Group 2
    for (let i = 0; i < 2; i++) {
      this.activities.push({ id: `act-intan-doc-${i}`, groupId: 'group-2', memberId: 'm-intan', type: 'document', at: oneDayAgo });
    }
    for (let i = 0; i < 4; i++) {
      this.activities.push({ id: `act-intan-com-${i}`, groupId: 'group-2', memberId: 'm-intan', type: 'comment', at: oneDayAgo });
    }

    for (let i = 0; i < 2; i++) {
      this.activities.push({ id: `act-fajar-doc-${i}`, groupId: 'group-2', memberId: 'm-fajar', type: 'document', at: oneDayAgo });
    }
    for (let i = 0; i < 6; i++) {
      this.activities.push({ id: `act-fajar-com-${i}`, groupId: 'group-2', memberId: 'm-fajar', type: 'comment', at: oneDayAgo });
    }

    for (let i = 0; i < 2; i++) {
      this.activities.push({ id: `act-dani-doc-${i}`, groupId: 'group-2', memberId: 'm-dani', type: 'document', at: twoDaysAgo });
    }
    this.activities.push({ id: 'act-dani-log', groupId: 'group-2', memberId: 'm-dani', type: 'log', at: twoDaysAgo });
    for (let i = 0; i < 6; i++) {
      this.activities.push({ id: `act-dani-com-${i}`, groupId: 'group-2', memberId: 'm-dani', type: 'comment', at: twoDaysAgo });
    }

    this.activities.push({
      id: 'act-rafi-1',
      groupId: 'group-2',
      memberId: 'm-rafi',
      type: 'log',
      description: 'Membaca pengantar modul',
      at: fourDaysAgo,
    });
    for (let i = 0; i < 6; i++) {
      this.activities.push({ id: `act-rafi-com-${i}`, groupId: 'group-2', memberId: 'm-rafi', type: 'comment', at: fourDaysAgo });
    }

    // Seed Peer Reports (Laporan Rahasia Masuk untuk Room 2)
    this.peerReports.push({
      id: 'rep-sri-1',
      roomId: 'room-2',
      groupId: 'group-2',
      reporterId: 'm-intan',
      reportedMemberId: 'm-rafi',
      reportedMemberName: 'Rafi Ahmad',
      rating: 1,
      feedback: 'Tidak merespon chat kelompok & belum mengerjakan bab bagiannya sejak Selasa. Kami kesulitan menyusun kesimpulan materi.',
      createdAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    });
    this.peerReports.push({
      id: 'rep-sri-2',
      roomId: 'room-2',
      groupId: 'group-2',
      reporterId: 'm-fajar',
      reportedMemberId: 'm-rafi',
      reportedMemberName: 'Rafi Ahmad',
      rating: 2,
      feedback: 'Belum ada bukti dokumen atau catatan riset yang diunggah ke tugasnya.',
      createdAt: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
    });
  }

  // --- API Method Contracts ---

  public async getRoom(roomId: string): Promise<RoomData | null> {
    return this.rooms.get(roomId) || null;
  }

  public async getGroup(groupId: string): Promise<GroupData | null> {
    return this.groups.get(groupId) || null;
  }

  public async getTasks(groupId: string): Promise<TaskData[]> {
    return Array.from(this.tasks.values()).filter((t) => t.groupId === groupId);
  }

  public async getTaskById(taskId: string): Promise<TaskData | null> {
    return this.tasks.get(taskId) || null;
  }

  public async updateTask(taskId: string, patch: Partial<TaskData>): Promise<TaskData | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    const updated = { ...task, ...patch };
    this.tasks.set(taskId, updated);
    return updated;
  }

  public async createTasks(groupId: string, newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]): Promise<TaskData[]> {
    const createdList: TaskData[] = [];
    const now = new Date().toISOString();

    for (const item of newTasks) {
      const id = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const task: TaskData = {
        ...item,
        id,
        groupId,
        status: item.status || 'todo',
        createdAt: now,
      };
      this.tasks.set(id, task);
      createdList.push(task);
    }

    return createdList;
  }

  public async getActivity(groupId: string, since?: string): Promise<ActivityData[]> {
    return this.activities.filter((act) => {
      if (act.groupId !== groupId) return false;
      if (since && new Date(act.at).getTime() < new Date(since).getTime()) return false;
      return true;
    });
  }

  public async getTeacherOfGroup(groupId: string): Promise<TeacherData | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;
    const room = this.rooms.get(group.roomId);
    if (!room) return null;
    return this.teachers.get(room.teacherId) || null;
  }

  public async getGroupsByRoom(roomId: string): Promise<GroupData[]> {
    return Array.from(this.groups.values()).filter((g) => g.roomId === roomId);
  }

  // --- Peer Reports Methods ---

  public async savePeerReport(report: Omit<PeerReport, 'id' | 'createdAt'>): Promise<PeerReport> {
    const saved: PeerReport = {
      ...report,
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.peerReports.push(saved);
    return saved;
  }

  public async getPeerReportsByRoom(roomId: string): Promise<PeerReport[]> {
    return this.peerReports.filter((r) => r.roomId === roomId);
  }

  public async getPeerReportsByGroup(groupId: string): Promise<PeerReport[]> {
    return this.peerReports.filter((r) => r.groupId === groupId);
  }

  // --- AI Storage Methods ---

  public async saveAiMessage(msg: Omit<AiMessage, 'id' | 'createdAt'>): Promise<AiMessage> {
    const saved: AiMessage = {
      ...msg,
      id: `ai-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      payload: msg.payload || msg.structuredPayload,
      structuredPayload: msg.structuredPayload || msg.payload,
      createdAt: new Date().toISOString(),
    };
    this.aiMessages.push(saved);
    return saved;
  }

  public async getAiMessages(groupId: string, since?: string, limit: number = 30): Promise<AiMessage[]> {
    let filtered = this.aiMessages.filter((m) => m.groupId === groupId);
    if (since) {
      const sinceTime = new Date(since).getTime();
      filtered = filtered.filter((m) => new Date(m.createdAt).getTime() > sinceTime);
    }
    return filtered.slice(-limit);
  }

  public async saveAiSuggestion(sug: Omit<AiSuggestion, 'id' | 'createdAt'>): Promise<AiSuggestion> {
    const saved: AiSuggestion = {
      ...sug,
      id: `sug-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.aiSuggestions.set(saved.id, saved);
    return saved;
  }

  public async getAiSuggestion(id: string): Promise<AiSuggestion | null> {
    return this.aiSuggestions.get(id) || null;
  }

  public async updateAiSuggestionStatus(id: string, status: 'pending' | 'applied' | 'dismissed'): Promise<AiSuggestion | null> {
    const sug = this.aiSuggestions.get(id);
    if (!sug) return null;
    sug.status = status;
    return sug;
  }

  public async saveAiFlag(flag: Omit<AiFlag, 'id' | 'createdAt'>): Promise<AiFlag> {
    const saved: AiFlag = {
      ...flag,
      id: `flag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.aiFlags.push(saved);
    return saved;
  }

  public async getAiFlags(groupId?: string): Promise<AiFlag[]> {
    if (!groupId) return this.aiFlags;
    return this.aiFlags.filter((f) => f.groupId === groupId);
  }

  public async saveSnapshot(snapshot: AiContributionSnapshot): Promise<void> {
    this.aiSnapshots.push(snapshot);
  }

  public async getLatestSnapshots(groupId: string): Promise<AiContributionSnapshot[]> {
    return this.aiSnapshots.filter((s) => s.groupId === groupId);
  }
}

// Instance singleton stub
const stubInstance = new RepositoryStub();

/**
 * Factory untuk memilih implementasi repository berdasarkan variabel environment REPO_MODE.
 * Default: 'stub'.
 * Jika 'db' aktif sebelum repository.db.ts terpasang, mengembalikan adapter 503 yang aman tanpa membocorkan kredensial koneksi.
 */
function createRepository(): IRepository {
  return new Proxy(stubInstance as unknown as IRepository, {
    get(target, prop, receiver) {
      const mode = (process.env.REPO_MODE || 'stub').toLowerCase().trim();
      if (mode === 'db') {
        return async () => {
          throw new DatabaseServiceUnavailableError(
            'Layanan database Backend 1 sedang dalam sinkronisasi skema. Gunakan REPO_MODE=stub sementara waktu.'
          );
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export const repo: IRepository = createRepository();
