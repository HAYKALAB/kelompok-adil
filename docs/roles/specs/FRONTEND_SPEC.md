# 🖥️ SPESIFIKASI TEKNIS: FRONTEND DEVELOPER

- **Role**: `frontend`
- **Owner Scope**: `frontend/src/pages/**`, `frontend/src/components/**` (non-atomic), `frontend/src/hooks/**`, `frontend/src/lib/**`, `frontend/src/types/**`
- **Stack**: React 19, Vite 8, React Router v7, TanStack Query v5, Axios/Fetch, TypeScript

---

## 1. Tanggung Jawab & Fitur Utama

### A. Routing & Navigation (React Router v7)

- `/`: Landing page & Role Selection (Pilih Guru / Siswa).
- `/join`: Halaman input PIN & Nama Siswa.
- `/join/:pin`: **Smart Auto-Fill PIN** (otomatis mengisi PIN dari URL, siswa tinggal ketik nama).
- `/teacher/dashboard`: Dashboard guru (daftar room turnamen aktif & pantau keadilan).
- `/teacher/create-room`: Form pembuatan room baru.
- `/lobby/:roomId`: Lobi tunggu pengacakan kelompok.
- `/workspace/:groupId`: Workspace kolaborasi kelompok & live task board.
- `/report/:groupId`: Form lapor rahasia (Peer-Review Beban-Free).

### B. Group Chat AI Realtime (TanStack Query)

- Gunakan `useQuery` dengan opsi `refetchInterval: 2000` di dalam `WorkspacePage` untuk membaca riwayat pesan kelompok dari endpoint `GET /api/groups/:groupId/messages`.
- Tampilkan pesan siswa dan pesan `[AI Kelompok]` dalam satu alur percakapan bersama secara transparan.
- Sediakan tombol atau input action khusus: **"Tanya AI Kelompok"** yang mengirim payload ke `POST /api/ai/groups/:groupId/chat`.

### C. Manajemen State & Form Handling

- Menyimpan sesi sementara siswa (Nama Siswa & ID Room) di `localStorage` atau React context.
- Tombol **"Salin Link Undangan"** untuk guru menggunakan `navigator.clipboard.writeText(...)`.

---

## 2. API Contract yang Dikonsumsi

- `POST /api/rooms` $\rightarrow$ Membuat room & generate PIN.
- `GET /api/rooms/:pin` $\rightarrow$ Cek validitas PIN room.
- `POST /api/rooms/join` $\rightarrow$ Siswa bergabung ke room.
- `GET /api/groups/:groupId/messages` $\rightarrow$ Mengambil riwayat obrolan kelompok.
- `POST /api/ai/groups/:groupId/chat` $\rightarrow$ Mengirim prompt ke AI Kelompok.
- `POST /api/reports` $\rightarrow$ Mengirim evaluasi anonim teman kelompok.

---

## 3. Larangan Keras

- ❌ Dilarang mengedit folder `backend/**` apa pun.
- ❌ Dilarang mengubah token tema global di `frontend/src/index.css` tanpa koordinasi dengan UI/UX.
