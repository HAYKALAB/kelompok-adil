import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';
import { computeGroupProgressSummary, GroupProgressResult } from './progress-calc.js';

export type ProgressMonitorPrisma = ReturnType<typeof getPrisma>;

export interface RoomProgressResponse {
  roomId: string;
  groups: GroupProgressResult[];
}

export async function getRoomProgress(
  requesterId: string,
  requesterRole: string,
  roomId: string,
  prisma: ProgressMonitorPrisma = getPrisma()
): Promise<RoomProgressResponse> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Kelas tidak ditemukan.');
  }

  const teacher = await prisma.roomParticipant.findUnique({
    where: { id: requesterId },
  });
  if (
    !teacher ||
    requesterRole !== 'TEACHER' ||
    teacher.role !== 'TEACHER' ||
    teacher.roomId !== roomId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya guru kelas ini yang dapat memantau progres.');
  }

  const groups = await prisma.group.findMany({
    where: { roomId },
    orderBy: { groupNumber: 'asc' },
    include: {
      tasks: {
        select: {
          id: true,
          assigneeId: true,
          status: true,
          weight: true,
          progress: true,
          deadline: true,
        },
      },
      members: {
        where: { role: 'STUDENT' },
        orderBy: [{ joinedAt: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    roomId,
    groups: groups.map((g) => computeGroupProgressSummary(g, g.tasks, g.members)),
  };
}
