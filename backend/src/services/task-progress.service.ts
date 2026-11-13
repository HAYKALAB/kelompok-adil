import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';

export type TaskProgressPrisma = ReturnType<typeof getPrisma>;

export interface UpdateTaskProgressInput {
  progress: number;
  note?: string;
}

export function resolveTaskStatusByProgress(progress: number): {
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  doneAt: Date | null;
} {
  if (progress === 0) {
    return { status: 'TODO', doneAt: null };
  }
  if (progress === 100) {
    return { status: 'DONE', doneAt: new Date() };
  }
  return { status: 'IN_PROGRESS', doneAt: null };
}

export async function updateTaskProgress(
  requesterId: string,
  requesterRole: string,
  taskId: string,
  input: UpdateTaskProgressInput,
  prisma: TaskProgressPrisma = getPrisma()
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Tugas tidak ditemukan.');
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { id: requesterId },
  });

  if (
    !participant ||
    requesterRole !== 'STUDENT' ||
    participant.role !== 'STUDENT' ||
    participant.groupId !== task.groupId ||
    task.assigneeId !== participant.id
  ) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Hanya penanggung jawab tugas ini yang dapat memperbarui progres.'
    );
  }

  const { status, doneAt } = resolveTaskStatusByProgress(input.progress);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      progress: input.progress,
      status,
      doneAt,
    },
  });

  const noteSuffix = input.note ? ` (${input.note})` : '';
  await prisma.activity.create({
    data: {
      groupId: task.groupId,
      memberId: participant.id,
      type: 'LOG',
      description: `Progres tugas "${task.title}" diperbarui menjadi ${input.progress}%${noteSuffix}`,
    },
  });

  return updated;
}
