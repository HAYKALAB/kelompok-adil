import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.routes.js';
import { authMiddleware, getAuthMode } from './middleware/auth.middleware.js';
import { LlmClient } from './modules/ai/llm.client.js';
import { sendData, sendError } from './lib/response.js';

// Muat variabel environment
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

/**
 * Validasi aturan startup terkait otentikasi dan integritas konfigurasi.
 * Menolak server menyala bila terdapat inkonsistensi keamanan.
 */
export function validateAuthStartup(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const authMode = getAuthMode();
  const repoMode = (process.env.REPO_MODE || 'stub').toLowerCase().trim();

  // 1. Jika production dan AUTH_MODE === 'stub', server menolak start
  if (nodeEnv === 'production' && authMode === 'stub') {
    console.error('❌ [FATAL] Mode otentikasi stub (AUTH_MODE=stub) dilarang pada environment production.');
    console.error('💡 Gunakan AUTH_MODE=jwt dan pastikan JWT_SECRET terkonfigurasi dengan benar.');
    process.exit(1);
  }

  // 2. Pada mode JWT, JWT_SECRET wajib ada dan minimal 16 karakter
  if (authMode === 'jwt') {
    const secret = process.env.JWT_SECRET || '';
    if (!secret || secret.length < 16) {
      console.error('❌ [FATAL] JWT_SECRET wajib diisi dan minimal 16 karakter pada mode AUTH_MODE=jwt.');
      console.error('💡 Pastikan JWT_SECRET diisi sama persis dengan rahasia signing milik Backend 1.');
      process.exit(1);
    }

    // 3. Peringatan ketidakcocokan data jika AUTH_MODE=jwt dipasangkan dengan REPO_MODE=stub
    if (repoMode === 'stub' && nodeEnv !== 'test') {
      console.warn('⚠️ [PERINGATAN] Server berjalan dengan AUTH_MODE=jwt tetapi REPO_MODE=stub.');
      console.warn('⚠️ ID peserta dari token JWT tidak akan ditemukan pada data stub in-memory, sehingga endpoint kelompok akan menolak akses.');
      console.warn('⚠️ Direkomendasikan menyalakan REPO_MODE=db saat AUTH_MODE=jwt aktif.');
    }
  }
}

// Jalankan validasi startup di luar environment test
if (process.env.NODE_ENV !== 'test') {
  validateAuthStartup();
}

// Middleware umum
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Middleware otentikasi adaptif (mendukung JWT Bearer dan fallback stub dev)
app.use(authMiddleware);

// Endpoint Health Check sesuai kontrak docs/api.md
app.get('/api/ai/health', (_req: Request, res: Response) => {
  sendData(res, {
    service: 'Backend 2 (AI Engine Service - Kelompok Adil)',
    status: 'ready',
    port,
    authMode: getAuthMode(),
    mockMode: LlmClient.isMockMode(),
    model: LlmClient.getModel(),
    timestamp: new Date().toISOString(),
  });
});

// Daftarkan rute utama modul AI dengan prefix /api/ai
app.use('/api/ai', aiRoutes);

// Handler 404 untuk rute tak ditemukan
app.use((_req: Request, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
});

// Error handler terpusat (Express 5)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status >= 500
      ? 'Terjadi kesalahan internal pada server AI.'
      : err.message || 'Permintaan gagal diproses.';

  sendError(res, status, code, message);
});

// Jalankan server jika dijalankan langsung
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log('----------------------------------------------------');
    console.log(`🤖 Backend 2 (AI Engine) aktif di port ${port}`);
    console.log(`📡 URL Health Check: http://localhost:${port}/api/ai/health`);
    console.log(`🔒 Mode Otentikasi: ${getAuthMode().toUpperCase()}`);
    console.log(
      `💡 Mode Mock AI: ${LlmClient.isMockMode() ? 'AKTIF (Offline-Ready)' : 'NON-AKTIF (Live Gemini SDK)'}`
    );
    console.log('----------------------------------------------------');
  });
}

export default app;
