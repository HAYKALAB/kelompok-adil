import { getPrisma } from '../lib/prisma.js';
import { generateUniquePin, generateUniqueTeacherCode } from '../lib/random.js';
import { AppError } from '../lib/app-error.js';

export async function createRoom(
  teacherId: string,
  title: string,
  subject?: string,
  className?: string,
  targetGroups?: number
) {
  const prisma = getPrisma();
  const pin = await generateUniquePin();
  const code = await generateUniqueTeacherCode();
  const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 hari ke depan

  const room = await prisma.room.create({
    data: {
      pin,
      title,
      subject,
      className,
      aiEnabled: true,
      deadline,
      status: 'ACTIVE',
      targetGroups: targetGroups ?? 4,
      teacherId,
    },
  });

  // Create teacher code ticket — never expires (expiresAt = null) dan reusable
  await prisma.teacherCodeTicket.create({
    data: {
      code,
      roomId: room.id,
      teacherId,
      expiresAt: null, // tidak akan kedaluwarsa
    },
  });

  return {
    room,
    teacherCode: code,
    pin,
    isNewTeacherCode: true,
  };
}

export async function splitRoomGroups(teacherId: string, pin: string, count?: number) {
  const prisma = getPrisma();

  const room = await prisma.room.findUnique({ where: { pin } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }

  // Cek otorisasi: User ID pemilik room ATAU RoomParticipant dengan role TEACHER di room ini
  const isDirectOwner = room.teacherId === teacherId;
  const isParticipantTeacher = await prisma.roomParticipant.findFirst({
    where: {
      id: teacherId,
      roomId: room.id,
      role: 'TEACHER',
    },
  });

  if (!isDirectOwner && !isParticipantTeacher) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya guru pemilik kelas yang bisa membagi kelompok.');
  }

  const roomId = room.id;

  // Ambil peserta siswa (role STUDENT)
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId, role: 'STUDENT' },
    select: { id: true, name: true },
  });

  if (participants.length === 0) {
    throw new AppError(400, 'NO_STUDENTS', 'Belum ada siswa yang bergabung di kelas ini. Bagikan PIN kelas ke siswa terlebih dahulu.');
  }

  const requestedCount = count ?? 4;
  // Sesuaikan targetCount jika jumlah siswa lebih sedikit dari kelompok yang diminta
  const targetCount = Math.max(1, Math.min(requestedCount, participants.length));

  // 1. Clear existing participant group assignments
  await prisma.roomParticipant.updateMany({
    where: { roomId, groupId: { not: null } },
    data: { groupId: null },
  });

  // 2. Delete existing groups (cascade will handle tasks/activities/messages)
  await prisma.group.deleteMany({ where: { roomId } });

  // 3. Create N groups
  const groups = [];
  for (let i = 1; i <= targetCount; i++) {
    groups.push(
      await prisma.group.create({
        data: {
          roomId,
          groupNumber: i,
          name: `Kelompok ${i}`,
        },
      })
    );
  }

  // 4. Fisher-Yates shuffle participants
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  // 5. Assign participants round-robin to groups
  for (let i = 0; i < participants.length; i++) {
    const groupIndex = i % targetCount;
    await prisma.roomParticipant.update({
      where: { id: participants[i].id },
      data: { groupId: groups[groupIndex].id },
    });
  }

  // Return summary
  const groupAssignments = groups.map((g) => ({
    groupId: g.id,
    groupNumber: g.groupNumber,
    groupName: g.name,
    participantCount: 0, // will re-query if needed
  }));

  return {
    roomId,
    groups,
    targetCount,
    participantCount: participants.length,
    groupAssignments,
  };
}

export interface RoomDetailPrisma {
  room: {
    findUnique(args: any): Promise<any>;
  };
  roomParticipant: {
    findUnique(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args: any): Promise<number>;
  };
  group: {
    findMany(args: any): Promise<any[]>;
    findUnique(args: any): Promise<any>;
  };
}

export async function getRoomDetail(
  participantId: string,
  pin: string,
  prismaClient?: RoomDetailPrisma
) {
  const prisma = prismaClient ?? (getPrisma() as unknown as RoomDetailPrisma);

  const room = await prisma.room.findUnique({
    where: { pin },
    select: {
      id: true,
      pin: true,
      title: true,
      subject: true,
      className: true,
      aiEnabled: true,
      deadline: true,
      status: true,
    },
  });

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      roomId: true,
      name: true,
      role: true,
      groupId: true,
    },
  });

  if (!participant || participant.roomId !== room.id) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke kelas ini.');
  }

  if (participant.role === 'TEACHER') {
    const [participants, groups] = await Promise.all([
      prisma.roomParticipant.findMany({
        where: { roomId: room.id },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          name: true,
          role: true,
          groupId: true,
        },
      }),
      prisma.group.findMany({
        where: { roomId: room.id },
        orderBy: { groupNumber: 'asc' },
        select: {
          id: true,
          groupNumber: true,
          name: true,
          members: {
            orderBy: { joinedAt: 'asc' },
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      room: {
        id: room.id,
        pin: room.pin,
        title: room.title,
        subject: room.subject,
        className: room.className,
        aiEnabled: room.aiEnabled,
        deadline: room.deadline,
        status: room.status,
      },
      participants: participants.map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        groupId: p.groupId,
      })),
      groups: groups.map((g: any) => ({
        id: g.id,
        groupNumber: g.groupNumber,
        name: g.name,
        members: (g.members ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
        })),
      })),
    };
  }

  const [participantCount, ownGroup] = await Promise.all([
    prisma.roomParticipant.count({
      where: { roomId: room.id },
    }),
    participant.groupId
      ? prisma.group.findUnique({
          where: { id: participant.groupId },
          select: {
            id: true,
            roomId: true,
            groupNumber: true,
            name: true,
            members: {
              orderBy: { joinedAt: 'asc' },
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const groups =
    ownGroup && ownGroup.roomId === room.id
      ? [
          {
            id: ownGroup.id,
            groupNumber: ownGroup.groupNumber,
            name: ownGroup.name,
            members: (ownGroup.members ?? []).map((m: any) => ({
              id: m.id,
              name: m.name,
            })),
          },
        ]
      : [];

  return {
    room: {
      id: room.id,
      title: room.title,
      subject: room.subject,
      className: room.className,
      deadline: room.deadline,
      status: room.status,
    },
    participantCount,
    groups,
    me: {
      id: participant.id,
      name: participant.name,
      groupId: participant.groupId,
    },
  };
}