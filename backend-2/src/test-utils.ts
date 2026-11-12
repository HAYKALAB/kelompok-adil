import jwt from 'jsonwebtoken';
import type { SessionPayload } from './lib/jwt.js';

/**
 * Helper penandatanganan token JWT khusus untuk pengujian lokal (test-suite).
 * Tidak boleh diimpor oleh kode jalur produksi (route, controller, service, atau middleware).
 */
export function signSession(
  payload: SessionPayload,
  secretOverride?: string,
  options?: jwt.SignOptions
): string {
  const secret = secretOverride || process.env.JWT_SECRET || '';
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '7d',
    ...options,
  });
}
