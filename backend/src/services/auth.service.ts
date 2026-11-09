import { getPrisma } from '../lib/prisma.js';
import { signSession } from '../lib/jwt.js';
import { AppError } from '../lib/app-error.js';

export async function joinRoomAsStudent(pin: string, name: string) {
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({ where: { pin } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }

  const participant = await prisma.roomParticipant.upsert({
    where: { roomId_name: { roomId: room.id, name } },
    update: {},
    create: { roomId: room.id, name, role: 'STUDENT' },
  });

  return {
    participant,
    token: signSession({ id: participant.id, role: participant.role }),
  };
}

export async function joinRoomAsTeacher(pin: string, name: string, code: string) {
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({ where: { pin } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }

  const ticket = await prisma.teacherCodeTicket.findUnique({ where: { code } });
  if (!ticket || ticket.roomId !== room.id) {
    throw new AppError(401, 'INVALID_TEACHER_CODE', 'Kode guru tidak valid.');
  }
  if (ticket.usedAt) {
    throw new AppError(403, 'TEACHER_CODE_USED', 'Kode guru sudah digunakan.');
  }
  if (ticket.expiresAt && new Date(ticket.expiresAt).getTime() < Date.now()) {
    throw new AppError(403, 'TEACHER_CODE_EXPIRED', 'Kode guru sudah kedaluwarsa.');
  }

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_name: { roomId: room.id, name } },
  });
  if (existing && existing.role !== 'TEACHER') {
    throw new AppError(409, 'NAME_ALREADY_USED', 'Nama sudah dipakai peserta lain.');
  }

  await prisma.teacherCodeTicket.update({
    where: { code },
    data: { usedAt: new Date() },
  });

  const participant = await prisma.roomParticipant.upsert({
    where: { roomId_name: { roomId: room.id, name } },
    update: { role: 'TEACHER', userId: room.teacherId },
    create: { roomId: room.id, name, role: 'TEACHER', userId: room.teacherId },
  });

  return {
    participant,
    token: signSession({ id: participant.id, role: participant.role }),
  };
}
