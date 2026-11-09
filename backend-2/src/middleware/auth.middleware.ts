import { Request, Response, NextFunction } from 'express';
import { sendError } from '../lib/response.js';
import { repo } from '../deps/repository.stub.js';

export type UserRole = 'STUDENT' | 'TEACHER';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Normalisasi role agar kompatibel dengan enum Prisma Backend 1 (STUDENT | TEACHER)
 * serta mendukung alias kompatibilitas lama ('guru' dan 'murid').
 */
function normalizeRole(rawRole: string | undefined): UserRole {
  if (!rawRole) return 'STUDENT';
  const cleaned = rawRole.trim().toUpperCase();
  if (cleaned === 'TEACHER' || cleaned === 'GURU') {
    return 'TEACHER';
  }
  return 'STUDENT';
}

/**
 * CATATAN ARSITEKTUR:
 * Ini adalah middleware stub otentikasi sementara untuk Backend 2.
 * Setelah Backend 1 menyelesaikan modul autentikasi (lihat docs/auth-plan.md),
 * middleware ini akan digantikan untuk memverifikasi token JWT/session asli dari Backend 1,
 * sementara bentuk objek `req.user` ({ id, role: 'STUDENT' | 'TEACHER' }) tetap dipertahankan.
 */
export function authStub(req: Request, _res: Response, next: NextFunction): void {
  const userId = (req.headers['x-user-id'] as string) || 'm-dafano';
  const rawRole = req.headers['x-role'] as string | undefined;

  req.user = {
    id: userId,
    role: normalizeRole(rawRole),
  };

  next();
}

/**
 * Guard otorisasi khusus: hanya pengguna dengan role TEACHER yang diizinkan.
 * Pengguna dengan role STUDENT akan ditolak HTTP 403 Forbidden.
 */
export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'TEACHER') {
    sendError(
      res,
      403,
      'FORBIDDEN_TEACHER_ONLY',
      'Akses ditolak: Endpoint ini hanya dapat diakses oleh Guru.'
    );
    return;
  }
  next();
}

/**
 * Guard otorisasi privasi percakapan chat kelompok:
 * 1. Guru ditolak HTTP 403 (FORBIDDEN_STUDENTS_ONLY): Guru tidak memiliki akses ke percakapan AI; hanya anggota kelompok yang bisa membacanya.
 * 2. Hanya siswa yang terdaftar sebagai anggota kelompok tersebut yang diizinkan (req.user.id in group.members).
 *    Siswa luar kelompok ditolak HTTP 403 (FORBIDDEN_GROUP_MEMBER_ONLY).
 */
export async function requireGroupStudentMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user || user.role === 'TEACHER') {
    sendError(
      res,
      403,
      'FORBIDDEN_STUDENTS_ONLY',
      'Akses ditolak: Guru tidak memiliki akses ke percakapan AI; hanya anggota kelompok yang bisa membacanya.'
    );
    return;
  }

  const rawGroupId = req.params.groupId;
  const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId || '';
  if (!groupId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'ID Kelompok diperlukan.');
    return;
  }

  const group = await repo.getGroup(groupId);
  if (!group) {
    sendError(res, 404, 'NOT_FOUND', `Kelompok dengan ID ${groupId} tidak ditemukan.`);
    return;
  }

  const isMember = group.members.some((m) => m.id === user.id);
  if (!isMember) {
    sendError(
      res,
      403,
      'FORBIDDEN_GROUP_MEMBER_ONLY',
      'Akses ditolak: Hanya anggota kelompok yang bersangkutan yang dapat mengakses percakapan obrolan ini.'
    );
    return;
  }

  next();
}
