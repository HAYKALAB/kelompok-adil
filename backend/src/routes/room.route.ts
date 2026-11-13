import { Router } from 'express';
import {
  createRoomHandler,
  getRoomDetailHandler,
  splitRoomGroupsHandler,
  getRoomLobbyHandler,
  lockStudentGroupHandler,
  joinStudentGroupHandler,
} from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const roomRouter = Router();

roomRouter.post('/rooms', authMiddleware, createRoomHandler);
roomRouter.get('/rooms/:pin', authMiddleware, getRoomDetailHandler);
roomRouter.get('/rooms/:pin/lobby', authMiddleware, getRoomLobbyHandler);
roomRouter.post('/rooms/:pin/groups/split', authMiddleware, splitRoomGroupsHandler);
roomRouter.post('/rooms/:pin/groups/lock', authMiddleware, lockStudentGroupHandler);
roomRouter.post('/groups/:groupId/join', authMiddleware, joinStudentGroupHandler);