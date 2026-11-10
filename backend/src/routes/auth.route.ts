import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { joinRoom, teacherLogin, registerTeacherHandler } from '../controllers/auth.controller.js';

export const authRouter = Router();

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan join. Coba lagi nanti.' } },
});

authRouter.post('/rooms/:pin/join', joinLimiter, joinRoom);
authRouter.post('/rooms/:pin/teacher-login', joinLimiter, teacherLogin);
authRouter.post('/teachers/register', registerTeacherHandler);
