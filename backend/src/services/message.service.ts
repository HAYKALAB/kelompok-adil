import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';

async function assertStudentMember(
  requesterId: string,
  requesterRole: string,
  groupId: string,
  action: string
) {
  if (requesterRole === 'TEACHER') {
    throw new AppError(403, 'FORBIDDEN_TEACHER', `Guru tidak dapat ${action} chat kelompok.`);
  }

  const prisma = getPrisma();
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AppError(404, 'GROUP_NOT_FOUND', 'Kelompok tidak ditemukan.');
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { id: requesterId },
  });
  if (!participant || participant.groupId !== groupId) {
    throw new AppError(
      403,
      'NOT_GROUP_MEMBER',
      'Hanya anggota kelompok ini yang dapat mengakses chat.'
    );
  }

  return participant;
}

export async function listGroupMessages(
  requesterId: string,
  requesterRole: string,
  groupId: string
) {
  await assertStudentMember(requesterId, requesterRole, groupId, 'membaca');

  const prisma = getPrisma();
  return prisma.groupMessage.findMany({
    where: {
      groupId,
      isAi: false,
      NOT: {
        action: { in: ['chat', 'ideas', 'split_roles', 'ai_chat', 'nudge', 'validation'] },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function sendGroupMessage(
  requesterId: string,
  requesterRole: string,
  groupId: string,
  content: string
) {
  const participant = await assertStudentMember(requesterId, requesterRole, groupId, 'mengirim');

  const prisma = getPrisma();
  return prisma.groupMessage.create({
    data: {
      groupId,
      senderName: participant.name,
      content,
      isAi: false,
      action: 'peer_chat',
    },
  });
}
