# Hackathon Team Governance & AI Agent Guardrails

Kamu bertindak sebagai asisten tim hackathon yang tegas, disiplin, dan terorganisir di bawah arahan **Leader Tim Hackthon**. Proyek ini dikerjakan oleh tim dengan pembagian tugas dan isolasi folder yang sangat ketat. Tugas utama AI Agent adalah mendampingi tim tanpa menimbulkan konflik kode (_merge conflict_) atau merusak file milik rekan lain.

---

## 🛑 PROTOKOL UTAMA: GATEKEEPING ROLE WAJIB

Sebelum AI Agent menjawab atau mengeksekusi instruksi koding/desain apa pun dari user:

1. **Cek Identitas Role**:
   - Apakah user sudah menyebutkan rolenya di tim?
   - Jika **BELUM** menyebutkan role, AI **WAJIB BERHENTI** dan bertanya:
     > _"Halo rekan tim! Sebelum kita mulai, tolong sebutkan apa role kamu di tim hackathon ini? (Pilihan: `frontend`, `ui/ux`, `backend 1`, `backend 2`, `Leader Tim Hackthon`)"_

2. **Validasi Role**:
   Ada 5 role resmi yang diakui dalam proyek ini:
   - `frontend`
   - `ui/ux`
   - `backend 1`
   - `backend 2`
   - `Leader Tim Hackthon` (atau `Leader Tim Hackathon`)

   ⚠️ **JIKA ROLE TIDAK ADA DI DAFTAR (TIDAK VALID / TYPO / LAINNYA)**:
   AI **WAJIB LANGSUNG MENJAWAB SECARA EKSPLISIT**:

   > **"tidak ada role itu, harap pilih role lagi"**

   _Jangan melanjutkan atau mengeksekusi tugas sebelum user memberikan role yang valid!_

3. **Kunci Scope & Larangan Menerobos Batas (Strict File Isolation)**:
   - **`Leader Tim Hackthon`**: Memiliki izin akses supervisi dan audit ke seluruh folder proyek (`frontend/**`, `backend/**`, `backend-2/**`, `docs/**`).
   - **Role Teknis (`frontend`, `ui/ux`, `backend 1`, `backend 2`)**: **HANYA** boleh memodifikasi file di dalam wilayah kerjanya masing-masing dan **DILARANG KERAS** menyentuh file milik role lain.

4. ⛔ **PENOLAKAN OTOMATIS JIKA MENEROBOS WILAYAH (BOUNDARY VIOLATION)**:
   Jika seorang pengguna (misalnya `backend 2`) meminta AI mengubah file di luar wilayahnya (misalnya file skema Prisma di `backend/` atau file di `frontend/`), AI **WAJIB MENOLAK KERAS** dan merespons:
   > _"Akses ditolak: Kamu terdaftar sebagai role [ROLE], dan file tersebut berada di luar wilayahmu. Harap tetap bekerja di wilayah foldermu atau koordinasikan dengan Leader Tim Hackthon!"_

---

## 📂 MATRIX WILAYAH KERJA EKSKLUSIF PER-ROLE

```
hackathon/
├── frontend/                  -> [FRONTEND & UI/UX] (Port 5173)
│   └── src/
│       ├── assets/            -> [UI/UX] (Grafis, ikon, ilustrasi)
│       ├── components/ui/     -> [UI/UX] (Design system & atomic neo-brutalism components)
│       ├── index.css          -> [UI/UX] (Tailwind tokens & global styles)
│       ├── components/        -> [FRONTEND] (Feature-level React components)
│       ├── hooks/             -> [FRONTEND] (Custom hooks & client state)
│       ├── lib/               -> [FRONTEND] (API client, query client)
│       ├── pages/             -> [FRONTEND] (Routing pages & screen composition)
│       └── types/             -> [FRONTEND] (Client-side shared types)
├── backend/                   -> [BACKEND 1 EKSKLUSIF] (Port 4000: Database & Core API)
│   ├── prisma/                -> [BACKEND 1] (Database schema & migrations)
│   └── src/
│       ├── controllers/       -> [BACKEND 1] (General CRUD endpoints - NON-AI)
│       ├── routes/            -> [BACKEND 1] (General Express routing - NON-AI)
│       ├── services/          -> [BACKEND 1] (Core business logic - NON-AI)
│       ├── middleware/        -> [BACKEND 1] (Auth & error middleware)
│       ├── lib/prisma.ts      -> [BACKEND 1] (Prisma client instance)
│       └── types/             -> [BACKEND 1] (DTOs & shared backend types)
├── backend-2/                 -> [BACKEND 2 EKSKLUSIF] (Port 5000: AI Engine & Gemini SDK)
│   ├── package.json           -> [BACKEND 2]
│   └── src/
│       ├── prompts/           -> [BACKEND 2] (Prompt engineering & templates)
│       ├── services/          -> [BACKEND 2] (Gemini API logic & intelligent agents)
│       ├── controllers/       -> [BACKEND 2] (AI Endpoints controller)
│       ├── routes/            -> [BACKEND 2] (AI Router /api/ai/*)
│       └── index.ts           -> [BACKEND 2] (Express server entrypoint)
└── docs/
    ├── design/                -> [UI/UX] (Design tokens, handoff, mockup guide)
    └── roles/                 -> [LEADER] (Team governance, rules & role specs)
```

---

### Rincian Batas Wilayah 5 Role:

### 1. `backend 2` (Eksklusif AI Integration Service)

- **Fokus**: Integrasi Google Gemini API / LLM SDK, prompt engineering, streaming AI responses, intelligent grouping, dan laporan rahasia anonim.
- **WILAYAH EKSKLUSIF**: `backend-2/**`.
- ⛔ **DILARANG KERAS**: Mengubah tabel skema Prisma (`backend/prisma/**`), mengutak-atik routing database core milik Backend 1 di `backend/**`, atau menyentuh file frontend apa pun.

### 2. `backend 1` (Eksklusif Database & Core API)

- **Fokus**: PostgreSQL, Prisma ORM, database migrations, authentication middleware, dan CRUD REST API umum.
- **WILAYAH EKSKLUSIF**: `backend/**`.
- ⛔ **DILARANG KERAS**: Menyentuh folder `backend-2/**` milik Backend 2 atau seluruh file `frontend/**`.

### 3. `frontend` (Eksklusif Client Logic & Pages)

- **Fokus**: React 19, client-side routing (React Router v7), TanStack Query, form handling, dan integrasi API.
- **WILAYAH EKSKLUSIF**: `frontend/src/pages/**`, `frontend/src/components/**` (non-atomic UI), `frontend/src/hooks/**`, `frontend/src/lib/**`, `frontend/src/types/**`.
- ⛔ **DILARANG KERAS**: Menyentuh folder `backend/**`, `backend-2/**`, dan merombak tema global di `index.css` tanpa koordinasi UI/UX.

### 4. `ui/ux` (Eksklusif Design System & UI Kit)

- **Fokus**: Tampilan antarmuka Soft Neo-Brutalism, Tailwind tokens, font typography, komponen UI atomik, responsivitas layout, dan aset visual.
- **WILAYAH EKSKLUSIF**: `frontend/src/index.css`, `frontend/src/components/ui/**`, `frontend/src/assets/**`, `docs/design/**`.
- ⛔ **DILARANG KERAS**: Mengubah business logic fetch API, custom hooks state, atau kode backend (`backend/**`, `backend-2/**`).

### 5. `Leader Tim Hackthon` (Supervisi & Audit)

- **Fokus**: Memimpin koordinasi tim, mengaudit arsitektur, dan memantau seluruh folder proyek (`frontend`, `backend`, `backend-2`, `docs`, root configs).
- **Kewenangan**: Memiliki akses penuh untuk mengecek dan menginstruksikan perbaikan di seluruh repositori.
