# 🤖 SPESIFIKASI TEKNIS: BACKEND 2 (AI INTEGRATION SERVICE)

- **Role**: `backend 2`
- **Owner Scope**: `backend-2/**` (Eksklusif Root Workspace)
- **Service Name**: `hackathon-backend-2` (Port `5000`)
- **Stack**: Google Gemini API SDK (`@google/genai`), Express, TypeScript, Zod

---

## 1. Arsitektur Folder `backend-2/`

Backend 2 memiliki service independen yang terpisah dari Backend 1:

```text
backend-2/
├── package.json          -> Dependencies: @google/genai, express, cors, dotenv
├── tsconfig.json         -> NodeNext TypeScript config
├── .env.example          -> PORT=5000 & GEMINI_API_KEY
├── README.md             -> Panduan eksklusif Backend 2
└── src/
    ├── index.ts          -> Express server entrypoint (Port 5000)
    ├── prompts/          -> Template prompt engineering
    │   ├── facilitator.ts-> System prompt AI Asisten Kelompok
    │   ├── shuffler.ts   -> Prompt kocok kelompok adil
    │   └── fairness.ts   -> Prompt analisis beban & deteksi free-rider
    ├── services/         -> Pemanggilan SDK Google Gemini (@google/genai)
    ├── controllers/      -> Handler request HTTP /api/ai/*
    └── routes/           -> Router Express AI
```

---

## 2. Fitur AI Utama yang Wajib Dibuat

### A. AI Group Chat Facilitator (`POST /api/ai/groups/:groupId/chat`)

- **Fungsi**: Membantu kelompok mencari ide proyek & pembagian tugas secara adil.
- **Model**: `gemini-2.5-flash` (cepat & efisien).
- **Format Response**: Mengembalikan solusi ide dan checklist pembagian tugas yang adil antar anggota tim.

### B. Algoritma Kocok Kelompok Berimbang (`POST /api/ai/rooms/:roomId/shuffle`)

- Menerima daftar seluruh murid di room.
- AI menyusun distribusi kelompok secara berimbang (acak tapi adil).

### C. Analisis Sentimen Laporan Beban (`POST /api/ai/rooms/:roomId/analyze-fairness`)

- Membaca data `PeerReport` dari kelompok.
- Gemini meringkas apakah ada indikasi _free-rider_ (teman beban) dan memberikan skor keadilan kelas untuk ditampilkan di dashboard guru (`8._pantau_adil_dashboard_guru`).

---

## 3. Integrasi dengan Frontend via Vite Proxy

Frontend mengakses endpoint AI kamu melalui:
`fetch('/api/ai/...')` yang oleh Vite otomatis dialihkan ke `http://localhost:5000`.

---

## 4. Larangan Keras

- ❌ **Dilarang menyentuh folder `backend/`** milik Backend 1.
- ❌ **Dilarang menyentuh folder `frontend/`**.
