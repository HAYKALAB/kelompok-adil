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

interface FakeGroup {
  id: string;
  roomId: string;
  groupNumber: number;
  name: string;
}

interface FakeRoom {
  id: string;
  pin: string;
  title: string;
  subject: string;
  className: string;
  targetGroups: number;
}

function createLobbyPrismaMock() {
  const rooms: FakeRoom[] = [
    {
      id: 'room-1',
      pin: '777888',
      title: 'Fisika Kuantum',
      subject: 'Fisika',
      className: 'XII-IPA-1',
      targetGroups: 3,
    },
  ];

  const participants: FakeParticipant[] = [
    {
      id: 'student-1',
      roomId: 'room-1',
      name: 'Budi Santoso',
      role: 'STUDENT',
      groupId: null,
      joinedAt: new Date(2026, 10, 13, 10, 0),
    },
    {
      id: 'student-2',
      roomId: 'room-1',
      name: 'Siti Rahma',
      role: 'STUDENT',
      groupId: null,
      joinedAt: new Date(2026, 10, 13, 10, 5),
    },
    {
      id: 'student-3',
      roomId: 'room-1',
      name: 'Ahmad Dahlan',
      role: 'STUDENT',
      groupId: null,
      joinedAt: new Date(2026, 10, 13, 10, 10),
    },
    {
      id: 'outsider',
      roomId: 'other-room',
      name: 'Orang Luar',
      role: 'STUDENT',
      groupId: null,
      joinedAt: new Date(),
    },
  ];

  const groups: FakeGroup[] = [];

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
        return participants.find((p) => p.id === where.id) ?? null;
      },
      findMany: async ({ where }: any) => {
        let result = participants.filter((p) => {
          if (where.roomId && p.roomId !== where.roomId) return false;
          if (where.role && p.role !== where.role) return false;
          if (where.groupId && p.groupId !== where.groupId) return false;
          return true;
        });
        return result.map((p) => {
          const g = groups.find((grp) => grp.id === p.groupId);
          return {
            ...p,
            group: g ? { id: g.id, name: g.name, groupNumber: g.groupNumber } : null,
          };
        });
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const p of participants) {
          if (where.id?.in && !where.id.in.includes(p.id)) continue;
          if (where.roomId && p.roomId !== where.roomId) continue;
          if (data.groupId !== undefined) p.groupId = data.groupId;
          count++;
        }
        return { count };
      },
      update: async ({ where, data }: any) => {
        const p = participants.find((part) => part.id === where.id);
        if (!p) throw new Error('Participant not found');
        if (data.groupId !== undefined) p.groupId = data.groupId;
        return p;
      },
    },
    group: {
      findFirst: async ({ where }: any) => {
        const filtered = groups
          .filter((g) => g.roomId === where.roomId)
          .sort((a, b) => b.groupNumber - a.groupNumber);
        return filtered[0] ?? null;
      },
      findUnique: async ({ where }: any) => {
        const grp = groups.find((g) => g.id === where.id);
        if (!grp) return null;
        const members = participants.filter((p) => p.groupId === grp.id);
        return { ...grp, members };
      },
      findMany: async ({ where }: any) => {
        const filtered = groups.filter((g) => g.roomId === where.roomId);
        return filtered.map((g) => ({
          ...g,
          members: participants.filter((p) => p.groupId === g.id),
        }));
      },
      create: async ({ data }: any) => {
        const created: FakeGroup = {
          id: `grp-${groups.length + 1}`,
          roomId: data.roomId,
          groupNumber: data.groupNumber,
          name: data.name,
        };
        groups.push(created);
        return created;
      },
    },
  };

  return { mock, rooms, participants, groups };
}

async function runTests() {
  const { getRoomLobby, lockStudentGroup, joinStudentGroup } = await import('../services/room.service.js');

  console.log('🧪 Menjalankan test Student Lobby & Group Selection...');

  // Test 1: Siswa yang tidak terdaftar di kelas mendapat 403
  {
    const { mock } = createLobbyPrismaMock();
    await assert.rejects(
      async () => getRoomLobby('outsider', '777888', mock as any),
      (err: any) => err.statusCode === 403
    );
    console.log('  ✓ Test 1: Peserta luar kelas ditolak 403');
  }

  // Test 2: PIN salah menghasilkan 404
  {
    const { mock } = createLobbyPrismaMock();
    await assert.rejects(
      async () => getRoomLobby('student-1', '000000', mock as any),
      (err: any) => err.statusCode === 404
    );
    console.log('  ✓ Test 2: PIN kelas salah ditolak 404');
  }

  // Test 3: getRoomLobby mengembalikan daftar siswa dan pemanggil
  {
    const { mock } = createLobbyPrismaMock();
    const lobby = await getRoomLobby('student-1', '777888', mock as any);
    assert.equal(lobby.caller.id, 'student-1');
    assert.equal(lobby.students.length, 3);
    assert.equal(lobby.students[0].inGroup, false);
    assert.equal(lobby.groups.length, 0);
    console.log('  ✓ Test 3: getRoomLobby mengembalikan data roster siswa di lobi');
  }

  // Test 4: Siswa mengunci kelompok (lockStudentGroup)
  {
    const { mock } = createLobbyPrismaMock();
    const res = await lockStudentGroup('student-1', '777888', '🚀 Tim Roket', ['student-2'], mock as any);
    assert.equal(res.group.name, '🚀 Tim Roket');
    assert.equal(res.group.groupNumber, 1);
    assert.equal(res.group.members.length, 2);

    // Verifikasi pemanggil sekarang punya kelompok
    const lobbyAfter = await getRoomLobby('student-1', '777888', mock as any);
    assert.equal(lobbyAfter.caller.groupId, res.group.id);
    assert.equal(lobbyAfter.groups.length, 1);
    assert.equal(lobbyAfter.groups[0].memberCount, 2);
    console.log('  ✓ Test 4: Siswa berhasil mengunci kelompok & anggota terdaftar');
  }

  // Test 5: Siswa lain bergabung ke kelompok yang sudah ada (joinStudentGroup)
  {
    const { mock } = createLobbyPrismaMock();
    const lockRes = await lockStudentGroup('student-1', '777888', '⚡ Tim Kilat', [], mock as any);
    const joinRes = await joinStudentGroup('student-3', lockRes.group.id, mock as any);
    assert.equal(joinRes.joined, true);
    assert.equal(joinRes.groupId, lockRes.group.id);

    const lobbyAfter = await getRoomLobby('student-3', '777888', mock as any);
    assert.equal(lobbyAfter.caller.groupId, lockRes.group.id);
    assert.equal(lobbyAfter.groups[0].memberCount, 2);
    console.log('  ✓ Test 5: Siswa lain berhasil gabung kelompok yang ada');
  }

  console.log('✅ SEMUA TEST STUDENT LOBBY & GROUP SELECTION LOLOS (5/5)!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
