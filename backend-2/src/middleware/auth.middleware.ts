import { Request, Response, NextFunction } from 'express';
import { sendError } from '../lib/response.js';
import { repo } from '../deps/repository.stub.js';
import { verifySession } from '../lib/jwt.js';

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
 * serta mendukung alias kompatibilitas lama ('guru' dan 'murid') pada mode stub.
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
 * Mengambil mode otentikasi aktif:
 * - 'jwt': Verifikasi token Bearer JWT dari Backend 1 (default pada NODE_ENV === 'production').
 * - 'stub': Membaca header x-user-id dan x-role (hanya untuk dev dan test lokal).
 */
export function getAuthMode(): 'jwt' | 'stub' {
  const envMode = process.env.AUTH_MODE?.trim().toLowerCase();
  if (envMode === 'jwt' || envMode === 'stub') {
    return envMode;
  }
  return process.env.NODE_ENV === 'production' ? 'jwt' : 'stub';
}

/**
 * Middleware otentikasi utama Backend 2.
 * Mengadaptasi perilaku berdasarkan AUTH_MODE.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const mode = getAuthMode();

  if (mode === 'jwt') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Token otentikasi tidak ditemukan. Harap sertakan header Authorization: Bearer <token>.'
      );
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      sendError(res, 401, 'UNAUTHORIZED', 'Token otentikasi kosong.');
      return;
    }

    try {
      const session = verifySession(token);
      // Di mode JWT: abaikan x-role dan x-user-id sepenuhnya!
      req.user = {
        id: session.id,
        role: session.role,
      };
      next();
    } catch (err: any) {
      sendError(res, 401, 'UNAUTHORIZED', err.message || 'Token tidak valid atau sudah kedaluwarsa.');
      return;
    }
  } else {
    // Mode Stub: perilaku lama untuk dev dan test lokal
    const userId = (req.headers['x-user-id'] as string) || 'm-dafano';
    const rawRole = req.headers['x-role'] as string | undefined;

    req.user = {
      id: userId,
      role: normalizeRole(rawRole),
    };
    next();
  }
}

// Alias kompatibilitas
export const authStub = authMiddleware;

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
