import { Router } from 'express';
import { createRoomHandler, getRoomDetailHandler, splitRoomGroupsHandler } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const roomRouter = Router();

roomRouter.post('/rooms', authMiddleware, createRoomHandler);
roomRouter.get('/rooms/:pin', authMiddleware, getRoomDetailHandler);
roomRouter.post('/rooms/:pin/groups/split', authMiddleware, splitRoomGroupsHandler);