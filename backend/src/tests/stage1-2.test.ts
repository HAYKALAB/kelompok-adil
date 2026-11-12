process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-local-jwt-secret-min-16-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

import assert from 'node:assert/strict';
import type { TaskBoardPrisma } from '../services/task-board.service.js';
import type { PeerReportPrisma } from '../services/peer-report.service.js';

interface MockState {
  rooms: Map<string, any>;
  groups: Map<string, any>;
  participants: Map<string, any>;
  tasks: any[];
  activities: any[];
  peerReports: any[];
}

function createMockPrisma(state: MockState) {
  let idSeq = 1;
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

  const mock = {
    room: {
      findUnique: async ({ where }: any) => state.rooms.get(where.id) ?? null,
    },
    group: {
      findUnique: async ({ where }: any) => state.groups.get(where.id) ?? null,
    },
    roomParticipant: {
      findUnique: async ({ where }: any) => state.participants.get(where.id) ?? null,
    },
    task: {
      findMany: async ({ where }: any) =>
        state.tasks.filter((t) => t.groupId === where.groupId),
      findUnique: async ({ where }: any) =>
        state.tasks.find((t) => t.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const created = {
          id: nextId('task'),
          status: 'TODO',
          progress: 0,
          createdAt: new Date(),
          doneAt: null,
          ...data,
        };
        state.tasks.push(created);
        return created;
      },
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
    peerReport: {
      findFirst: async ({ where }: any) =>
        state.peerReports.find(
          (r) =>
            r.groupId === where.groupId &&
            r.reporterId === where.reporterId &&
            r.reportedId === where.reportedId
        ) ?? null,
      create: async ({ data }: any) => {
        const created = { id: nextId('rep'), createdAt: new Date(), ...data };
        state.peerReports.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const idx = state.peerReports.findIndex((r) => r.id === where.id);
        if (idx === -1) return null;
        state.peerReports[idx] = { ...state.peerReports[idx], ...data };
        return state.peerReports[idx];
      },
      findMany: async ({ where }: any) =>
        state.peerReports
          .filter((r) => r.roomId === where.roomId)
          .map((r) => ({
            ...r,
            reporter: {
              id: r.reporterId,
              name: state.participants.get(r.reporterId)?.name ?? 'Unknown',
            },
            reported: {
              id: r.reportedId,
              name: state.participants.get(r.reportedId)?.name ?? 'Unknown',
            },
          })),
    },
  };

  return mock as unknown as TaskBoardPrisma & PeerReportPrisma;
}

async function expectAppError(fn: () => Promise<unknown>, expectedStatus: number, label: string) {
  let caught: any;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, `${label}: seharusnya melempar error`);
  assert.equal(caught.statusCode, expectedStatus, `${label}: status harus ${expectedStatus}, dapat ${caught.statusCode}`);
}

async function runTests() {
  const { createGroupTask, listGroupTasks, updateGroupTask } = await import('../services/task-board.service.js');
  const { listRoomPeerReports, submitPeerReport } = await import('../services/peer-report.service.js');

  const state: MockState = {
    rooms: new Map([
      ['room-1', { id: 'room-1', title: 'Kelas A' }],
      ['room-2', { id: 'room-2', title: 'Kelas B' }],
    ]),
    groups: new Map([
      ['group-1', { id: 'group-1', roomId: 'room-1', name: 'Kelompok 1' }],
      ['group-2', { id: 'group-2', roomId: 'room-1', name: 'Kelompok 2' }],
    ]),
    participants: new Map([
      ['guru-1', { id: 'guru-1', roomId: 'room-1', groupId: null, role: 'TEACHER', name: 'Ibu Ratna' }],
      ['guru-2', { id: 'guru-2', roomId: 'room-2', groupId: null, role: 'TEACHER', name: 'Pak Budi' }],
      ['m-1', { id: 'm-1', roomId: 'room-1', groupId: 'group-1', role: 'STUDENT', name: 'Dafano' }],
      ['m-2', { id: 'm-2', roomId: 'room-1', groupId: 'group-1', role: 'STUDENT', name: 'Nadya' }],
      ['m-3', { id: 'm-3', roomId: 'room-1', groupId: 'group-2', role: 'STUDENT', name: 'Bima' }],
    ]),
    tasks: [],
    activities: [],
    peerReports: [],
  };

  const prisma = createMockPrisma(state);

  // --- TAHAP 1 TESTS ---
  // 1. Anggota kelompok membuat tugas & mencatat 1 activity LOG
  const created = await createGroupTask(
    'm-1',
    'STUDENT',
    'group-1',
    { title: 'Riset Primer', description: 'Cari sumber sejarah', assigneeId: 'm-2', weight: 40 },
    prisma
  );
  assert.equal(created.groupId, 'group-1');
  assert.equal(created.assigneeId, 'm-2');
  assert.equal(state.activities.length, 1);
  assert.equal(state.activities[0].type, 'LOG');

  // 2. Guru kelas sama boleh membaca tugas, guru kelas lain ditolak 403, bukan anggota ditolak 403
  const tasksForMember = await listGroupTasks('m-1', 'STUDENT', 'group-1', prisma);
  const tasksForSameTeacher = await listGroupTasks('guru-1', 'TEACHER', 'group-1', prisma);
  assert.equal(tasksForMember.length, 1);
  assert.equal(tasksForSameTeacher.length, 1);

  await expectAppError(
    () => listGroupTasks('guru-2', 'TEACHER', 'group-1', prisma),
    403,
    'Guru kelas lain baca tugas'
  );
  await expectAppError(
    () => listGroupTasks('m-3', 'STUDENT', 'group-1', prisma),
    403,
    'Bukan anggota kelompok baca tugas'
  );

  // 3. Guru & bukan anggota tidak boleh membuat tugas
  await expectAppError(
    () => createGroupTask('guru-1', 'TEACHER', 'group-1', { title: 'Tugas Guru' }, prisma),
    403,
    'Guru buat tugas'
  );
  await expectAppError(
    () => createGroupTask('m-3', 'STUDENT', 'group-1', { title: 'Tugas Luar' }, prisma),
    403,
    'Siswa kelompok lain buat tugas'
  );

  // 4. assigneeId dari kelompok lain ditolak (400)
  await expectAppError(
    () => createGroupTask('m-1', 'STUDENT', 'group-1', { title: 'Salah Assignee', assigneeId: 'm-3' }, prisma),
    400,
    'Assignee kelompok lain saat create'
  );
  await expectAppError(
    () => updateGroupTask('m-1', 'STUDENT', created.id, { assigneeId: 'm-3' }, prisma),
    400,
    'Assignee kelompok lain saat update'
  );

  // 5. Anggota kelompok boleh ubah tugas & kosongkan assigneeId (null)
  const updated = await updateGroupTask(
    'm-2',
    'STUDENT',
    created.id,
    { title: 'Riset Primer Revisi', assigneeId: null, weight: 50 },
    prisma
  );
  assert.equal(updated.title, 'Riset Primer Revisi');
  assert.equal(updated.assigneeId, null);
  assert.equal(updated.weight, 50);

  // 6. Bukan anggota kelompok tidak boleh ubah tugas
  await expectAppError(
    () => updateGroupTask('m-3', 'STUDENT', created.id, { title: 'Hack' }, prisma),
    403,
    'Siswa kelompok lain ubah tugas'
  );

  // --- TAHAP 2 TESTS ---
  // 7. Kirim laporan rahasia: tidak mencatat activities, reporterId selalu dari token, kirim ulang menimpa lama
  const activitiesBeforeReport = state.activities.length;
  const repRes1 = await submitPeerReport(
    'm-1',
    'STUDENT',
    'group-1',
    { reportedId: 'm-2', rating: 2, feedback: 'Belum aktif diskusi' },
    prisma
  );
  assert.deepEqual(repRes1, { saved: true });
  assert.equal(state.activities.length, activitiesBeforeReport, 'Laporan tidak boleh masuk activities');
  assert.equal(state.peerReports.length, 1);
  assert.equal(state.peerReports[0].reporterId, 'm-1');

  // Kirim ulang pasangan (m-1 -> m-2) menimpa laporan lama
  await submitPeerReport(
    'm-1',
    'STUDENT',
    'group-1',
    { reportedId: 'm-2', rating: 4, feedback: 'Sudah mulai aktif' },
    prisma
  );
  assert.equal(state.peerReports.length, 1, 'Kirim ulang harus menimpa laporan lama');
  assert.equal(state.peerReports[0].rating, 4);

  // 8. Tidak boleh lapor diri sendiri atau anggota kelompok lain
  await expectAppError(
    () => submitPeerReport('m-1', 'STUDENT', 'group-1', { reportedId: 'm-1', rating: 1, feedback: 'self' }, prisma),
    400,
    'Lapor diri sendiri'
  );
  await expectAppError(
    () => submitPeerReport('m-1', 'STUDENT', 'group-1', { reportedId: 'm-3', rating: 1, feedback: 'luar' }, prisma),
    400,
    'Lapor anggota kelompok lain'
  );

  // 9. Siswa tidak bisa membaca laporan (403), guru kelas lain ditolak (403), guru kelas sama berhasil
  await expectAppError(
    () => listRoomPeerReports('m-1', 'STUDENT', 'room-1', prisma),
    403,
    'Siswa baca laporan'
  );
  await expectAppError(
    () => listRoomPeerReports('guru-2', 'TEACHER', 'room-1', prisma),
    403,
    'Guru kelas lain baca laporan'
  );

  const teacherReports = await listRoomPeerReports('guru-1', 'TEACHER', 'room-1', prisma);
  assert.equal(teacherReports.length, 1);
  assert.equal(teacherReports[0].reporterName, 'Dafano');
  assert.equal(teacherReports[0].reportedName, 'Nadya');

  console.log('✅ SEMUA TEST TAHAP 1 & TAHAP 2 (BACKEND 1) BERHASIL!');
}

runTests().catch((err) => {
  console.error('❌ TEST GAGAL:', err);
  process.exit(1);
});
