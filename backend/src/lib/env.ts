import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/.+/i;

/**
 * Alasan DATABASE_URL tidak bisa dipakai, atau null kalau bisa dipakai.
 * Pesannya aman ditampilkan: tidak pernah memuat isi URL itu sendiri.
 */
export function databaseUrlProblem(): string | null {
  if (!env.DATABASE_URL.trim()) {
    return 'DATABASE_URL belum diisi. Salin backend/.env.example ke backend/.env lalu isi connection string PostgreSQL.';
  }
  if (!POSTGRES_URL_PATTERN.test(env.DATABASE_URL)) {
    return 'DATABASE_URL bukan URL PostgreSQL yang valid (harus diawali postgresql:// atau postgres://).';
  }
  return null;
}
