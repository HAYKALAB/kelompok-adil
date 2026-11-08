import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.routes.js';
import { authStub } from './middleware/auth.middleware.js';
import { LlmClient } from './modules/ai/llm.client.js';
import { sendData, sendError } from './lib/response.js';

// Muat variabel environment
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware umum
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Middleware otentikasi stub (membaca header x-user-id dan x-role)
app.use(authStub);

// Endpoint Health Check sesuai kontrak docs/api.md
app.get('/api/ai/health', (_req: Request, res: Response) => {
  sendData(res, {
    service: 'Backend 2 (AI Engine Service - Kelompok Adil)',
    status: 'ready',
    port,
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
    console.log(
      `💡 Mode Mock AI: ${LlmClient.isMockMode() ? 'AKTIF (Offline-Ready)' : 'NON-AKTIF (Live Gemini SDK)'}`
    );
    console.log('----------------------------------------------------');
  });
}

export default app;
