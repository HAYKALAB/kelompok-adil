import { Router } from 'express';
import { joinRoom, teacherLogin } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/rooms/:pin/join', joinRoom);
authRouter.post('/rooms/:pin/teacher-login', teacherLogin);
