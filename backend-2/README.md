# 🤖 Backend 2 — AI Engine "Kelompok Adil"

Layanan terisolasi untuk fitur kecerdasan buatan (Google Gemini API & Gen AI SDK) pada platform kerja kelompok **Kelompok Adil**.

---

## 🚀 Cara Menjalankan Layanan

### 1. Masuk ke direktori & install dependensi:
```bash
cd backend-2
npm install
```

### 2. Konfigurasi Environment:
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi file `.env`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here # opsional jika mode mock aktif
AI_MODEL=gemini-2.5-flash
AI_MOCK=true # Ubah false jika ingin menggunakan API Gemini secara live
```

### 3. Kompilasi & Jalankan Server:
Mode pengembangan (auto-reload):
```bash
npm run dev
```
Build TypeScript:
```bash
npm run build
```
Jalankan pengujian otomatis:
```bash
npm run test
```

---

## 🛠️ Format Standar Komunikasi API (`docs/api.md`)

Seluruh endpoint di bawah `/api/ai` mematuhi format respons standar tim hackathon:

### 1. Respons Sukses:
```json
{
  "data": { ... }
}
```
*(Catatan: Field `ok` telah dihapus agar seragam dengan Backend 1).*

### 2. Respons Error Terpusat:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | FORBIDDEN_TEACHER_ONLY | NOT_FOUND | INTERNAL_ERROR",
    "message": "Pesan deskripsi error yang ramah pengguna"
  }
}
```

### 3. Header Otentikasi (Stub):
- `x-user-id`: ID pengguna (contoh: `m-dafano`, `guru-1`).
- `x-role`: Role pengguna, mendukung `STUDENT` atau `TEACHER` (kompatibel dengan enum Prisma Backend 1; alias lama `murid` dan `guru` dinormalisasi otomatis).

---

## 📑 Daftar Endpoint API (`/api/ai`)

### 1. Chat & Fasilitator Kelompok
- **`POST /api/ai/groups/:groupId/chat`**
  Mengirim pesan obrolan ke AI Asisten Rukun.
  - Parameter `action`: `"chat"` (obrolan umum) atau `"ideas"` (minta 3 ide topik unik berbobot).
- **`GET /api/ai/groups/:groupId/messages?since=`**
  Mengambil riwayat obrolan kelompok secara transparan untuk semua anggota.

### 2. Pembagian Peran Adil (Gotong Royong)
- **`POST /api/ai/groups/:groupId/split-roles`**
  Mengusulkan pembagian peran adil dengan jaminan total bobot `100%` dan format bukti wajib (`evidenceType`).
- **`POST /api/ai/suggestions/:suggestionId/apply`**
  Menerapkan tugas hasil pembagian peran langsung ke papan Kanban Gotong Royong.
- **`POST /api/ai/suggestions/:suggestionId/dismiss`**
  Membatalkan usulan peran.

### 3. Rekomendasi Penanggung Jawab & Estimasi Bobot
- **`POST /api/ai/groups/:groupId/recommend-assignee`**
  Menghitung estimasi bobot tugas baru (ringan/sedang/berat) dan merekomendasikan siswa dengan beban kerja terendah untuk mencegah ketimpangan.

### 4. Validasi Bukti & Kelengkapan
- **`POST /api/ai/tasks/:taskId/validate`**
  Memvalidasi apakah dokumen/slide yang dikumpulkan siswa sesuai dengan target luaran tugas (memberikan badge **✦ AI Valid**).
- **`POST /api/ai/groups/:groupId/check-completeness`**
  Mengecek kesiapan bab kelompok menjelang presentasi.

### 5. Skala Kontribusi Deterministik
- **`GET /api/ai/groups/:groupId/contributions`**
  Menghitung rasio kontribusi riil per siswa berdasarkan tugas selesai, dokumen, catatan riset, dan komentar (kalkulasi matematis akurat).

### 6. Area Khusus Guru (Wajib Header `x-role: TEACHER`)
- **`GET /api/ai/rooms/:roomId/alerts`**
  Deteksi otomatis siswa *ghosting* (kontribusi `< 10%` dan tidak ada unggahan bukti `> 72 jam`).
- **`GET /api/ai/groups/:groupId/teacher-summary`**
  Ringkasan dinamika diskusi kelompok dan catatan perkembangan otomatis untuk guru.
- **`GET /api/ai/groups/:groupId/transcript`**
  Transkrip utuh riwayat obrolan AI kelompok.

### 7. Pengingat Ramah (Nudge)
- **`POST /api/ai/groups/:groupId/nudge`**
  Mengirimkan ajakan ramah di chat terbuka kelompok untuk anggota yang pasif tanpa mempermalukan siswa.

---

## ⚡ Mode Simulasi / Mock (`AI_MOCK=true`)
Mode ini memungkinkan demo juri atau testing frontend berjalan lancar **100% offline tanpa perlu koneksi internet atau kuota API key Gemini**. Data simulasi menggunakan studi kasus Sejarah Majapahit & Sriwijaya yang sesuai dengan layar desain Stitch.
