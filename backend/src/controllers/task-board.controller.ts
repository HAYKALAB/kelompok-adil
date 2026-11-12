import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createGroupTask,
  listGroupTasks,
  updateGroupTask,
} from '../services/task-board.service.js';

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Judul tugas wajib diisi.').max(150),
  description: z.string().trim().max(500).nullable().optional(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  weight: z.number().int().min(1).max(100).optional(),
  deadline: z.string().trim().min(1).nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  weight: z.number().int().min(1).max(100).optional(),
  deadline: z.string().trim().min(1).nullable().optional(),
});

export async function getGroupTasks(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const tasks = await listGroupTasks(requester.id, requester.role, String(req.params.groupId));
  res.status(200).json({ data: tasks });
}

export async function postGroupTask(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const input = createTaskSchema.parse(req.body);
  const task = await createGroupTask(requester.id, requester.role, String(req.params.groupId), input);
  res.status(201).json({ data: task });
}

export async function patchTask(req: Request, res: Response): Promise<void> {
  const requester = (req as AuthenticatedRequest).user;
  if (!requester) {
    res.status(401).json({ error: { message: 'Token tidak ditemukan.', code: 'UNAUTHORIZED' } });
    return;
  }

  const input = updateTaskSchema.parse(req.body);
  const task = await updateGroupTask(requester.id, requester.role, String(req.params.taskId), input);
  res.status(200).json({ data: task });
}
