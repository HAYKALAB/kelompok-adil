import 'dotenv/config';
import { getPrisma } from '../src/lib/prisma.js';

async function main() {
  const prisma = getPrisma();

  console.log('Menjalankan seed database...');

  // Upsert berdasarkan email (unik): aman dijalankan berulang, tidak menghapus data apa pun.
  const sampleUsers = [
    { name: 'Ahmad Siswa', email: 'ahmad@hackathon.edu', role: 'STUDENT' as const },
    { name: 'Budi Santoso', email: 'budi@hackathon.edu', role: 'STUDENT' as const },
    { name: 'Siti Guru', email: 'siti@hackathon.edu', role: 'TEACHER' as const },
  ];

  for (const user of sampleUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: user,
    });
  }

  const total = await prisma.user.count();
  console.log(`Seed selesai. Total User di database: ${total}`);
}

main()
  .catch((error) => {
    console.error('Gagal menjalankan seed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // getPrisma() melempar lagi kalau DATABASE_URL tidak valid; abaikan saat menutup.
    }
  });
