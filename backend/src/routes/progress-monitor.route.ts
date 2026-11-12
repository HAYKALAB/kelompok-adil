import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getRoomProgressHandler } from '../controllers/progress-monitor.controller.js';

export const progressMonitorRouter = Router();

progressMonitorRouter.use(authMiddleware);
progressMonitorRouter.get('/rooms/:roomId/progress', getRoomProgressHandler);
