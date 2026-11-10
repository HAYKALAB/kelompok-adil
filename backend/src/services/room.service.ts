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
  const targetCount = count ?? 4;

  const room = await prisma.room.findUnique({ where: { pin } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }
  if (room.teacherId !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya guru pemilik kelas yang bisa membagi kelompok.');
  }

  const roomId = room.id;

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

  // 4. Get student participants (role STUDENT), shuffle randomly
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId, role: 'STUDENT' },
    select: { id: true, name: true },
  });

  // Fisher-Yates shuffle
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