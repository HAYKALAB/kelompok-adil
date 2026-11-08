import { Request, Response, NextFunction } from 'express';
import { checkDatabaseConnection } from '../services/health.service.js';

export async function getHealthStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isDbConnected = await checkDatabaseConnection();

    if (isDbConnected) {
      res.status(200).json({
        status: 'ok',
        db: 'connected',
      });
      return;
    }

    res.status(503).json({
      status: 'ok',
      db: 'error',
    });
  } catch (error) {
    next(error);
  }
}
