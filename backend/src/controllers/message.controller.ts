import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';
import { listGroupMessages, sendGroupMessage } from '../services/message.service.js';

const sendSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export async function getGroupMessages(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const requester = authReq.user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }
  const messages = await listGroupMessages(requester.id, requester.role, String(req.params.groupId));
  res.status(200).json({ data: messages });
}

export async function createGroupMessage(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const requester = authReq.user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }
  const input = sendSchema.parse(req.body);
  const message = await sendGroupMessage(
    requester.id,
    requester.role,
    String(req.params.groupId),
    input.content
  );
  res.status(201).json({ data: message });
}
