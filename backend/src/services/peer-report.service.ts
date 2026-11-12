import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../lib/app-error.js';

export type PeerReportPrisma = ReturnType<typeof getPrisma>;

export interface SubmitPeerReportInput {
  reportedId: string;
  rating: number;
  feedback: string;
}

export async function submitPeerReport(
  requesterId: string,
  requesterRole: string,
  groupId: string,
  input: SubmitPeerReportInput,
  prisma: PeerReportPrisma = getPrisma()
): Promise<{ saved: true }> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AppError(404, 'GROUP_NOT_FOUND', 'Kelompok tidak ditemukan.');
  }

  const reporter = await prisma.roomParticipant.findUnique({
    where: { id: requesterId },
  });
  if (
    !reporter ||
    requesterRole !== 'STUDENT' ||
    reporter.role !== 'STUDENT' ||
    reporter.roomId !== group.roomId ||
    reporter.groupId !== groupId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Hanya siswa anggota kelompok ini yang dapat mengirim laporan.');
  }

  if (input.reportedId === reporter.id) {
    throw new AppError(400, 'INVALID_REPORTED_MEMBER', 'Tidak dapat melaporkan diri sendiri.');
  }

  const reported = await prisma.roomParticipant.findUnique({
    where: { id: input.reportedId },
  });
  if (!reported || reported.role !== 'STUDENT' || reported.groupId !== groupId) {
    throw new AppError(
      400,
      'INVALID_REPORTED_MEMBER',
      'Anggota yang dilaporkan harus siswa dari kelompok yang sama.'
    );
  }

  const existing = await prisma.peerReport.findFirst({
    where: {
      groupId,
      reporterId: reporter.id,
      reportedId: reported.id,
    },
  });

  if (existing) {
    await prisma.peerReport.update({
      where: { id: existing.id },
      data: {
        roomId: group.roomId,
        rating: input.rating,
        feedback: input.feedback,
      },
    });
  } else {
    await prisma.peerReport.create({
      data: {
        roomId: group.roomId,
        groupId,
        reporterId: reporter.id,
        reportedId: reported.id,
        rating: input.rating,
        feedback: input.feedback,
      },
    });
  }

  // Jangan catat ke activities & jangan kembalikan isi laporan atau identitas pelapor
  return { saved: true };
}

export async function listRoomPeerReports(
  requesterId: string,
  requesterRole: string,
  roomId: string,
  prisma: PeerReportPrisma = getPrisma()
) {
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
    throw new AppError(403, 'FORBIDDEN', 'Hanya guru kelas ini yang dapat melihat laporan rahasia.');
  }

  const reports = await prisma.peerReport.findMany({
    where: { roomId },
    include: {
      reporter: { select: { id: true, name: true } },
      reported: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reports.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    groupId: r.groupId,
    reporterId: r.reporterId,
    reporterName: r.reporter.name,
    reportedId: r.reportedId,
    reportedName: r.reported.name,
    rating: r.rating,
    feedback: r.feedback,
    createdAt: r.createdAt,
  }));
}
