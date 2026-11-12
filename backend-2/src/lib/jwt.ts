import jwt from 'jsonwebtoken';

export interface SessionPayload {
  id: string;
  role: 'STUDENT' | 'TEACHER';
}

export class AuthError extends Error {
  public readonly status = 401;
  public readonly code = 'UNAUTHORIZED';

  constructor(message = 'Token tidak valid atau sudah kedaluwarsa.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Memverifikasi token JWT dari Backend 1 secara aman.
 * Wajib menggunakan algoritma HS256 untuk mencegah manipulasi header 'none'.
 * Jangan pernah mencetak token atau secret ke dalam log.
 */
export function verifySession(token: string, secretOverride?: string): SessionPayload {
  const secret = secretOverride || process.env.JWT_SECRET || '';
  if (!secret || secret.length < 16) {
    throw new AuthError('Konfigurasi otentikasi server belum memadai.');
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    throw new AuthError('Token tidak valid atau sudah kedaluwarsa.');
  }

  const session = decoded as SessionPayload;
  if (
    typeof session?.id !== 'string' ||
    session.id.trim() === '' ||
    (session.role !== 'STUDENT' && session.role !== 'TEACHER')
  ) {
    throw new AuthError('Token tidak valid: struktur payload tidak sesuai.');
  }

  return {
    id: session.id,
    role: session.role,
  };
}
