# Panduan Kolaborasi Tim & Aturan AI Agent (Hackathon)

Selamat datang di repositori tim hackathon! Dokumen ini adalah panduan resmi agar tim kita dapat bergerak cepat, terkoordinasi, dan bebas dari konflik kode (_merge conflict_).

---

## 5 Role Resmi di Tim

| No  | Role                      | Penanggung Jawab / Tugas Utama                                                                   | Wilayah Kerja Folder                                                                                                                                     |
| :-: | :------------------------ | :----------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | **`Leader Tim Hackthon`** | Leader tim yang berkomitmen memimpin tim dan **mengecek seluruh folder** proyek                  | Akses supervisi ke seluruh folder (`frontend/**`, `backend/**`, `docs/**`)                                                                               |
|  2  | **`frontend`**            | Mengurus halaman React, routing, TanStack Query, hooks, dan integrasi API                        | `frontend/src/pages/`<br>`frontend/src/components/`<br>`frontend/src/hooks/`<br>`frontend/src/lib/`<br>`frontend/src/types/`                             |
|  3  | **`ui/ux`**               | Mengurus styling Tailwind CSS, komponen UI Kit neo-brutalism, responsivitas, dan aset visual     | `frontend/src/index.css`<br>`frontend/src/components/ui/`<br>`frontend/src/assets/`<br>`docs/design/`                                                    |
|  4  | **`backend 1`**           | Mengurus database PostgreSQL, skema Prisma, migrasi, auth middleware, dan CRUD REST API umum     | `backend/prisma/`<br>`backend/src/controllers/`<br>`backend/src/routes/`<br>`backend/src/services/`<br>`backend/src/middleware/`<br>`backend/src/types/` |
|  5  | **`backend 2`**           | Mengurus integrasi Google Gemini API / AI SDK, prompt engineering, fitur cerdas, dan endpoint AI | `backend/src/ai/`<br>`backend/src/controllers/ai/`<br>`backend/src/routes/ai/`<br>`backend/src/services/ai/`                                             |

---

## Cara Berinteraksi dengan AI Agent

### 1. Format Pertanyaan yang Benar

Saat ingin meminta bantuan koding atau konsultasi ke AI agent, **sebutkan role kamu di awal pesan**:

> _"Halo AI, **saya adalah Leader Tim Hackthon**. Tolong cek apakah struktur folder dan integrasi antar tim sudah sinkron."_

Atau:

> _"Halo AI, **saya adalah backend 2**. Tolong buatkan service untuk memanggil Gemini API yang menganalisis laporan bebas beban."_

### 2. Jika Lupa Menyebutkan Role

AI agent akan otomatis berhenti dan menanyakan role kamu terlebih dahulu sebelum memproses instruksi.

### 3. Jika Role Tidak Valid

Jika kamu menyebutkan role di luar 5 role di atas (misalnya _"saya fullstack"_ atau typo), AI agent akan otomatis membalas:

> **"tidak ada role itu, harap pilih role lagi"**

### 4. Jaminan Isolasi File & Wewenang Leader

- Rekan teknis (`frontend`, `ui/ux`, `backend 1`, `backend 2`) diisolasi di folder masing-masing sehingga tidak saling merusak file.
- `Leader Tim Hackthon` berwenang mengaudit dan mengecek seluruh file proyek untuk memastikan konsistensi tim.

---

## Do's and Don'ts Selama Hackathon

- ✅ **Lakukan:** Selalu buat branch atau git commit kecil setelah satu fitur mini selesai.
- ✅ **Lakukan:** Komunikasikan perubahan kontrak API di `docs/api.md` antara Frontend dan Backend.
- ❌ **Jangan:** Mengedit file skema Prisma (`backend/prisma/schema.prisma`) jika kamu bukan Backend 1.
- ❌ **Jangan:** Mengubah konfigurasi global Tailwind di `frontend/src/index.css` jika kamu bukan UI/UX.
- ❌ **Jangan:** Mengedit logika prompt AI jika kamu bukan Backend 2.
