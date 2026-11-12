import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getRoomReports, postGroupReport } from '../controllers/peer-report.controller.js';

export const peerReportRouter = Router();

peerReportRouter.use(authMiddleware);
peerReportRouter.post('/groups/:groupId/reports', postGroupReport);
peerReportRouter.get('/rooms/:roomId/reports', getRoomReports);
