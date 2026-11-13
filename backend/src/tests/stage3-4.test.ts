process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-local-jwt-secret-min-16-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

import assert from 'node:assert/strict';
import { calculateWeightedProgress, computeGroupProgressSummary } from '../services/progress-calc.js';
import type { TaskProgressPrisma } from '../services/task-progress.service.js';
import type { ProgressMonitorPrisma } from '../services/progress-monitor.service.js';

interface MockState {
  rooms: Map<string, any>;
  groups: any[];
  participants: Map<string, any>;
  tasks: any[];
  activities: any[];
}

function createMockPrisma(state: MockState) {
  let idSeq = 1;
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

  const mock = {
    room: {
      findUnique: async ({ where }: any) => state.rooms.get(where.id) ?? null,
    },
    roomParticipant: {
      findUnique: async ({ where }: any) => state.participants.get(where.id) ?? null,
    },
    task: {
      findUnique: async ({ where }: any) =>
        state.tasks.find((t) => t.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const idx = state.tasks.findIndex((t) => t.id === where.id);
        if (idx === -1) return null;
        state.tasks[idx] = { ...state.tasks[idx], ...data };
        return state.tasks[idx];
      },
    },
    activity: {
      create: async ({ data }: any) => {
        const created = { id: nextId('act'), createdAt: new Date(), ...data };
        state.activities.push(created);
        return created;
      },
    },
    group: {
      findMany: async ({ where }: any) =>
        state.groups
          .filter((g) => g.roomId === where.roomId)
          .map((g) => ({
            ...g,
            tasks: state.tasks.filter((t) => t.groupId === g.id),
            members: Array.from(state.participants.values()).filter(
              (p) => p.groupId === g.id && p.role === 'STUDENT'
            ),
          })),
    },
  };

  return mock as unknown as TaskProgressPrisma & ProgressMonitorPrisma;
}

async function expectAppError(fn: () => Promise<unknown>, expectedStatus: number, label: string) {
  let caught: any;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, `${label}: seharusnya melempar error`);
  assert.equal(caught.statusCode, expectedStatus, `${label}: status harus ${expectedStatus}`);
}

async function runTests() {
  const { updateTaskProgress } = await import('../services/task-progress.service.js');
  const { updateProgressSchema } = await import('../controllers/task-progress.controller.js');
  const { getRoomProgress } = await import('../services/progress-monitor.service.js');
  const { errorHandler } = await import('../middleware/errorHandler.js');

  // --- 1. Pure Function Tests (Tanpa Database) ---
  assert.equal(calculateWeightedProgress([]), 0, 'Tanpa tugas harus 0');
  assert.equal(
    calculateWeightedProgress([
      { weight: 3, progress: 100 },
      { weight: 1, progress: 0 },
    ]),
    75,
    'Bobot berbeda: (3*100 + 1*0) / 4 = 75'
  );

  const dLate = new Date('2026-11-25T10:00:00.000Z');
  const dSoon = new Date('2026-11-18T10:00:00.000Z');
  const dDone = new Date('2026-11-15T10:00:00.000Z');

  const summary = computeGroupProgressSummary(
    { id: 'g-pure', name: 'Kelompok Pure' },
    [
      { id: 't1', assigneeId: 's1', status: 'DONE', weight: 3, progress: 100, deadline: dDone },
      { id: 't2', assigneeId: 's1', status: 'IN_PROGRESS', weight: 1, progress: 0, deadline: dLate },
      { id: 't3', assigneeId: 's2', status: 'TODO', weight: 0, progress: 0, deadline: dSoon },
    ],
    [
      { id: 's1', name: 'Dafano' },
      { id: 's2', name: 'Nadya' },
      { id: 's3', name: 'Bima' }, // belum pegang tugas
    ]
  );

  assert.equal(summary.progressPercent, 75);
  assert.deepEqual(summary.statusCounts, { todo: 1, inProgress: 1, done: 1 });
  assert.equal(summary.nearestDeadline, dSoon.toISOString(), 'nearestDeadline mengabaikan tugas DONE');
  assert.equal(summary.members.find((m) => m.participantId === 's1')?.progressPercent, 75);
  assert.equal(summary.members.find((m) => m.participantId === 's3')?.progressPercent, null, 'Tanpa tugas => null');

  const emptySummary = computeGroupProgressSummary(
    { id: 'g-empty', name: 'Kosong' },
    [],
    [{ id: 's1', name: 'Dafano' }]
  );
  assert.equal(emptySummary.progressPercent, 0);
  assert.equal(emptySummary.nearestDeadline, null);
  assert.equal(emptySummary.members[0].progressPercent, null);

  // --- 2. Zod Validation + ErrorHandler 400 Check ---
  for (const invalidBody of [{ progress: -1 }, { progress: 101 }, { progress: 50.5 }, { progress: '50' }]) {
    const parsed = updateProgressSchema.safeParse(invalidBody);
    assert.equal(parsed.success, false, `Input invalid harus gagal validasi: ${JSON.stringify(invalidBody)}`);
    let capturedStatus = 0;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json() {},
    };
    errorHandler(parsed.error, {} as any, mockRes, (() => {}) as any);
    assert.equal(capturedStatus, 400, 'errorHandler harus mengembalikan 400 untuk ZodError');
  }

  // --- 3. Mock Prisma Integration Tests (Tahap 3 & 4) ---
  const state: MockState = {
    rooms: new Map([
      ['room-1', { id: 'room-1', title: 'Kelas A' }],
      ['room-2', { id: 'room-2', title: 'Kelas B' }],
    ]),
    groups: [
      { id: 'group-1', roomId: 'room-1', groupNumber: 1, name: 'Kelompok 1' },
    ],
    participants: new Map([
      ['guru-1', { id: 'guru-1', roomId: 'room-1', groupId: null, role: 'TEACHER', name: 'Ibu Ratna' }],
      ['guru-2', { id: 'guru-2', roomId: 'room-2', groupId: null, role: 'TEACHER', name: 'Pak Budi' }],
      ['m-1', { id: 'm-1', roomId: 'room-1', groupId: 'group-1', role: 'STUDENT', name: 'Dafano' }],
      ['m-2', { id: 'm-2', roomId: 'room-1', groupId: 'group-1', role: 'STUDENT', name: 'Nadya' }],
    ]),
    tasks: [
      {
        id: 'task-1',
        groupId: 'group-1',
        title: 'Susun Slide',
        assigneeId: 'm-1',
        status: 'TODO',
        weight: 40,
        progress: 0,
        deadline: dSoon,
        doneAt: null,
      },
    ],
    activities: [],
  };

  const prisma = createMockPrisma(state);

  // Selain penanggung jawab ditolak 403
  await expectAppError(
    () => updateTaskProgress('m-2', 'STUDENT', 'task-1', { progress: 50 }, prisma),
    403,
    'Anggota lain ubah progress'
  );
  await expectAppError(
    () => updateTaskProgress('guru-1', 'TEACHER', 'task-1', { progress: 50 }, prisma),
    403,
    'Guru ubah progress'
  );

  // Transisi status: 50 -> IN_PROGRESS, doneAt null
  const res50 = await updateTaskProgress('m-1', 'STUDENT', 'task-1', { progress: 50, note: 'Setengah jalan' }, prisma);
  assert.equal(res50.status, 'IN_PROGRESS');
  assert.equal(res50.doneAt, null);
  assert.equal(state.activities.length, 1);
  assert.ok(state.activities[0].description.includes('Susun Slide') && state.activities[0].description.includes('50%'));

  // Transisi status: 100 -> DONE, doneAt terisi
  const res100 = await updateTaskProgress('m-1', 'STUDENT', 'task-1', { progress: 100 }, prisma);
  assert.equal(res100.status, 'DONE');
  assert.ok(res100.doneAt instanceof Date, '100% harus mengisi doneAt');

  // Turun dari 100 -> IN_PROGRESS, doneAt dikosongkan
  const resBack = await updateTaskProgress('m-1', 'STUDENT', 'task-1', { progress: 60 }, prisma);
  assert.equal(resBack.status, 'IN_PROGRESS');
  assert.equal(resBack.doneAt, null, 'Turun dari 100% harus mengosongkan doneAt');

  // 0 -> TODO, doneAt null
  const resZero = await updateTaskProgress('m-1', 'STUDENT', 'task-1', { progress: 0 }, prisma);
  assert.equal(resZero.status, 'TODO');
  assert.equal(resZero.doneAt, null);

  // Monitor guru: siswa ditolak 403, guru kelas lain ditolak 403, guru kelas sama berhasil
  await expectAppError(
    () => getRoomProgress('m-1', 'STUDENT', 'room-1', prisma),
    403,
    'Siswa akses monitor progress'
  );
  await expectAppError(
    () => getRoomProgress('guru-2', 'TEACHER', 'room-1', prisma),
    403,
    'Guru kelas lain akses monitor progress'
  );

  const roomProgress = await getRoomProgress('guru-1', 'TEACHER', 'room-1', prisma);
  assert.equal(roomProgress.roomId, 'room-1');
  assert.equal(roomProgress.groups.length, 1);
  assert.equal(roomProgress.groups[0].members.find((m) => m.participantId === 'm-2')?.progressPercent, null);

  console.log('✅ SEMUA TEST TAHAP 3 & TAHAP 4 (BACKEND 1) BERHASIL!');
}

runTests().catch((err) => {
  console.error('❌ TEST GAGAL:', err);
  process.exit(1);
});
