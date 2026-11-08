import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { databaseUrlProblem, env } from './env.js';

let instance: PrismaClient | null = null;

/**
 * Prisma client, dibuat saat pertama dipakai. Kalau DATABASE_URL kosong atau bukan URL PostgreSQL,
 * fungsi ini melempar pesan jelas tanpa rahasia — tidak ada connection string karangan — supaya
 * Prisma CLI dan pemanggil lain gagal dengan lantang, bukan diam-diam menyambung ke tempat salah.
 */
export function getPrisma(): PrismaClient {
  if (instance) return instance;
  const problem = databaseUrlProblem();
  if (problem) throw new Error(`[prisma] ${problem}`);
  instance = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  return instance;
}
