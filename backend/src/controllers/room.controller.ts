import { Request, Response } from 'express';
import { z } from 'zod';
import { createRoom, getRoomDetail, splitRoomGroups as splitGroups } from '../services/room.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const createRoomSchema = z.object({
  title: z.string().trim().min(3).max(200),
  subject: z.string().trim().min(2).max(200).optional(),
  className: z.string().trim().min(2).max(100).optional(),
  targetGroups: z.number().int().min(1).max(20).optional(),
});

export async function createRoomHandler(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user || user.role !== 'TEACHER') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Hanya guru yang bisa membuat kelas.' } });
    return;
  }

  const body = createRoomSchema.parse(req.body);
  const result = await createRoom(
    user.id,
    body.title,
    body.subject,
    body.className,
    body.targetGroups
  );
  res.status(201).json({ data: result });
}

export async function splitRoomGroupsHandler(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user || user.role !== 'TEACHER') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Hanya guru yang bisa membagi kelompok.' } });
    return;
  }

  const pin = String(req.params.pin);
  const query = req.query as { count?: unknown };
  const count = typeof query.count === 'string' ? Number(query.count) : undefined;

  const result = await splitGroups(user.id, pin, count);
  res.status(200).json({ data: result });
}

export async function getRoomDetailHandler(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token tidak ditemukan.' } });
    return;
  }

  const pin = String(req.params.pin);
  const result = await getRoomDetail(user.id, pin);
  res.status(200).json({ data: result });
}
