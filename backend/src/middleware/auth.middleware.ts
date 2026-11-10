import { Request, Response, NextFunction } from 'express';
import { verifySession } from '../lib/jwt.js';
import { AppError } from '../lib/app-error.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: 'STUDENT' | 'TEACHER' };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Token tidak ditemukan.'));
    return;
  }

  try {
    const session = verifySession(header.slice(7));
    req.user = { id: session.id, role: session.role };
    next();
  } catch (error) {
    next(error);
  }
}
