import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { patchTaskProgress } from '../controllers/task-progress.controller.js';

export const taskProgressRouter = Router();

taskProgressRouter.use(authMiddleware);
taskProgressRouter.patch('/tasks/:taskId/progress', patchTaskProgress);
