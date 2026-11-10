import { getPrisma } from './prisma.js';

const TEACHER_CODE_PREFIX = 'GURU-';
const PIN_LENGTH = 6;
const TEACHER_CODE_RANDOM_LENGTH = 6;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export async function generateUniquePin(): Promise<string> {
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await prisma.room.findUnique({ where: { pin }, select: { id: true } });
    if (!exists) return pin;
  }
  throw new Error('Gagal menghasilkan PIN unik setelah 10 percobaan');
}

export async function generateUniqueTeacherCode(): Promise<string> {
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${TEACHER_CODE_PREFIX}${randomString(TEACHER_CODE_RANDOM_LENGTH)}`;
    const exists = await prisma.teacherCodeTicket.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error('Gagal menghasilkan kode guru unik setelah 10 percobaan');
}