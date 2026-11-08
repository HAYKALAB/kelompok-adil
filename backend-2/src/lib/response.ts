import { Response } from 'express';

/**
 * Mengirim respons sukses standar sesuai kontrak tim docs/api.md
 * Format: { "data": { ... } }
 */
export function sendData<T>(res: Response, data: T, status: number = 200): void {
  res.status(status).json({ data });
}

/**
 * Mengirim respons error terpusat sesuai kontrak tim docs/api.md
 * Format: { "error": { "code": "...", "message": "..." } }
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({
    error: {
      code,
      message,
    },
  });
}
