import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { messageRouter } from './message.route.js';
import { roomRouter } from './room.route.js';
import { taskBoardRouter } from './task-board.route.js';
import { peerReportRouter } from './peer-report.route.js';
import { taskProgressRouter } from './task-progress.route.js';
import { progressMonitorRouter } from './progress-monitor.route.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use(authRouter);
apiRouter.use(messageRouter);
apiRouter.use(roomRouter);
apiRouter.use(taskBoardRouter);
apiRouter.use(peerReportRouter);
apiRouter.use(taskProgressRouter);
apiRouter.use(progressMonitorRouter);
