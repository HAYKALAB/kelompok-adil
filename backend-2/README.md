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

# Mode Otentikasi: 'jwt' (Bearer Token dari Backend 1) atau 'stub' (x-user-id / x-role)
AUTH_MODE=stub
JWT_SECRET= # Wajib minimal 16 karakter jika AUTH_MODE=jwt (harus sama dengan Backend 1)

# Mode Repository: 'stub' (offline) atau 'db' (PostgreSQL / Neon)
REPO_MODE=stub
BACKEND2_DATABASE_URL= # Isi jika REPO_MODE=db

GEMINI_API_KEY=your_gemini_api_key_here # opsional jika mode mock aktif
AI_MODEL=gemini-2.5-flash
AI_MOCK=true # Ubah false jika ingin menggunakan API Gemini secara live
AI_TIMEOUT_MS=10000
GHOSTING_WARN_HOURS=48
GHOSTING_NUDGE_INTERVAL_HOURS=24
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
Jalankan pengujian otomatis unit & kontrak:
```bash
npm run test
```
Jalankan pengujian koneksi database (khusus mode db):
```bash
npm run test:db
```

---

## 🔐 Mode Otentikasi (`AUTH_MODE`)

Backend 2 mendukung dua mode otentikasi:

1. **Mode JWT (`AUTH_MODE=jwt`) — Standar Produksi**:
   - **Header Wajib**: Klien/Frontend wajib mengirimkan header `Authorization: Bearer <token>` pada setiap permintaan ke `/api/ai/*`.
   - **Verifikasi Kriptografi**: Token diverifikasi menggunakan algoritma `HS256` dengan `JWT_SECRET` yang sama persis dengan Backend 1.
   - **Payload Sesi**: Token memuat identitas terverifikasi `{ id: string, role: 'STUDENT' | 'TEACHER' }` di mana `id` adalah `RoomParticipant.id`.
   - **Abaikan Header Stub**: Header dev lama (`x-user-id` dan `x-role`) diabaikan sepenuhnya untuk mencegah eskalasi peran (*spoofing*).
   - **Tanpa Identitas Default**: Permintaan tanpa token atau dengan token yang tidak valid/kedaluwarsa akan langsung ditolak dengan status HTTP `401 UNAUTHORIZED`.
   - **Kewajiban Pasangan Mode**: Mode `AUTH_MODE=jwt` **wajib dipasangkan dengan `REPO_MODE=db`**. Jika dipasangkan dengan `REPO_MODE=stub`, ID partisipan riil dari token JWT tidak akan ditemukan di data simulasi in-memory dan sebagian besar endpoint kelompok akan menolak akses.
   - **Aturan Ketat Produksi**: Jika `NODE_ENV === 'production'` dan `AUTH_MODE === 'stub'`, server secara otomatis **menolak menyala** demi keamanan data siswa.

2. **Mode Stub (`AUTH_MODE=stub`) — Dev & Testing Lokal**:
   - Membaca identitas pengguna melalui header simulasi `x-user-id` (default `m-dafano`) dan `x-role` (default `STUDENT`).
   - Hanya digunakan untuk pengembangan lokal dan pengujian offline tanpa memerlukan login Backend 1.

> **Petunjuk Integrasi Frontend**:  
> Frontend wajib menyertakan header `Authorization: Bearer <token>` yang didapatkan saat join/login kelas Backend 1 untuk setiap panggilan API ke Backend 2 (`http://localhost:5000/api/ai/*`).

---

## 🗄️ Mode Repository: Stub vs Database (`REPO_MODE`)

Backend 2 mendukung dua mode penyimpanan data melalui variabel environment `REPO_MODE`:

1. **Mode Stub (`REPO_MODE=stub` - Default)**:
   - Beroperasi 100% in-memory tanpa memerlukan database aktif.
   - Menyediakan data simulasi kelas Sejarah Majapahit (Room 1) dan Sriwijaya Bahari (Room 2).
   - Seluruh pengujian rutin (`npm test`) secara mutlak dipaksa berjalan pada mode stub untuk menjamin stabilitas CI/CD.

2. **Mode Database (`REPO_MODE=db`)**:
   - Membaca data langsung dari tabel PostgreSQL / Neon milik Backend 1 dengan SSL aktif.
   - **Keamanan Data & Privasi Koneksi**: Pesan error dan log server tidak pernah mencetak string koneksi, token, password, atau secret.
   - **Ketahanan Server (Anti-Crash)**: Jika koneksi ke database terputus atau gagal, server tetap menyala dan mengembalikan status HTTP `503 SERVICE_UNAVAILABLE` yang jelas bagi klien.
   - **Skrip `npm run test:db`**: Menguji koneksi database secara read-only (hanya operasi `SELECT` pada tabel `rooms` dan `groups`, tanpa penulisan apa pun).

### ⚠️ Keterbatasan Mode Database (Data In-Memory):
Beberapa data operasional internal tetap disimpan di memori (*in-memory*) demi performa dan pencegahan spam:
- **Pelacakan Pengingat Tenggat (`sentTaskNudges`)**: Riwayat timestamp pengiriman pengingat ramah per tugas disimpan in-memory guna mencegah pesan duplikat ke chat grup dalam jendela interval 24 jam.
- **Cache Ringkasan Guru (`summaryCache`)**: Hasil komputasi dan analisis ringkasan progres tugas guru disimpan in-memory selama 10 menit untuk menghemat beban database dan kuota LLM.

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
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN_TEACHER_ONLY | FORBIDDEN_STUDENTS_ONLY | FORBIDDEN_GROUP_MEMBER_ONLY | NOT_FOUND | SERVICE_UNAVAILABLE | INTERNAL_ERROR",
    "message": "Pesan deskripsi error yang ramah pengguna"
  }
}
```

---

## 📑 Daftar Endpoint API (`/api/ai`)

### 1. Chat & Fasilitator Kelompok (Eksklusif Anggota Kelompok)
> **Aturan Privasi**: Guru tidak memiliki akses ke percakapan AI; hanya anggota kelompok yang bisa membacanya. Akses oleh guru akan ditolak `403 FORBIDDEN_STUDENTS_ONLY` dan siswa dari kelompok lain akan ditolak `403 FORBIDDEN_GROUP_MEMBER_ONLY`.
- **`POST /api/ai/groups/:groupId/chat`**
  Mengirim pesan obrolan ke AI Asisten Rukun (hanya untuk siswa anggota kelompok).
  - Parameter `action`: `"chat"` (obrolan umum) atau `"ideas"` (minta 3 ide topik unik berbobot).
- **`GET /api/ai/groups/:groupId/messages?since=`**
  Mengambil riwayat obrolan kelompok (hanya dapat dibaca oleh siswa yang merupakan anggota kelompok tersebut).

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

### 6. Area Khusus Guru (Wajib Header `x-role: TEACHER` atau Token Guru)
- **`GET /api/ai/rooms/:roomId/alerts`**
  Deteksi otomatis peringatan tugas berbasis tenggat waktu:
  - **Kapan & di mana pengingat dikirim**: Pengingat ramah dikirim otomatis ke ruang chat kelompok (`group_messages`) saat tugas Kanban belum selesai dan sisa waktu menuju tenggat `< 48` jam (`GHOSTING_WARN_HOURS`).
  - **Pencegahan pesan ganda**: Sistem mencatat waktu pengiriman dan membatasi maksimal 1 pengingat per tugas per interval (default 24 jam via `GHOSTING_NUDGE_INTERVAL_HOURS`). Pemanggilan berulang (misal refresh dashboard guru) tidak menimbulkan spam pesan duplikat.
  - **Alert ke Guru**: Hanya muncul jika deadline telah lewat dan tugas belum selesai dengan bahasa netral *"perlu perhatian"*. Tugas tanpa deadline tidak pernah memicu alert.
- **`GET /api/ai/groups/:groupId/teacher-summary`**
  Ringkasan progres tugas Kanban kelompok (jumlah total tugas, selesai, tertunda, dan tenggat terdekat) murni dari data agregat tugas tanpa mengakses atau membaca isi obrolan siswa demi privasi.
- **`POST /api/ai/rooms/:roomId/analyze-fairness`**
  Analisis keadilan dan iklim gotong royong berdasarkan formulir peer-review siswa di mana identitas pelapor tidak dikirim ke AI dan tidak terlihat siswa lain.

### 7. Pengingat Ramah (Nudge)
- **`POST /api/ai/groups/:groupId/nudge`**
  Mengirimkan ajakan ramah dan suportif ke ruang obrolan bersama kelompok agar saling membantu menyelesaikan tugas sebelum tenggat tanpa menyalahkan siapapun.

---

## ⚡ Mode Simulasi / Mock (`AI_MOCK=true`)
Mode ini memungkinkan demo juri atau testing frontend berjalan lancar **100% offline tanpa perlu koneksi internet atau kuota API key Gemini**. Data simulasi menggunakan studi kasus Sejarah Majapahit & Sriwijaya yang sesuai dengan layar desain Stitch.
