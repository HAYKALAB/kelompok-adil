process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-local-jwt-secret-min-16-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

import assert from 'node:assert/strict';
import type { RoomDetailPrisma } from '../services/room.service.js';

function createMockPrisma() {
  const rooms = [
    {
      id: 'room-1',
      pin: '123456',
      title: 'Proyek Sejarah Majapahit',
      subject: 'Sejarah Nusantara',
      className: 'XI IPS 2',
      aiEnabled: true,
      deadline: new Date('2026-11-20T16:59:00.000Z'),
      status: 'ACTIVE',
      teacherId: 'user-guru-1',
      teacherTickets: [{ code: 'GURU-SECRET' }],
      peerReports: [{ id: 'rep-secret', feedback: 'Rahasia' }],
    },
    {
      id: 'room-2',
      pin: '654321',
      title: 'Kelas Lain',
      subject: 'Matematika',
      className: 'XI IPA 1',
      aiEnabled: false,
      deadline: null,
      status: 'LOBBY',
      teacherId: 'user-guru-2',
    },
  ];

  const participants = [
    {
      id: 'part-guru-1',
      roomId: 'room-1',
      name: 'Ibu Ratna',
      role: 'TEACHER',
      groupId: null,
      joinedAt: new Date('2026-11-10T01:00:00Z'),
      email: 'ratna@secret.sch.id',
    },
    {
      id: 'part-s1',
      roomId: 'room-1',
      name: 'Dafano',
      role: 'STUDENT',
      groupId: 'group-1',
      joinedAt: new Date('2026-11-10T01:01:00Z'),
      email: 'dafano@secret.sch.id',
    },
    {
      id: 'part-s2',
      roomId: 'room-1',
      name: 'Nadya',
      role: 'STUDENT',
      groupId: 'group-1',
      joinedAt: new Date('2026-11-10T01:02:00Z'),
      email: 'nadya@secret.sch.id',
    },
    {
      id: 'part-s3',
      roomId: 'room-1',
      name: 'Bima',
      role: 'STUDENT',
      groupId: 'group-2',
      joinedAt: new Date('2026-11-10T01:03:00Z'),
      email: 'bima@secret.sch.id',
    },
    {
      id: 'part-other-room',
      roomId: 'room-2',
      name: 'Siswa Kelas Sebelah',
      role: 'STUDENT',
      groupId: null,
      joinedAt: new Date('2026-11-10T01:04:00Z'),
    },
  ];

  const groups = [
    {
      id: 'group-1',
      roomId: 'room-1',
      groupNumber: 1,
      name: 'Kelompok 1',
      messages: [{ content: 'Chat rahasia kelompok 1' }],
    },
    {
      id: 'group-2',
      roomId: 'room-1',
      groupNumber: 2,
      name: 'Kelompok 2',
      messages: [{ content: 'Chat rahasia kelompok 2' }],
    },
  ];

  const pickMembers = (groupId: string) =>
    participants
      .filter((p) => p.groupId === groupId)
      .map((p) => ({ id: p.id, name: p.name }));

  const mock: RoomDetailPrisma = {
    room: {
      findUnique: async ({ where }: any) => rooms.find((r) => r.pin === where.pin) ?? null,
    },
    roomParticipant: {
      findUnique: async ({ where }: any) => participants.find((p) => p.id === where.id) ?? null,
      findMany: async ({ where }: any) =>
        participants
          .filter((p) => p.roomId === where.roomId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            groupId: p.groupId,
          })),
      count: async ({ where }: any) =>
        participants.filter((p) => p.roomId === where.roomId).length,
    },
    group: {
      findMany: async ({ where }: any) =>
        groups
          .filter((g) => g.roomId === where.roomId)
          .sort((a, b) => a.groupNumber - b.groupNumber)
          .map((g) => ({
            id: g.id,
            groupNumber: g.groupNumber,
            name: g.name,
            members: pickMembers(g.id),
          })),
      findUnique: async ({ where }: any) => {
        const g = groups.find((item) => item.id === where.id);
        if (!g) return null;
        return {
          id: g.id,
          roomId: g.roomId,
          groupNumber: g.groupNumber,
          name: g.name,
          members: pickMembers(g.id),
        };
      },
    },
  };

  return mock;
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
  const { authMiddleware } = await import('../middleware/auth.middleware.js');
  const { getRoomDetail } = await import('../services/room.service.js');

  const prisma = createMockPrisma();

  // 1. Tanpa token -> 401
  await new Promise<void>((resolve) => {
    const req: any = { headers: {} };
    const res: any = {};
    authMiddleware(req, res, (err?: any) => {
      assert.ok(err, 'Tanpa token harus menghasilkan error');
      assert.equal(err.statusCode, 401);
      resolve();
    });
  });

  // 2. PIN tidak ditemukan -> 404
  await expectAppError(
    () => getRoomDetail('part-guru-1', '999999', prisma),
    404,
    'PIN tidak ditemukan'
  );

  // 3. Peserta kelas lain -> 403
  await expectAppError(
    () => getRoomDetail('part-other-room', '123456', prisma),
    403,
    'Peserta kelas lain ditolak'
  );

  // 4. Siswa hanya menerima kelompoknya sendiri & tidak ada data sensitif/peserta lain
  const studentRes: any = await getRoomDetail('part-s1', '123456', prisma);
  assert.deepEqual(Object.keys(studentRes).sort(), ['groups', 'me', 'participantCount', 'room']);
  assert.equal(studentRes.participantCount, 4);
  assert.deepEqual(studentRes.me, { id: 'part-s1', name: 'Dafano', groupId: 'group-1' });
  assert.equal(studentRes.groups.length, 1);
  assert.equal(studentRes.groups[0].id, 'group-1');
  assert.equal(studentRes.groups[0].members.length, 2);
  assert.equal('participants' in studentRes, false);
  assert.equal('pin' in studentRes.room, false);
  assert.equal('aiEnabled' in studentRes.room, false);
  const studentJson = JSON.stringify(studentRes);
  assert.equal(studentJson.includes('Bima'), false, 'Siswa tidak boleh melihat anggota kelompok lain');
  assert.equal(studentJson.includes('GURU-SECRET'), false);
  assert.equal(studentJson.includes('secret.sch.id'), false);
  assert.equal(studentJson.includes('Rahasia'), false);
  assert.equal(studentJson.includes('Chat rahasia'), false);

  // 5. Guru menerima seluruh data kelas & kelompok, tetap tanpa data sensitif
  const teacherRes: any = await getRoomDetail('part-guru-1', '123456', prisma);
  assert.deepEqual(Object.keys(teacherRes).sort(), ['groups', 'participants', 'room']);
  assert.equal(teacherRes.room.pin, '123456');
  assert.equal(teacherRes.room.aiEnabled, true);
  assert.equal(teacherRes.participants.length, 4);
  assert.equal(teacherRes.groups.length, 2);
  assert.equal(teacherRes.groups[0].members.length, 2);
  assert.equal(teacherRes.groups[1].members.length, 1);
  const teacherJson = JSON.stringify(teacherRes);
  assert.equal(teacherJson.includes('GURU-SECRET'), false);
  assert.equal(teacherJson.includes('secret.sch.id'), false);
  assert.equal(teacherJson.includes('Rahasia'), false);
  assert.equal(teacherJson.includes('Chat rahasia'), false);

  console.log('ALL room-detail TESTS PASSED (5/5)');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
