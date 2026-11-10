import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { AppError } from './app-error.js';

export interface SessionPayload {
  id: string;
  role: 'STUDENT' | 'TEACHER';
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifySession(token: string): SessionPayload {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token tidak valid atau sudah kedaluwarsa.');
  }

  const session = decoded as SessionPayload;
  if (
    typeof session?.id !== 'string' ||
    (session.role !== 'STUDENT' && session.role !== 'TEACHER')
  ) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token tidak valid.');
  }
  return session;
}
