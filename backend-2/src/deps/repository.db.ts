import crypto from 'crypto';
import pg from 'pg';
import {
  ActivityData,
  AiContributionSnapshot,
  AiFlag,
  AiMessage,
  AiSuggestion,
  DatabaseServiceUnavailableError,
  GroupData,
  IRepository,
  MemberData,
  NotImplementedError,
  PeerReport,
  RoomData,
  TaskData,
  TeacherData,
} from './repository.interface.js';

const { Pool } = pg;

export interface QueryResultLike<T = any> {
  rows: T[];
  rowCount?: number | null;
}

export interface PoolClientLike {
  query(text: string, values?: unknown[]): Promise<QueryResultLike<any>>;
  release(): void;
}

export interface QueryablePool {
  query(text: string, values?: unknown[]): Promise<QueryResultLike<any>>;
  connect(): Promise<PoolClientLike>;
  on?(event: string, listener: (...args: any[]) => void): void;
}

// --- Sanitasi Error & Konversi Tanggal Terpusat ---

/**
 * Menghapus string koneksi, hostname, kredensial, dan password dari pesan error/log.
 */
export function sanitizeDbErrorMessage(err: unknown): string {
  let raw = err instanceof Error ? err.message : String(err);

  const envUrl = process.env.BACKEND2_DATABASE_URL?.trim();
  if (envUrl) {
    raw = raw.split(envUrl).join('[REDACTED_DB_URL]');
  }

  return raw
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@[^\s/]+(?:\/[^\s?#]*)?/gi, 'postgres://[REDACTED]')
    .replace(/(password|pwd|secret|token)\s*=\s*[^\s;&]+/gi, '$1=[REDACTED]');
}

/**
 * Konversi kolom tanggal PostgreSQL (Date) atau string ke ISO 8601 string di satu tempat.
 */
export function toIsoString(val: Date | string | null | undefined): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const date = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toIsoStringRequired(val: Date | string | null | undefined): string {
  return toIsoString(val) ?? new Date().toISOString();
}

function isLocalDatabaseHost(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  }
}

function isConnectionOrPoolError(err: any): boolean {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code)
  ) {
    return true;
  }
  // SQLSTATE kelas 08 (Connection Exception), 28 (Invalid Auth), 53 (Insufficient Resources), 57 (Operator Intervention)
  if (/^(08|28|53|57)/.test(code)) {
    return true;
  }
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('connect') ||
    msg.includes('connection terminated') ||
    msg.includes('ssl') ||
    msg.includes('certificate') ||
    msg.includes('password authentication')
  );
}

// --- Mapping Enum Dua Arah (DB Huruf Besar <-> Service Huruf Kecil) ---

const TASK_STATUS_TO_APP: Record<string, TaskData['status']> = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};
const TASK_STATUS_TO_DB: Record<TaskData['status'], string> = {
  todo: 'TODO',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
};

const EVIDENCE_TYPE_TO_APP: Record<string, NonNullable<TaskData['evidenceType']>> = {
  GOOGLE_DOCS: 'google_docs',
  SLIDE: 'slide',
  HANDWRITTEN_PHOTO: 'handwritten_photo',
  WEB_LINK: 'web_link',
};
const EVIDENCE_TYPE_TO_DB: Record<NonNullable<TaskData['evidenceType']>, string> = {
  google_docs: 'GOOGLE_DOCS',
  slide: 'SLIDE',
  handwritten_photo: 'HANDWRITTEN_PHOTO',
  web_link: 'WEB_LINK',
};

const EVIDENCE_STATUS_TO_APP: Record<string, NonNullable<TaskData['evidenceStatus']>> = {
  VALID: 'valid',
  INCOMPLETE: 'incomplete',
  SUSPICIOUS: 'suspicious',
  PENDING: 'pending',
};
const EVIDENCE_STATUS_TO_DB: Record<NonNullable<TaskData['evidenceStatus']>, string> = {
  valid: 'VALID',
  incomplete: 'INCOMPLETE',
  suspicious: 'SUSPICIOUS',
  pending: 'PENDING',
};

const ACTIVITY_TYPE_TO_APP: Record<string, ActivityData['type']> = {
  DOCUMENT: 'document',
  COMMENT: 'comment',
  LOG: 'log',
  UPLOAD: 'upload',
};

const SUGGESTION_TYPE_TO_APP: Record<string, AiSuggestion['type']> = {
  ROLE_SPLIT: 'role_split',
  ASSIGNEE: 'assignee',
};
const SUGGESTION_TYPE_TO_DB: Record<AiSuggestion['type'], string> = {
  role_split: 'ROLE_SPLIT',
  assignee: 'ASSIGNEE',
};

const SUGGESTION_STATUS_TO_APP: Record<string, AiSuggestion['status']> = {
  PENDING: 'pending',
  APPLIED: 'applied',
  DISMISSED: 'dismissed',
};
const SUGGESTION_STATUS_TO_DB: Record<AiSuggestion['status'], string> = {
  pending: 'PENDING',
  applied: 'APPLIED',
  dismissed: 'DISMISSED',
};

const FLAG_KIND_TO_APP: Record<string, AiFlag['kind']> = {
  GHOSTING: 'ghosting',
  LOW_CONTRIBUTION: 'low_contribution',
  TASK_OVERDUE: 'task_overdue',
};
const FLAG_KIND_TO_DB: Record<string, string> = {
  ghosting: 'GHOSTING',
  low_contribution: 'LOW_CONTRIBUTION',
  task_overdue: 'TASK_OVERDUE',
};

export const DbEnumMapper = {
  taskStatusToApp: (val?: string | null): TaskData['status'] =>
    TASK_STATUS_TO_APP[(val || '').toUpperCase()] ?? 'todo',
  taskStatusToDb: (val?: TaskData['status'] | string | null): string =>
    TASK_STATUS_TO_DB[(val as TaskData['status']) || 'todo'] ?? 'TODO',

  evidenceTypeToApp: (val?: string | null): TaskData['evidenceType'] | undefined =>
    val ? EVIDENCE_TYPE_TO_APP[val.toUpperCase()] : undefined,
  evidenceTypeToDb: (val?: TaskData['evidenceType'] | string | null): string | null =>
    val ? EVIDENCE_TYPE_TO_DB[val as NonNullable<TaskData['evidenceType']>] ?? null : null,

  evidenceStatusToApp: (val?: string | null): TaskData['evidenceStatus'] | undefined =>
    val ? EVIDENCE_STATUS_TO_APP[val.toUpperCase()] : undefined,
  evidenceStatusToDb: (val?: TaskData['evidenceStatus'] | string | null): string | null =>
    val ? EVIDENCE_STATUS_TO_DB[val as NonNullable<TaskData['evidenceStatus']>] ?? null : null,

  activityTypeToApp: (val?: string | null): ActivityData['type'] =>
    ACTIVITY_TYPE_TO_APP[(val || '').toUpperCase()] ?? 'log',

  suggestionTypeToApp: (val?: string | null): AiSuggestion['type'] =>
    SUGGESTION_TYPE_TO_APP[(val || '').toUpperCase()] ?? 'role_split',
  suggestionTypeToDb: (val?: AiSuggestion['type'] | string | null): string =>
    SUGGESTION_TYPE_TO_DB[(val as AiSuggestion['type']) || 'role_split'] ?? 'ROLE_SPLIT',

  suggestionStatusToApp: (val?: string | null): AiSuggestion['status'] =>
    SUGGESTION_STATUS_TO_APP[(val || '').toUpperCase()] ?? 'pending',
  suggestionStatusToDb: (val?: AiSuggestion['status'] | string | null): string =>
    SUGGESTION_STATUS_TO_DB[(val as AiSuggestion['status']) || 'pending'] ?? 'PENDING',

  flagKindToApp: (val?: string | null): AiFlag['kind'] =>
    FLAG_KIND_TO_APP[(val || '').toUpperCase()] ?? 'ghosting',
  flagKindToDb: (val?: string | null): string =>
    FLAG_KIND_TO_DB[(val || '').toLowerCase()] ?? 'GHOSTING',
};

// --- Helper Mapping Baris SQL -> Objek Kontrak ---

function mapTaskRow(row: any): TaskData {
  return {
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    description: row.description ?? undefined,
    assigneeId: row.assigneeId ?? undefined,
    status: DbEnumMapper.taskStatusToApp(row.status),
    weight: Number(row.weight ?? 1),
    deadline: toIsoString(row.deadline),
    evidenceType: DbEnumMapper.evidenceTypeToApp(row.evidenceType),
    evidenceUrl: row.evidenceUrl ?? undefined,
    evidenceStatus: DbEnumMapper.evidenceStatusToApp(row.evidenceStatus),
    evidenceFeedback: row.evidenceFeedback ?? undefined,
    createdAt: toIsoStringRequired(row.createdAt),
    doneAt: toIsoString(row.doneAt),
  };
}

function mapGroupMessageRow(row: any): AiMessage {
  const payloadValue = row.payload ?? undefined;
  return {
    id: row.id,
    groupId: row.groupId,
    senderType: row.isAi ? 'ai' : 'student',
    senderId: undefined, // Kolom senderId tidak tersedia di schema group_messages
    senderName: row.senderName,
    action: row.action ?? undefined,
    content: row.content,
    payload: payloadValue,
    structuredPayload: payloadValue,
    createdAt: toIsoStringRequired(row.createdAt),
  };
}

function mapSuggestionRow(row: any): AiSuggestion {
  return {
    id: row.id,
    groupId: row.groupId,
    type: DbEnumMapper.suggestionTypeToApp(row.type),
    payload: row.payload,
    status: DbEnumMapper.suggestionStatusToApp(row.status),
    createdAt: toIsoStringRequired(row.createdAt),
  };
}

function mapFlagRow(row: any): AiFlag {
  return {
    id: row.id,
    groupId: row.groupId,
    memberId: row.memberId ?? undefined,
    kind: DbEnumMapper.flagKindToApp(row.kind),
    detail: row.detail,
    resolvedAt: toIsoString(row.resolvedAt),
    createdAt: toIsoStringRequired(row.createdAt),
  };
}

function mapPeerReportRow(row: any): PeerReport {
  return {
    id: row.id,
    roomId: row.roomId,
    groupId: row.groupId,
    reporterId: row.reporterId,
    reportedMemberId: row.reportedMemberId,
    reportedMemberName: row.reportedMemberName || 'Anggota',
    rating: Number(row.rating),
    feedback: row.feedback,
    createdAt: toIsoStringRequired(row.createdAt),
  };
}

/**
 * Implementasi IRepository berbasis PostgreSQL (pg.Pool) untuk skema Backend 1.
 * Menggunakan role database backend2 (SELECT semua tabel; INSERT/UPDATE hanya tasks, ai_suggestions, ai_flags, group_messages).
 */
export class RepositoryDb implements IRepository {
  private pool: QueryablePool | null = null;
  private poolConnectionString: string | null = null;
  private snapshotsCache: Map<string, AiContributionSnapshot[]> = new Map();

  constructor(poolOverride?: QueryablePool) {
    if (poolOverride) {
      this.pool = poolOverride;
    }
  }

  /**
   * Khusus environment test: menyuntikkan mock pg.Pool untuk pengujian mode db offline.
   */
  public setPoolOverrideForTest(pool: QueryablePool | null): void {
    if (process.env.NODE_ENV !== 'test') return;
    this.pool = pool;
    this.poolConnectionString = null;
  }

  private getPool(): QueryablePool {
    if (this.pool) {
      return this.pool;
    }

    const connectionString = process.env.BACKEND2_DATABASE_URL?.trim();
    if (!connectionString) {
      throw new DatabaseServiceUnavailableError(
        'Konfigurasi BACKEND2_DATABASE_URL belum diatur untuk mode database.'
      );
    }

    if (!this.pool || this.poolConnectionString !== connectionString) {
      const isLocal = isLocalDatabaseHost(connectionString);
      const createdPool = new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: isLocal ? false : true,
      });

      createdPool.on('error', (err) => {
        console.error('⚠️ PostgreSQL idle pool error:', sanitizeDbErrorMessage(err));
      });

      this.pool = createdPool;
      this.poolConnectionString = connectionString;
    }

    return this.pool;
  }

  private handleDbError(err: unknown): never {
    if (err instanceof DatabaseServiceUnavailableError || err instanceof NotImplementedError) {
      throw err;
    }

    const sanitized = sanitizeDbErrorMessage(err);
    if (isConnectionOrPoolError(err)) {
      console.error('❌ Kegagalan koneksi PostgreSQL:', sanitized);
      throw new DatabaseServiceUnavailableError('Layanan database sedang tidak tersedia atau gagal dihubungi.');
    }

    console.error('❌ Kesalahan query PostgreSQL:', sanitized);
    throw new Error(sanitized);
  }

  private async query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResultLike<T>> {
    try {
      const pool = this.getPool();
      return (await pool.query(sql, params)) as QueryResultLike<T>;
    } catch (err) {
      this.handleDbError(err);
    }
  }

  private async withTransaction<T>(fn: (client: PoolClientLike) => Promise<T>): Promise<T> {
    let client: PoolClientLike;
    try {
      const pool = this.getPool();
      client = await pool.connect();
    } catch (err) {
      this.handleDbError(err);
    }

    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('⚠️ Gagal melakukan ROLLBACK transaksi:', sanitizeDbErrorMessage(rollbackErr));
      }
      this.handleDbError(err);
    } finally {
      client.release();
    }
  }

  // --- Room, Group & Task Queries (READ / WRITE tasks) ---

  public async getRoom(roomId: string): Promise<RoomData | null> {
    const res = await this.query(
      `SELECT "id", "title", "subject", "className", "deadline", "aiEnabled", "teacherId"
       FROM "rooms"
       WHERE "id" = $1
       LIMIT 1`,
      [roomId]
    );
    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.title,
      subject: row.subject ?? undefined,
      class: row.className ?? undefined,
      deadline: toIsoString(row.deadline),
      aiEnabled: Boolean(row.aiEnabled),
      teacherId: row.teacherId,
    };
  }

  public async getGroup(groupId: string): Promise<GroupData | null> {
    const groupRes = await this.query(
      `SELECT "id", "roomId", "name"
       FROM "groups"
       WHERE "id" = $1
       LIMIT 1`,
      [groupId]
    );
    const row = groupRes.rows[0];
    if (!row) return null;

    const membersRes = await this.query(
      `SELECT "id", "name"
       FROM "room_participants"
       WHERE "groupId" = $1 AND "role" = 'STUDENT'
       ORDER BY "joinedAt" ASC, "name" ASC`,
      [groupId]
    );

    const members: MemberData[] = membersRes.rows.map((m) => ({
      id: m.id,
      name: m.name,
    }));

    return {
      id: row.id,
      roomId: row.roomId,
      name: row.name,
      members,
    };
  }

  public async getGroupsByRoom(roomId: string): Promise<GroupData[]> {
    const groupsRes = await this.query(
      `SELECT "id", "roomId", "name"
       FROM "groups"
       WHERE "roomId" = $1
       ORDER BY "groupNumber" ASC`,
      [roomId]
    );

    if (groupsRes.rows.length === 0) return [];

    const membersRes = await this.query(
      `SELECT "id", "groupId", "name"
       FROM "room_participants"
       WHERE "roomId" = $1 AND "groupId" IS NOT NULL AND "role" = 'STUDENT'
       ORDER BY "joinedAt" ASC, "name" ASC`,
      [roomId]
    );

    const membersByGroup = new Map<string, MemberData[]>();
    for (const m of membersRes.rows) {
      const list = membersByGroup.get(m.groupId) ?? [];
      list.push({ id: m.id, name: m.name });
      membersByGroup.set(m.groupId, list);
    }

    return groupsRes.rows.map((g) => ({
      id: g.id,
      roomId: g.roomId,
      name: g.name,
      members: membersByGroup.get(g.id) ?? [],
    }));
  }

  public async getTasks(groupId: string): Promise<TaskData[]> {
    const res = await this.query(
      `SELECT "id", "groupId", "title", "description", "assigneeId", "status", "weight",
              "deadline", "evidenceType", "evidenceUrl", "evidenceStatus", "evidenceFeedback",
              "createdAt", "doneAt"
       FROM "tasks"
       WHERE "groupId" = $1
       ORDER BY "createdAt" ASC`,
      [groupId]
    );
    return res.rows.map(mapTaskRow);
  }

  public async getTaskById(taskId: string): Promise<TaskData | null> {
    const res = await this.query(
      `SELECT "id", "groupId", "title", "description", "assigneeId", "status", "weight",
              "deadline", "evidenceType", "evidenceUrl", "evidenceStatus", "evidenceFeedback",
              "createdAt", "doneAt"
       FROM "tasks"
       WHERE "id" = $1
       LIMIT 1`,
      [taskId]
    );
    const row = res.rows[0];
    return row ? mapTaskRow(row) : null;
  }

  public async updateTask(taskId: string, patch: Partial<TaskData>): Promise<TaskData | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    const pushSet = (col: string, val: unknown) => {
      values.push(val);
      setClauses.push(`"${col}" = $${values.length}`);
    };

    if (patch.title !== undefined) pushSet('title', patch.title);
    if (patch.description !== undefined) pushSet('description', patch.description);
    if (patch.assigneeId !== undefined) pushSet('assigneeId', patch.assigneeId || null);
    if (patch.status !== undefined) pushSet('status', DbEnumMapper.taskStatusToDb(patch.status));
    if (patch.weight !== undefined) pushSet('weight', patch.weight);
    if (patch.deadline !== undefined) pushSet('deadline', patch.deadline ? new Date(patch.deadline) : null);
    if (patch.evidenceType !== undefined) pushSet('evidenceType', DbEnumMapper.evidenceTypeToDb(patch.evidenceType));
    if (patch.evidenceUrl !== undefined) pushSet('evidenceUrl', patch.evidenceUrl);
    if (patch.evidenceStatus !== undefined)
      pushSet('evidenceStatus', DbEnumMapper.evidenceStatusToDb(patch.evidenceStatus));
    if (patch.evidenceFeedback !== undefined) pushSet('evidenceFeedback', patch.evidenceFeedback);

    if (patch.doneAt !== undefined) {
      pushSet('doneAt', patch.doneAt ? new Date(patch.doneAt) : null);
    } else if (patch.status === 'done') {
      pushSet('doneAt', new Date());
    }

    if (setClauses.length === 0) {
      return this.getTaskById(taskId);
    }

    values.push(taskId);
    const res = await this.query(
      `UPDATE "tasks"
       SET ${setClauses.join(', ')}
       WHERE "id" = $${values.length}
       RETURNING "id", "groupId", "title", "description", "assigneeId", "status", "weight",
                 "deadline", "evidenceType", "evidenceUrl", "evidenceStatus", "evidenceFeedback",
                 "createdAt", "doneAt"`,
      values
    );

    const row = res.rows[0];
    return row ? mapTaskRow(row) : null;
  }

  private async insertTasksWithClient(
    client: PoolClientLike,
    groupId: string,
    newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]
  ): Promise<TaskData[]> {
    const createdList: TaskData[] = [];

    for (const item of newTasks) {
      const id = crypto.randomUUID();
      const statusDb = DbEnumMapper.taskStatusToDb(item.status || 'todo');
      const deadlineVal = item.deadline ? new Date(item.deadline) : null;
      const doneAtVal = item.doneAt ? new Date(item.doneAt) : statusDb === 'DONE' ? new Date() : null;

      const res = await client.query(
        `INSERT INTO "tasks" (
           "id", "groupId", "title", "description", "assigneeId", "status", "weight",
           "deadline", "evidenceType", "evidenceUrl", "evidenceStatus", "evidenceFeedback", "doneAt"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING "id", "groupId", "title", "description", "assigneeId", "status", "weight",
                   "deadline", "evidenceType", "evidenceUrl", "evidenceStatus", "evidenceFeedback",
                   "createdAt", "doneAt"`,
        [
          id,
          groupId,
          item.title,
          item.description ?? null,
          item.assigneeId ?? null,
          statusDb,
          item.weight ?? 1,
          deadlineVal,
          DbEnumMapper.evidenceTypeToDb(item.evidenceType),
          item.evidenceUrl ?? null,
          DbEnumMapper.evidenceStatusToDb(item.evidenceStatus),
          item.evidenceFeedback ?? null,
          doneAtVal,
        ]
      );

      if (res.rows[0]) {
        createdList.push(mapTaskRow(res.rows[0]));
      }
    }

    return createdList;
  }

  public async createTasks(
    groupId: string,
    newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]
  ): Promise<TaskData[]> {
    if (newTasks.length === 0) return [];
    return this.withTransaction((client) => this.insertTasksWithClient(client, groupId, newTasks));
  }

  // --- Activities & Teacher (READ-ONLY) ---

  public async getActivity(groupId: string, since?: string): Promise<ActivityData[]> {
    const params: unknown[] = [groupId];
    let sql = `SELECT "id", "groupId", "memberId", "type", "description", "createdAt"
               FROM "activities"
               WHERE "groupId" = $1`;

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        params.push(sinceDate);
        sql += ` AND "createdAt" >= $2`;
      }
    }

    sql += ` ORDER BY "createdAt" ASC`;

    const res = await this.query(sql, params);
    return res.rows.map((row) => ({
      id: row.id,
      groupId: row.groupId,
      memberId: row.memberId,
      type: DbEnumMapper.activityTypeToApp(row.type),
      description: row.description ?? undefined,
      at: toIsoStringRequired(row.createdAt),
    }));
  }

  public async getTeacherOfGroup(groupId: string): Promise<TeacherData | null> {
    const res = await this.query(
      `SELECT u."id", u."name", u."email"
       FROM "groups" g
       JOIN "rooms" r ON r."id" = g."roomId"
       JOIN "users" u ON u."id" = r."teacherId"
       WHERE g."id" = $1
       LIMIT 1`,
      [groupId]
    );
    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email ?? undefined,
    };
  }

  // --- Peer Reports (READ-ONLY untuk Backend 2; penulisan wewenang Backend 1) ---

  public async savePeerReport(_report: Omit<PeerReport, 'id' | 'createdAt'>): Promise<PeerReport> {
    throw new NotImplementedError(
      'Penulisan laporan peer-review tidak tersedia di Backend 2 (tugas endpoint Backend 1; role database backend2 hanya diizinkan membaca peer_reports).'
    );
  }

  public async getPeerReportsByRoom(roomId: string): Promise<PeerReport[]> {
    const res = await this.query(
      `SELECT pr."id", pr."roomId", pr."groupId", pr."reporterId",
              pr."reportedId" AS "reportedMemberId",
              COALESCE(rp."name", 'Anggota') AS "reportedMemberName",
              pr."rating", pr."feedback", pr."createdAt"
       FROM "peer_reports" pr
       LEFT JOIN "room_participants" rp ON rp."id" = pr."reportedId"
       WHERE pr."roomId" = $1
       ORDER BY pr."createdAt" ASC`,
      [roomId]
    );
    return res.rows.map(mapPeerReportRow);
  }

  public async getPeerReportsByGroup(groupId: string): Promise<PeerReport[]> {
    const res = await this.query(
      `SELECT pr."id", pr."roomId", pr."groupId", pr."reporterId",
              pr."reportedId" AS "reportedMemberId",
              COALESCE(rp."name", 'Anggota') AS "reportedMemberName",
              pr."rating", pr."feedback", pr."createdAt"
       FROM "peer_reports" pr
       LEFT JOIN "room_participants" rp ON rp."id" = pr."reportedId"
       WHERE pr."groupId" = $1
       ORDER BY pr."createdAt" ASC`,
      [groupId]
    );
    return res.rows.map(mapPeerReportRow);
  }

  // --- Group Messages (Human & AI Messages) ---

  public async saveAiMessage(msg: Omit<AiMessage, 'id' | 'createdAt'>): Promise<AiMessage> {
    const id = crypto.randomUUID();
    const isAi = msg.senderType === 'ai';
    const rawPayload = msg.payload ?? msg.structuredPayload ?? null;
    const payloadJson = rawPayload !== null ? JSON.stringify(rawPayload) : null;

    const res = await this.query(
      `INSERT INTO "group_messages" ("id", "groupId", "senderName", "content", "isAi", "action", "payload")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING "id", "groupId", "senderName", "content", "isAi", "action", "payload", "createdAt"`,
      [id, msg.groupId, msg.senderName || (isAi ? 'AI Asisten Rukun' : 'Siswa'), msg.content, isAi, msg.action ?? null, payloadJson]
    );

    return mapGroupMessageRow(res.rows[0]);
  }

  public async getAiMessages(groupId: string, since?: string, limit: number = 30): Promise<AiMessage[]> {
    const params: unknown[] = [groupId];
    let innerWhere = `WHERE "groupId" = $1`;

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        params.push(sinceDate);
        innerWhere += ` AND "createdAt" > $${params.length}`;
      }
    }

    const safeLimit = Math.max(1, Math.min(200, Math.floor(Number(limit) || 30)));
    params.push(safeLimit);

    const res = await this.query(
      `SELECT * FROM (
         SELECT "id", "groupId", "senderName", "content", "isAi", "action", "payload", "createdAt"
         FROM "group_messages"
         ${innerWhere}
         ORDER BY "createdAt" DESC
         LIMIT $${params.length}
       ) sub
       ORDER BY "createdAt" ASC`,
      params
    );

    return res.rows.map(mapGroupMessageRow);
  }

  // --- AI Suggestions ---

  public async saveAiSuggestion(sug: Omit<AiSuggestion, 'id' | 'createdAt'>): Promise<AiSuggestion> {
    const id = crypto.randomUUID();
    const res = await this.query(
      `INSERT INTO "ai_suggestions" ("id", "groupId", "type", "payload", "status")
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING "id", "groupId", "type", "payload", "status", "createdAt"`,
      [
        id,
        sug.groupId,
        DbEnumMapper.suggestionTypeToDb(sug.type),
        JSON.stringify(sug.payload ?? {}),
        DbEnumMapper.suggestionStatusToDb(sug.status || 'pending'),
      ]
    );
    return mapSuggestionRow(res.rows[0]);
  }

  public async getAiSuggestion(id: string): Promise<AiSuggestion | null> {
    const res = await this.query(
      `SELECT "id", "groupId", "type", "payload", "status", "createdAt"
       FROM "ai_suggestions"
       WHERE "id" = $1
       LIMIT 1`,
      [id]
    );
    const row = res.rows[0];
    return row ? mapSuggestionRow(row) : null;
  }

  public async updateAiSuggestionStatus(
    id: string,
    status: 'pending' | 'applied' | 'dismissed'
  ): Promise<AiSuggestion | null> {
    const res = await this.query(
      `UPDATE "ai_suggestions"
       SET "status" = $2
       WHERE "id" = $1
       RETURNING "id", "groupId", "type", "payload", "status", "createdAt"`,
      [id, DbEnumMapper.suggestionStatusToDb(status)]
    );
    const row = res.rows[0];
    return row ? mapSuggestionRow(row) : null;
  }

  /**
   * Menerapkan usulan peran secara atomik dalam satu transaksi PostgreSQL:
   * insert semua tugas + ubah status usulan menjadi APPLIED.
   */
  public async applySuggestionTasks(
    suggestionId: string,
    groupId: string,
    newTasks: Omit<TaskData, 'id' | 'groupId' | 'createdAt'>[]
  ): Promise<TaskData[]> {
    return this.withTransaction(async (client) => {
      const created = await this.insertTasksWithClient(client, groupId, newTasks);

      const updateRes = await client.query(
        `UPDATE "ai_suggestions"
         SET "status" = $2
         WHERE "id" = $1 AND "status" = 'PENDING'
         RETURNING "id"`,
        [suggestionId, DbEnumMapper.suggestionStatusToDb('applied')]
      );

      if (!updateRes.rowCount || updateRes.rowCount === 0) {
        throw new Error('Usulan tidak ditemukan atau sudah diproses');
      }

      return created;
    });
  }

  // --- AI Flags ---

  public async saveAiFlag(flag: Omit<AiFlag, 'id' | 'createdAt'>): Promise<AiFlag> {
    const id = crypto.randomUUID();
    // Normalisasi memberId kosong / 'unassigned' menjadi NULL agar tidak melanggar FK room_participants
    const normalizedMemberId =
      flag.memberId && flag.memberId.trim() !== '' && flag.memberId !== 'unassigned' ? flag.memberId : null;

    const res = await this.query(
      `INSERT INTO "ai_flags" ("id", "groupId", "memberId", "kind", "detail", "resolvedAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING "id", "groupId", "memberId", "kind", "detail", "resolvedAt", "createdAt"`,
      [
        id,
        flag.groupId,
        normalizedMemberId,
        DbEnumMapper.flagKindToDb(flag.kind),
        JSON.stringify(flag.detail ?? {}),
        flag.resolvedAt ? new Date(flag.resolvedAt) : null,
      ]
    );
    return mapFlagRow(res.rows[0]);
  }

  public async getAiFlags(groupId?: string): Promise<AiFlag[]> {
    const params: unknown[] = [];
    let sql = `SELECT "id", "groupId", "memberId", "kind", "detail", "resolvedAt", "createdAt"
               FROM "ai_flags"`;

    if (groupId) {
      params.push(groupId);
      sql += ` WHERE "groupId" = $1`;
    }

    sql += ` ORDER BY "createdAt" ASC`;

    const res = await this.query(sql, params);
    return res.rows.map(mapFlagRow);
  }

  // --- Contribution Snapshots (In-Memory Fallback: Tidak ada tabel snapshot di schema.prisma) ---

  public async saveSnapshot(snapshot: AiContributionSnapshot): Promise<void> {
    const existing = this.snapshotsCache.get(snapshot.groupId) ?? [];
    existing.push(snapshot);
    this.snapshotsCache.set(snapshot.groupId, existing);
  }

  public async getLatestSnapshots(groupId: string): Promise<AiContributionSnapshot[]> {
    return this.snapshotsCache.get(groupId) ?? [];
  }
}
