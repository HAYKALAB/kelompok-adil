import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getGroupMessages, createGroupMessage } from '../controllers/message.controller.js';

export const messageRouter = Router();

messageRouter.use(authMiddleware);
messageRouter.get('/groups/:groupId/messages', getGroupMessages);
messageRouter.post('/groups/:groupId/messages', createGroupMessage);
