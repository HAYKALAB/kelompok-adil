import { getPrisma } from '../lib/prisma.js';

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Ping database dengan query raw sederhana. getPrisma() melempar pesan jelas kalau
    // DATABASE_URL kosong/tidak valid; keduanya diperlakukan sama: database belum siap.
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
