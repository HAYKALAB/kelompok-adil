# Kontrak API Awal

Dokumen ini mendefinisikan standar komunikasi antara Backend dan Frontend untuk proyek hackathon.

## Base URL

- Development: `http://localhost:4000/api` (Frontend mengakses via proxy Vite di `/api`)

## Format Respons Standar

### 1. Respons Sukses

Respons dengan payload data:

```json
{
  "data": { ... }
}
```

Atau respons status sederhana:

```json
{
  "status": "ok"
}
```

### 2. Respons Error Terpusat

Semua error ditangani secara seragam oleh error handler middleware:

```json
{
  "error": {
    "message": "Deskripsi error yang ramah pengguna",
    "code": "BAD_REQUEST"
  }
}
```

Kode status HTTP umum:

- `400 Bad Request`: Validasi input Zod gagal (`code: "VALIDATION_ERROR"`)
- `404 Not Found`: Endpoint atau resource tidak ditemukan (`code: "NOT_FOUND"`)
- `500 Internal Server Error`: Kesalahan server tanpa membocorkan stack trace (`code: "INTERNAL_ERROR"`)
- `503 Service Unavailable`: Layanan database belum terhubung (`code: "SERVICE_UNAVAILABLE"`)

---

## Endpoint yang Sudah Tersedia

### Health Check

- **Endpoint:** `GET /api/health`
- **Deskripsi:** Memeriksa status kesehatan server Express dan konektivitas database PostgreSQL.
- **Respons Sukses (Database Terhubung):**
  - **Status Code:** `200 OK`
  - **Body:**
    ```json
    {
      "status": "ok",
      "db": "connected"
    }
    ```
- **Respons Gagal (Database Belum Terhubung/Error):**
  - **Status Code:** `503 Service Unavailable`
  - **Body:**
    ```json
    {
      "status": "ok",
      "db": "error"
    }
    ```
  _(Catatan keamanan: detail error database dan kredensial connection string tidak pernah dibocorkan ke client)._

---

## Rancangan Endpoint Fitur Edukasi (Contoh Pengembangan)

Dua anggota backend dapat membagi modul fitur (misal: modul users, courses, assignments) sesuai struktur controller & service:

- `GET /api/users`: Mengambil daftar pengguna contoh (student/teacher).
- `POST /api/users`: Mendaftarkan pengguna baru dengan validasi schema Zod.
