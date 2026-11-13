process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-local-jwt-secret-min-16-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

import assert from 'node:assert/strict';

interface FakeParticipant {
  id: string;
  roomId: string;
  name: string;
  role: 'STUDENT' | 'TEACHER';
  groupId: string | null;
  joinedAt: Date;
}

interface FakeRoom {
  id: string;
  pin: string;
  title: string;
}

interface FakeTicket {
  id: string;
  roomId: string;
  participantId: string;
  code: string;
  createdAt: Date;
}

function createAuthPrismaMock() {
  const rooms: FakeRoom[] = [
    { id: 'room-1', pin: '123456', title: 'Kelas Sejarah' },
  ];

  const participants: FakeParticipant[] = [
    {
      id: 'student-dafano',
      roomId: 'room-1',
      name: 'Dafano',
      role: 'STUDENT',
      groupId: 'grp-1',
      joinedAt: new Date(),
    },
  ];

  const tickets: FakeTicket[] = [
    {
      id: 'ticket-1',
      roomId: 'room-1',
      participantId: 'student-dafano',
      code: 'room-1:student-dafano:1234',
      createdAt: new Date(),
    },
  ];

  const mock = {
    room: {
      findUnique: async ({ where }: any) => {
        if (where.pin) return rooms.find((r) => r.pin === where.pin) ?? null;
        if (where.id) return rooms.find((r) => r.id === where.id) ?? null;
        return null;
      },
    },
    roomParticipant: {
      findUnique: async ({ where }: any) => {
        if (where.roomId_name) {
          return (
            participants.find(
              (p) =>
                p.roomId === where.roomId_name.roomId &&
                p.name.toLowerCase() === where.roomId_name.name.toLowerCase()
            ) ?? null
          );
        }
        if (where.id) return participants.find((p) => p.id === where.id) ?? null;
        return null;
      },
      create: async ({ data }: any) => {
        const created: FakeParticipant = {
          id: `student-${participants.length + 1}`,
          roomId: data.roomId,
          name: data.name,
          role: data.role || 'STUDENT',
          groupId: null,
          joinedAt: new Date(),
        };
        participants.push(created);
        return created;
      },
    },
    studentCodeTicket: {
      findFirst: async ({ where }: any) => {
        return (
          tickets.find(
            (t) => t.roomId === where.roomId && t.participantId === where.participantId
          ) ?? null
        );
      },
      create: async ({ data }: any) => {
        const created: FakeTicket = {
          id: `ticket-${tickets.length + 1}`,
          roomId: data.roomId,
          participantId: data.participantId,
          code: data.code,
          createdAt: new Date(),
        };
        tickets.push(created);
        return created;
      },
    },
  };

  return { mock, rooms, participants, tickets };
}

async function runTests() {
  const { joinRoomAsStudent } = await import('../services/auth.service.js');
  const { mock } = createAuthPrismaMock();

  console.log('🧪 Menjalankan test Student Personal PIN Security...');

  // Test 1: Dafano login ulang dengan PIN yang benar (1234) -> SUKSES
  const resDafano = await joinRoomAsStudent('123456', 'Dafano', '1234', mock as any);
  assert.equal(resDafano.participant.name, 'Dafano');
  assert.ok(resDafano.token);
  console.log('  ✓ Test 1: Siswa terdaftar login dengan PIN benar berhasil');

  // Test 2: Orang iseng ngetik Dafano tapi PIN salah (misal: 9999) -> DITOLAK 403
  await assert.rejects(
    async () => joinRoomAsStudent('123456', 'Dafano', '9999', mock as any),
    (err: any) => err.statusCode === 403 && err.code === 'INVALID_STUDENT_PIN'
  );
  console.log('  ✓ Test 2: Orang iseng login pakai nama Dafano PIN salah ditolak 403');

  // Test 3: Siswa baru pertama kali masuk tanpa PIN 4-digit -> DITOLAK 400
  await assert.rejects(
    async () => joinRoomAsStudent('123456', 'Budi Baru', '', mock as any),
    (err: any) => err.statusCode === 400 && err.code === 'INVALID_STUDENT_PIN'
  );
  console.log('  ✓ Test 3: Siswa baru tanpa 4-digit PIN ditolak 400');

  // Test 4: Siswa baru mendaftar dengan PIN 4-digit (misal: 4321) -> SUKSES
  const resBudi = await joinRoomAsStudent('123456', 'Budi Baru', '4321', mock as any);
  assert.equal(resBudi.participant.name, 'Budi Baru');
  console.log('  ✓ Test 4: Siswa baru mendaftar dengan 4-digit PIN berhasil');

  // Test 5: Budi login ulang dengan PIN 4321 -> SUKSES, dengan PIN salah -> DITOLAK
  const resBudiRelogin = await joinRoomAsStudent('123456', 'Budi Baru', '4321', mock as any);
  assert.equal(resBudiRelogin.participant.id, resBudi.participant.id);
  await assert.rejects(
    async () => joinRoomAsStudent('123456', 'Budi Baru', '1111', mock as any),
    (err: any) => err.statusCode === 403 && err.code === 'INVALID_STUDENT_PIN'
  );
  console.log('  ✓ Test 5: Budi login ulang diverifikasi PIN pribadinya');

  console.log('✅ SEMUA TEST STUDENT PERSONAL PIN SECURITY LOLOS (5/5)!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
