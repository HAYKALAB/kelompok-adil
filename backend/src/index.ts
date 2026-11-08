import express from 'express';
import cors from 'cors';
import { env } from './lib/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute API dengan prefix /api
app.use('/api', apiRouter);

// Penanganan 404 dan Error terpusat
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`[Backend] Server berjalan di http://localhost:${env.PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[Backend] SIGTERM diterima, menutup server secara anggun...');
  server.close(() => {
    process.exit(0);
  });
});
