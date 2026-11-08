import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validasi input gagal',
        code: 'VALIDATION_ERROR',
        details: err.issues,
      },
    });
    return;
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message =
    statusCode === 500
      ? 'Terjadi kesalahan internal server'
      : err.message || 'Kesalahan permintaan';
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');

  res.status(statusCode).json({
    error: {
      message,
      code,
    },
  });
}
