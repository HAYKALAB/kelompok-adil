import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getRoomProgress } from '../services/progress-monitor.service.js';

export async function getRoomProgressHandler(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const result = await getRoomProgress(
    requester.id,
    requester.role,
    String(req.params.roomId)
  );
  res.status(200).json({ data: result });
}
