# kelompok-adil

Aplikasi manajemen kelompok adil untuk LOGICODIX 2026 (subtema Pendidikan): room kelas, kocok kelompok berimbang, Kanban tugas, unggah bukti tugas, laporan sejawat, chat kelompok dengan fasilitator AI, deteksi ghosting, dan dashboard guru.

## Struktur

- `backend/` — Backend 1 (port 4000): Express + TypeScript + Prisma + PostgreSQL (Neon). Schema, migrasi, seed, auth JWT, dan CRUD core.
- `backend-2/` — Backend 2 (port 5000): engine AI Gemini (chat fasilitator, kocok kelompok, analisis keadilan).
- `frontend/` — React + Vite (port 5173), proxy `/api` → 4000 dan `/api/ai` → 5000.

## Setup lokal

1. `npm install` di root (npm workspaces).
2. Salin `backend/.env.example` → `backend/.env`, lalu isi:
   - `DATABASE_URL` (pooled) dari Neon
   - `JWT_SECRET` (minimal 16 karakter)
   - `PORT=4000`, `CORS_ORIGIN=http://localhost:5173`
3. Dari `backend/`: `npm run prisma:migrate` lalu `npm run prisma:seed`.
4. `npm run dev` di root menjalankan backend, backend-2, dan frontend sekaligus.

## Penggunaan AI (dicatat sesuai Guidebook LOGICODIX 2026)

- AI coding assistant (Claude via Hermes Agent) dipakai untuk membantu fondasi: schema Prisma, migrasi, seed, boilerplate endpoint, dan konfigurasi Neon.
- Tim meninjau serta memverifikasi semua hasilnya (build, migrasi, seed, test endpoint end-to-end) sebelum commit.
- Tim bertanggung jawab penuh atas implementasi dan keamanan kode, termasuk kode yang dihasilkan AI.
- Layanan AI dalam produk: Google Gemini (`gemini-2.5-flash`) via backend-2 untuk fasilitator chat, kocok kelompok, dan analisis keadilan.

## Aturan commit

- Conventional Commit: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Commit rutin per fitur; dilarang bulk commit di akhir.
- Dilarang rewrite history setelah push (force push, rebase, squash).
- `.env` dan secret lain tidak pernah di-commit.

## Data demo

- Room demo: PIN `123456`, kode guru `GURU-DEMO-2026`, kode siswa `SISWA-MAJAPAHIT-01` s.d. `08` (lihat `backend/prisma/seed.ts`).
