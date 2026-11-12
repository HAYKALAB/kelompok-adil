import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';

export type TaskBoardPrisma = ReturnType<typeof getPrisma>;

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  weight?: number;
  deadline?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  weight?: number;
  deadline?: string | null;
}

async function getParticipantOrFail(prisma: TaskBoardPrisma, requesterId: string) {
  const participant = await prisma.roomParticipant.findUnique({
    where: { id: requesterId },
  });
  if (!participant) {
    throw new AppError(403, 'FORBIDDEN', 'Partisipan tidak ditemukan pada kelas mana pun.');
  }
  return participant;
}

async function assertAssigneeInGroup(
  prisma: TaskBoardPrisma,
  groupId: string,
  assigneeId: string
): Promise<void> {
  const assignee = await prisma.roomParticipant.findUnique({
    where: { id: assigneeId },
  });
  if (!assignee || assignee.role !== 'STUDENT' || assignee.groupId !== groupId) {
    throw new AppError(400, 'INVALID_ASSIGNEE', 'Penanggung jawab harus siswa anggota kelompok yang sama.');
  }
}

function parseOptionalDeadline(deadline: string | null | undefined): Date | null | undefined {
  if (deadline === undefined) return undefined;
  if (deadline === null) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Format tanggal tenggat (deadline) tidak valid.');
  }
  return parsed;
}

export async function listGroupTasks(
  requesterId: string,
  requesterRole: string,
  groupId: string,
  prisma: TaskBoardPrisma = getPrisma()
) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AppError(404, 'GROUP_NOT_FOUND', 'Kelompok tidak ditemukan.');
  }

  const participant = await getParticipantOrFail(prisma, requesterId);

  const isSameClassTeacher =
    requesterRole === 'TEACHER' &&
    participant.role === 'TEACHER' &&
    participant.roomId === group.roomId;

  const isGroupMember =
    requesterRole === 'STUDENT' &&
    participant.role === 'STUDENT' &&
    participant.roomId === group.roomId &&
    participant.groupId === groupId;

  if (!isSameClassTeacher && !isGroupMember) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Hanya anggota kelompok atau guru kelas yang sama yang dapat melihat daftar tugas.'
    );
  }

  return prisma.task.findMany({
    where: { groupId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createGroupTask(
  requesterId: string,
  requesterRole: string,
  groupId: string,
  input: CreateTaskInput,
  prisma: TaskBoardPrisma = getPrisma()
) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AppError(404, 'GROUP_NOT_FOUND', 'Kelompok tidak ditemukan.');
  }

  const participant = await getParticipantOrFail(prisma, requesterId);
  if (
    requesterRole !== 'STUDENT' ||
    participant.role !== 'STUDENT' ||
    participant.roomId !== group.roomId ||
    participant.groupId !== groupId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya anggota kelompok yang dapat membuat tugas baru.');
  }

  if (input.assigneeId) {
    await assertAssigneeInGroup(prisma, groupId, input.assigneeId);
  }

  const deadlineDate = parseOptionalDeadline(input.deadline);

  const task = await prisma.task.create({
    data: {
      groupId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      weight: input.weight ?? 1,
      deadline: deadlineDate ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      groupId,
      memberId: participant.id,
      type: 'LOG',
      description: `Membuat tugas baru: ${task.title}`,
    },
  });

  return task;
}

export async function updateGroupTask(
  requesterId: string,
  requesterRole: string,
  taskId: string,
  input: UpdateTaskInput,
  prisma: TaskBoardPrisma = getPrisma()
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Tugas tidak ditemukan.');
  }

  const participant = await getParticipantOrFail(prisma, requesterId);
  if (
    requesterRole !== 'STUDENT' ||
    participant.role !== 'STUDENT' ||
    participant.groupId !== task.groupId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya anggota kelompok tugas ini yang dapat mengubah tugas.');
  }

  if (input.assigneeId !== undefined && input.assigneeId !== null) {
    await assertAssigneeInGroup(prisma, task.groupId, input.assigneeId);
  }

  const deadlineDate = parseOptionalDeadline(input.deadline);

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
  if (input.weight !== undefined) data.weight = input.weight;
  if (deadlineDate !== undefined) data.deadline = deadlineDate;

  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Minimal satu field tugas harus diisi untuk diperbarui.');
  }

  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}
