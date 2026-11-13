# Kelompok Adil ✦

> **Platform Kolaborasi Cerdas & Transparansi Kerja Kelompok Berbasis AI Fasilitator**  
> *Kompetisi LOGICODIX 2026 — Subtema: Smart & Fun Education (Kategori: Web Application)*

---

## 👥 Informasi Tim

- **Nama Tim**: Kelompok Adil
- **Institusi**: [NAMA INSTITUSI / SEKOLAH / UNIVERSITAS]
- **Susunan Tim**:
  - **[NAMA ANGGOTA 1]** — Leader Tim & Fullstack Orchestrator
  - **[NAMA ANGGOTA 2]** — Frontend Developer (Client Pages & State Management)
  - **[NAMA ANGGOTA 3]** — UI/UX Designer (Design System Neo-Brutalism & UI Kit)
  - **[NAMA ANGGOTA 4]** — Backend 1 Developer (Database PostgreSQL, Prisma ORM & Core API)
  - **[NAMA ANGGOTA 5]** — Backend 2 Developer (AI Gemini SDK Engine, Prompt & Telemetry)

---

## 💡 Latar Belakang & Masalah

Kerja kelompok adalah metode pedagogis utama dalam kurikulum modern, namun kerap menimbulkan friksi dan ketidakadilan:
1. **Fenomena *Free Rider***: Ada anggota yang pasif atau "menghilang" (*ghosting*), namun tetap mendapatkan nilai yang sama dengan rekan yang bekerja keras.
2. **Beban Tidak Seimbang**: Pembagian tugas sering kali bias, tanpa acuan estimasi bobot kerja yang objektif.
3. **Keterbatasan Guru**: Guru kesulitan memantau dinamika proses di setiap kelompok secara objektif dan *real-time*. Mengawasi isi chat pribadi siswa melanggar ruang privasi, sementara hanya menilai produk akhir mengabaikan proses keadilan kerja.

### Solusi Kami: Kelompok Adil
**Kelompok Adil** menghadirkan ruang kolaborasi terpandu di mana:
- Pembagian peran dihitung seimbang secara deterministik atau dibantu **AI Fasilitator** (total bobot tepat 100%).
- Progres tugas diverifikasi lewat papan Kanban interaktif.
- Siswa dapat saling memberikan **evaluasi rahasia (*peer review*)** secara anonim tanpa takut diintimidasi.
- **Guru menerima telemetri keadilan kelas & peringatan dini *ghosting*** murni dari data tugas dan evaluasi anonim, tanpa pernah membaca obrolan pribadi antarsiswa.

---

## 🚀 Fitur Utama yang Berfungsi Penuh

| Fitur | Hak Akses | Deskripsi & Bukti Operasional |
|---|---|---|
| **Akses Ruang Kelas Instan** | Siswa & Guru | Masuk cepat tanpa registrasi rumit: Siswa cukup memasukkan Nama + PIN 6-digit; Guru masuk dengan Kode Unik Guru yang dapat digunakan berulang. |
| **Kocok & Bagi Kelompok Adil** | Guru | Pembagian kelompok merata otomatis (*auto-split*) langsung dari lobi kelas. |
| **Papan Kanban Interaktif** | Siswa | Pembaruan status tugas (*Todo*, *In Progress*, *Done*) dan progres persentase. Dilengkapi validasi keamanan (hanya penanggung jawab tugas yang berhak mengubah progres). |
| **AI Fasilitator & Curah Ide** | Siswa | Asisten AI berbasis Google Gemini untuk diskusi topik, brainstorming, dan panduan belajar kelompok. |
| **Usulan Peran Adil (*Role Splitting*)** | Siswa | AI mengusulkan pembagian peran spesifik dengan total bobot tepat 100% dan format luaran tugas. Dapat langsung diterapkan ke Kanban (*1-click apply*) atau dibatalkan. |
| **Laporan Rahasia Sejawat (*Peer Review*)** | Siswa | Siswa mengirimkan rating (1-5 ⭐) dan catatan refleksi performa rekan satu kelompok. Siswa lain tidak dapat melihat isi atau pengirim laporan ini. |
| **Chat Internal Kelompok** | Siswa | Obrolan terisolasi per kelompok untuk koordinasi tugas. Terlindungi (guru dan siswa kelompok lain ditolak 403). |
| **Dashboard Pemantauan Guru** | Guru | Pantau progres seluruh kelompok secara agregat, distribusi tugas per anggota, dan status penyelesaian tugas. |
| **Deteksi Tenggat & *Ghosting Alert*** | Guru | Peringatan dini otomatis dari sistem jika ada tugas terbengkalai melewati batas waktu, disampaikan dengan bahasa netral dan konstruktif. |
| **Audit Laporan Rahasia Guru** | Guru | Rekap menyeluruh laporan sejawat untuk mediasi dan objektivitas penilaian guru. |
| **Analisis Keadilan AI (*Fairness Score*)** | Guru | AI Gemini menganalisis suasana kerja kelas, memberikan skor keadilan (0-100), dan rekomendasi fasilitasi guru dengan identitas pelapor yang telah disamarkan. |

---

## 🏛️ Arsitektur Sistem & Alur Data

### 1. Diagram Arsitektur Multi-Service
```mermaid
flowchart TD
    subgraph Client ["Frontend Client (React 19 + Vite)"]
        UI["Soft Neo-Brutalism UI\nPort 5173"]
        ViteProxy["Vite Dev Proxy\n/api & /api/ai"]
    end

    subgraph CoreBackend ["Backend 1: Core API & Database"]
        B1["Express + TypeScript\nPort 4000"]
        Auth["JWT Authentication &\nRole Guard (STUDENT / TEACHER)"]
        Prisma["Prisma ORM"]
        DB[(Neon Serverless\nPostgreSQL)]
    end

    subgraph AIEngine ["Backend 2: AI Engine & Telemetry"]
        B2["Express + TypeScript\nPort 5000"]
        Sanitize["Sanitizer & De-anonymizer\nPrompt Guard"]
        GeminiSDK["Google GenAI SDK\n(gemini-2.5-flash)"]
        Fallback["Deterministic Engine\n(Offline Fallback)"]
    end

    UI -->|Requests| ViteProxy
    ViteProxy -->|/api/*| B1
    ViteProxy -->|/api/ai/*| B2

    B1 --> Auth
    Auth --> Prisma
    Prisma --> DB

    B2 --> Sanitize
    Sanitize --> GeminiSDK
    GeminiSDK -.->|Bila Quota / Cold Start| Fallback
    B2 -->|Query Data Read-Only| DB
```

### 2. Diagram Alur Privasi Data
```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa (Kelompok Majapahit)
    participant B1 as Backend 1 (Core DB)
    participant B2 as Backend 2 (AI Engine)
    actor Guru as Guru (Dashboard)

    Note over Siswa,B1: Siswa mengirim evaluasi sejawat
    Siswa->>B1: POST /api/groups/:groupId/reports (Rating & Feedback)
    B1-->>Siswa: 200 { saved: true } (Rahasia dari siswa lain)

    Note over Guru,B2: Guru meminta analisis keadilan kelas
    Guru->>B2: POST /api/ai/rooms/:roomId/analyze-fairness
    B2->>B1: Ambil data laporan rahasia
    B2->>B2: Samarkan nama & ID asli ("Budi" -> "Pelapor-1")
    B2->>B2: Bungkus prompt dalam tag <data> anti prompt-injection
    B2->>B2: Panggil Google Gemini (gemini-2.5-flash)
    B2-->>Guru: Skor Keadilan (0-100), Ringkasan Suasana & Saran Guru

    Note over Guru,B1: Guru dilarang mengintip obrolan siswa
    Guru->xB1: GET /api/groups/:groupId/messages -> 403 Forbidden
```

---

## 🤖 Dokumentasi Penggunaan AI (LOGICODIX 2026)

### A. Penggunaan AI Coding Assistant Selama Pengembangan
- Sesuai panduan lomba, asisten AI (Claude via Hermes Agent & Antigravity) digunakan untuk membantu perancangan fondasi awal: skema basis data Prisma, migrasi, konfigurasi environment, dan *boilerplate* endpoint.
- Seluruh kode telah ditinjau (*peer code review*), diuji dengan *automated test suite* (unit test & integrasi), dan divalidasi end-to-end oleh tim pengembang. Tim bertanggung jawab penuh atas kualitas kode dan keamanan repositori.

### B. Implementasi AI dalam Produk (Google Gemini)
- **Model**: `gemini-2.5-flash` via `@google/genai` SDK v2.32.0.
- **Fitur yang Menggunakan AI**:
  1. **AI Facilitator Chat**: Tanya jawab kelompok dan panduan curah ide.
  2. **Role Splitting**: Pembagian peran tugas adil (total 100%).
  3. **Teacher Task Summary**: Rangkuman progres tugas untuk guru berbasis data Kanban.
  4. **Ghosting & Deadline Alerts**: Deteksi tugas terlambat dengan bahasa fasilitatif.
  5. **Fairness Analysis**: Analisis skor keadilan kelas berbasis *peer review*.

### C. Keamanan & Privasi Data AI
- **Apa yang dikirim ke Gemini**: Judul tugas, target format luaran, dan teks umpan balik anonim.
- **Apa yang TIDAK PERNAH dikirim ke Gemini**:
  - Obrolan chat internal siswa.
  - Alamat email, password, atau credential siswa.
  - Nama asli pelapor laporan rahasia (disamarkan menjadi token anonim seperti `Pelapor-1` sebelum dikirim ke API).
- **Pertahanan *Prompt Injection***: Seluruh masukan bebas dari pengguna dibungkus di dalam blok `<data>...</data>` serta disanitasi dari upaya manipulasi sistem (`stripDataTags`).
- **Transparansi Label Fallback**: Bila koneksi AI mengalami kendala (*timeout*, kuota habis, atau *cold start*), sistem otomatis beralih ke mesin deterministik dengan menyematkan label transparan:  
  `"hasil otomatis, AI sedang tidak tersedia"`.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Material Symbols, Soft Neo-Brutalism Design.
- **Backend 1 (Core)**: Node.js, Express 5, TypeScript, Prisma ORM, JSON Web Token (JWT), PostgreSQL.
- **Backend 2 (AI Engine)**: Node.js, Express 5, TypeScript, Google GenAI SDK (`@google/genai`), Zod Schema Validation.
- **Database & Cloud**: Neon Serverless PostgreSQL.

---

## 🔑 Akun & Kredensial Demo

Data uji coba telah disiapkan di database (*seed*):

- **Role Guru**:
  - **PIN Kelas**: `123456`
  - **Kode Unik Guru**: `GURU-DEMO-2026` (Dapat digunakan berulang kali)
- **Role Siswa**:
  - **PIN Kelas**: `123456`
  - **Nama Siswa**: Masukkan nama bebas (misal: `Budi`, `Siti`) atau gunakan akun terdaftar: `SISWA-MAJAPAHIT-01` s.d. `SISWA-MAJAPAHIT-08`.

---

## 💻 Panduan Instalasi & Menjalankan Lokal

### Prasyarat
- Node.js versi 20+ atau 24+
- NPM versi 10+
- Akun Neon PostgreSQL / PostgreSQL lokal
- Google Gemini API Key (opsional jika menjalankan mode simulasi `AI_MOCK=true`)

### 1. Kloning Repositori & Instalasi Dependensi
```bash
git clone https://github.com/HAYKALAB/kelompok-adil.git
cd kelompok-adil
npm install
```

### 2. Konfigurasi Variabel Lingkungan (.env)
Salin berkas template di masing-masing direktori:

**Backend 1 (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
```
Isi variabel:
```env
PORT=4000
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
CORS_ORIGIN="http://localhost:5173"
JWT_SECRET="kunci-rahasia-jwt-minimal-16-karakter"
```

**Backend 2 (`backend-2/.env`):**
```bash
cp backend-2/.env.example backend-2/.env
```
Isi variabel:
```env
PORT=5000
AUTH_MODE=jwt
REPO_MODE=db
JWT_SECRET="kunci-rahasia-jwt-minimal-16-karakter" # Sama dengan Backend 1
BACKEND2_DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
GEMINI_API_KEY="AIzaSy..."
AI_MODEL=gemini-2.5-flash
AI_MOCK=false
```

**Frontend (`frontend/.env`):**
```bash
cp frontend/.env.example frontend/.env
# Biarkan kosong saat pengembangan lokal agar menggunakan proxy Vite
```

### 3. Migrasi & Seed Basis Data
```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
cd ..
```

### 4. Menjalankan Semua Layanan Sekaligus
Dari direktori *root*:
```bash
npm run dev
```
Aplikasi akan aktif di:
- **Frontend**: http://localhost:5173
- **Backend 1 API**: http://localhost:4000
- **Backend 2 AI Engine**: http://localhost:5000

---

## 🧪 Pengujian Otomatis (Automated Testing)

Semua layanan dilengkapi *test suite* mandiri:
```bash
# 1. Jalankan test suite Backend 1 (Room Detail & Core Contracts)
npx tsx backend/src/tests/room-detail.test.ts
npx tsx backend/src/tests/stage1-2.test.ts
npx tsx backend/src/tests/stage3-4.test.ts

# 2. Jalankan test suite Backend 2 (40 Pengujian AI, Keamanan & Privasi)
npm --prefix backend-2 test

# 3. Validasi kompilasi build produksi
npm --prefix backend run build
npm --prefix backend-2 run build
npm --prefix frontend run build
```

---

## ⚖️ Keterbatasan Jujur Sistem (Transparent Disclosures)

1. **Autentikasi Siswa Tanpa Password**: Demi kemudahan adopsi cepat di ruang kelas tanpa beban registrasi akun baru, siswa masuk menggunakan PIN kelas dan nama. Token sesi disimpan aman di `localStorage` per peramban.
2. **Penyimpanan Pesan di Server**: Riwayat chat internal kelompok disimpan di basis data server murni untuk kontinuitas konteks tugas tim. Guru diblokir permanen (403) dari membaca pesan ini.
3. **Anonimitas Laporan Sejawat**: Nama pelapor disamarkan dari model AI dan disembunyikan dari antarmuka sesama siswa. Pada dashboard guru, nama pelapor tetap dapat ditinjau oleh guru kelas guna kepentingan mediasi masalah di dunia nyata.
4. **Cold Start Layanan Gratis**: Pada infrastruktur serverless gratis (*free tier*), request pertama mungkin memerlukan waktu 30-50 detik saat server menyala. Antarmuka telah dilengkapi indikator pemuatan *"Server sedang disiapkan"*.

---

## 📜 Lisensi & Atribusi

Proyek ini dikembangkan untuk **LOGICODIX Hackathon 2026**.  
Seluruh pustaka pihak ketiga (Google GenAI, Prisma ORM, Express, React, Tailwind CSS, Neon Database) digunakan sesuai lisensi sumber terbuka masing-masing.
