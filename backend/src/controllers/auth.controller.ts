import { Request, Response } from 'express';
import { z } from 'zod';
import { joinRoomAsStudent, joinRoomAsTeacher, registerTeacher } from '../services/auth.service.js';

const joinSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const teacherLoginSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(6).max(64),
});

const registerTeacherSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function joinRoom(req: Request, res: Response): Promise<void> {
  const input = joinSchema.parse(req.body);
  const pin = String(req.params.pin);
  const result = await joinRoomAsStudent(pin, input.name);
  res.status(200).json({ data: result });
}

export async function teacherLogin(req: Request, res: Response): Promise<void> {
  const input = teacherLoginSchema.parse(req.body);
  const pin = String(req.params.pin);
  const result = await joinRoomAsTeacher(pin, input.name, input.code);
  res.status(200).json({ data: result });
}

export async function registerTeacherHandler(req: Request, res: Response): Promise<void> {
  const input = registerTeacherSchema.parse(req.body);
  const result = await registerTeacher(input.name);
  res.status(201).json({ data: result });
}
