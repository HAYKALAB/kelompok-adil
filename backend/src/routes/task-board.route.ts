import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getGroupTasks, patchTask, postGroupTask } from '../controllers/task-board.controller.js';

export const taskBoardRouter = Router();

taskBoardRouter.use(authMiddleware);
taskBoardRouter.get('/groups/:groupId/tasks', getGroupTasks);
taskBoardRouter.post('/groups/:groupId/tasks', postGroupTask);
taskBoardRouter.patch('/tasks/:taskId', patchTask);
