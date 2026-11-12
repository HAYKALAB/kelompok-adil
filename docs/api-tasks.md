# Kontrak API Tugas & Laporan Rahasia (Backend 1)

Seluruh endpoint di bawah menggunakan prefix `/api`, wajib header `Authorization: Bearer <token>` (JWT Backend 1 dengan payload `{ id: RoomParticipant.id, role: 'STUDENT' | 'TEACHER' }`), dan format standar `{ "data": ... }` / `{ "error": { "code": "...", "message": "..." } }`.

---

## Tahap 1: Papan Tugas Kelompok (`task-board`)

### 1. Daftar Tugas Kelompok
- **Endpoint:** `GET /api/groups/:groupId/tasks`
- **Otorisasi:** Siswa anggota kelompok tersebut **atau** Guru kelas (`roomId`) yang sama.
- **Respons `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "groupId": "uuid",
        "title": "Riset Latar Belakang",
        "description": "Kumpulkan 3 referensi primer",
        "assigneeId": "uuid-or-null",
        "status": "TODO",
        "weight": 25,
        "progress": 0,
        "deadline": "2026-11-20T09:59:00.000Z",
        "createdAt": "2026-11-12T06:00:00.000Z",
        "doneAt": null
      }
    ]
  }
  ```

### 2. Tambah Tugas Baru
- **Endpoint:** `POST /api/groups/:groupId/tasks`
- **Otorisasi:** **Hanya** siswa anggota kelompok tersebut (Guru dan siswa kelompok lain ditolak `403`).
- **Body:**
  - `title` (string, wajib, maks 150 karakter)
  - `description` (string | null, opsional, maks 500 karakter)
  - `assigneeId` (string | null, opsional — harus siswa anggota kelompok yang sama)
  - `weight` (integer `1–100`, opsional, default `1`)
  - `deadline` (string ISO | null, opsional)
- **Efek samping:** Mencatat 1 baris di `activities` (`type: "LOG"`).
- **Respons `201 Created`:** `{ "data": { ...task } }`

### 3. Ubah Detail Tugas
- **Endpoint:** `PATCH /api/tasks/:taskId`
- **Otorisasi:** **Hanya** siswa anggota kelompok tugas tersebut.
- **Body (minimal 1 field):** `title`, `description`, `assigneeId` (anggota kelompok yang sama atau `null`), `weight`, `deadline`.
- **Respons `200 OK`:** `{ "data": { ...updatedTask } }`

---

## Tahap 2: Laporan Rahasia Peer-Review (`peer-report`)

### 1. Kirim / Perbarui Laporan Rahasia
- **Endpoint:** `POST /api/groups/:groupId/reports`
- **Otorisasi:** **Hanya** siswa anggota kelompok tersebut.
- **Body:**
  - `reportedId` (string, wajib — anggota kelompok yang sama, bukan diri sendiri)
  - `rating` (integer `1–5`, wajib)
  - `feedback` (string, wajib, maks 300 karakter)
- **Aturan Keamanan & Privasi:**
  - `reporterId` **selalu** diambil dari token (`req.user.id`), bukan dari body.
  - `roomId` diambil dari data kelompok.
  - Maksimal 1 laporan per pasangan `(reporterId, reportedId)` di kelompok tersebut; pengiriman ulang menimpa laporan lama.
  - Tidak dicatat ke `activities`.
- **Respons `201 Created`:**
  ```json
  {
    "data": { "saved": true }
  }
  ```

### 2. Daftar Laporan Rahasia Kelas (Khusus Guru)
- **Endpoint:** `GET /api/rooms/:roomId/reports`
- **Otorisasi:** **Hanya** Guru kelas (`roomId`) tersebut. Siswa ditolak `403`.
- **Respons `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "roomId": "uuid",
        "groupId": "uuid",
        "reporterId": "uuid",
        "reporterName": "Dafano",
        "reportedId": "uuid",
        "reportedName": "Rafi",
        "rating": 2,
        "feedback": "Belum ada progres di bab yang dijanjikan.",
        "createdAt": "2026-11-12T06:00:00.000Z"
      }
    ]
  }
  ```
