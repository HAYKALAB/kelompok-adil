import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { listRoomPeerReports, submitPeerReport } from '../services/peer-report.service.js';

const submitReportSchema = z.object({
  reportedId: z.string().trim().min(1, 'Anggota yang dilaporkan wajib dipilih.'),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(1, 'Alasan laporan wajib diisi.').max(300),
});

export async function postGroupReport(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  // reporterId selalu berasal dari token (req.user.id), input body tidak dibaca
  const input = submitReportSchema.parse(req.body);
  const result = await submitPeerReport(
    requester.id,
    requester.role,
    String(req.params.groupId),
    input
  );
  res.status(201).json({ data: result });
}

export async function getRoomReports(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const reports = await listRoomPeerReports(
    requester.id,
    requester.role,
    String(req.params.roomId)
  );
  res.status(200).json({ data: reports });
}
