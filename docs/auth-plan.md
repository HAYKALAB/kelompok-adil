# Rencana Implementasi Autentikasi (Auth Plan)

Sesuai panduan setup kompetisi, fitur autentikasi lengkap sengaja belum diimplementasikan di fondasi awal agar tim dapat menyepakati ide produk terlebih dahulu.

## Opsi Arsitektur Autentikasi untuk Hackathon

### Opsi 1: JWT Session (Breeze & Ringan)

- **Komponen:** `jsonwebtoken` + `bcrypt`
- **Tabel:** Kolom `passwordHash` pada model `User`.
- **Alur:**
  1. `POST /api/auth/register`: Menerima email, nama, password, role (`student`/`teacher`).
  2. `POST /api/auth/login`: Memvalidasi password dan mengembalikan Bearer Token (JWT).
  3. Middleware `authenticateToken`: Menjaga endpoint terlindungi dengan membaca header `Authorization: Bearer <token>`.

### Opsi 2: Passwordless / Session Mock untuk Demo Cepat

- Jika waktu lomba terbatas:
  1. `POST /api/auth/login`: Cukup memasukkan email dari data seed/pengguna yang ada.
  2. Server mengembalikan token mock atau menyimpan userId dalam state frontend.
  3. Sangat menghemat waktu demo saat juri menguji role `student` dan `teacher`.

### Opsi 3: Managed Auth (Supabase Auth / Clerk)

- Jika menggunakan database cloud Supabase, dapat memanfaatkan Supabase Auth langsung di frontend dengan SDK Supabase.
