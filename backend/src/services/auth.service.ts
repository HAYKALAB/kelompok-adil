import { getPrisma } from '../lib/prisma.js';
import { signSession } from '../lib/jwt.js';
import { AppError } from '../lib/app-error.js';

export async function joinRoomAsStudent(pin: string, name: string) {
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({ where: { pin } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room tidak ditemukan.');
  }

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_name: { roomId: room.id, name } },
  });

  if (existing) {
    throw new AppError(409, 'NAME_ALREADY_USED', 'Nama sudah dipakai peserta lain.');
  }

  let participant;
  try {
    participant = await prisma.roomParticipant.create({
      data: { roomId: room.id, name, role: 'STUDENT' },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new AppError(409, 'NAME_ALREADY_USED', 'Nama sudah dipakai peserta lain.');
    }
    throw err;
  }

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
  // Kode guru tidak hangus: tidak ada cek usedAt, tidak ada cek expiresAt.
  // Ticket dibuat dengan expiresAt = null (tidak kedaluwarsa) dan reusable.

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_name: { roomId: room.id, name } },
  });
  // Sudah pernah login sebagai guru di room ini → login ulang saja (token baru)
  if (existing && existing.role === 'TEACHER') {
    return {
      participant: existing,
      token: signSession({ id: existing.id, role: existing.role }),
    };
  }
  // Nama dipakai peserta STUDENT → tolak
  if (existing) {
    throw new AppError(409, 'NAME_ALREADY_USED', 'Nama sudah dipakai peserta lain.');
  }

  const participant = await prisma.roomParticipant.create({
    data: { roomId: room.id, name, role: 'TEACHER', userId: room.teacherId },
  });

  return {
    participant,
    token: signSession({ id: participant.id, role: participant.role }),
  };
}

export async function registerTeacher(name: string) {
  const prisma = getPrisma();
  const existing = await prisma.user.findFirst({ where: { name } });
  if (existing && existing.role === 'TEACHER') {
    const token = signSession({ id: existing.id, role: 'TEACHER' });
    return { user: existing, token };
  }
  if (existing) {
    throw new AppError(409, 'NAME_ALREADY_USED', 'Nama sudah dipakai.');
  }

  const user = await prisma.user.create({
    data: { name, email: null, role: 'TEACHER' },
  });

  const token = signSession({ id: user.id, role: 'TEACHER' });
  return { user, token };
}
