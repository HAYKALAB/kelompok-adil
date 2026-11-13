import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { updateTaskProgress } from '../services/task-progress.service.js';

export const updateProgressSchema = z.object({
  progress: z
    .number()
    .int('Persen progres harus berupa bilangan bulat.')
    .min(0, 'Persen progres minimal 0.')
    .max(100, 'Persen progres maksimal 100.'),
  note: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').optional(),
});

export async function patchTaskProgress(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const input = updateProgressSchema.parse(req.body);
  const updated = await updateTaskProgress(
    requester.id,
    requester.role,
    String(req.params.taskId),
    input
  );
  res.status(200).json({ data: updated });
}
