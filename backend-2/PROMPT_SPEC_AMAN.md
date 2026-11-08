# 🛡️ PANDUAN & SPEK PROMPT AMAN — BACKEND 2 (AI ENGINE)

Dokumen ini adalah panduan praktis dan **kumpulan template prompt siap pakai** agar setiap kali kamu meminta bantuan AI (Antigravity, Claude, ChatGPT, dll.), hasil kodenya selalu:
1. **Aman** (tanpa kebocoran API key / kredensial, anti prompt-injection).
2. **Tidak merusak wilayah tim lain** (terisolasi 100% di folder `backend-2/`).
3. **Gaya koding manusiawi** (bersih, mudah dibaca, tanpa bahasa robotik atau komentar AI yang lebay).
4. **Matematika akurat** (angka dihitung kode deterministik, bukan tebakan LLM).

---

## 📋 1. "MASTER PROMPT" (Salin & Tempel di Awal Sesi AI)

> *Gunakan prompt di bawah ini setiap kali kamu membuka sesi percakapan baru dengan AI koding:*

```text
Halo! Saya bertindak sebagai BACKEND 2 di tim hackathon ini.

Tugas saya fokus EKSKLUSIF pada:
- Layanan AI Engine & integrasi Google Gemini API / SDK (@google/genai).
- Prompt engineering & fitur cerdas: pembagian peran adil, chat fasilitator, rekomendasi beban tugas, validasi bukti, dan deteksi ghosting.

ATURAN KESELAMATAN WAJIB (ZERO TOLERANCE):
1. ISOLASI FOLDER KETAT:
   - Kamu HANYA boleh membaca dan memodifikasi file di dalam folder `backend-2/**`.
   - DILARANG KERAS menyentuh atau mengusulkan perubahan pada folder `backend/**` (milik Backend 1) dan `frontend/**` (milik Frontend & UI/UX).

2. KEAMANAN & PRIVASI DATA:
   - JANGAN PERNAH menuliskan API key, password, token, atau secret langsung di dalam kode. Selalu gunakan `process.env.*`.
   - Sediakan nilai cadangan (fallback) di `.env.example` tanpa nilai rahasia.
   - Fitur "Laporan Rahasia ke Guru" TIDAK BOLEH PERNAH bocor ke dalam obrolan terbuka kelompok atau respon chat murid.

3. LOGIKA DETERMINISTIK (ANTI HALUSINASI ANGKA):
   - Seluruh kalkulasi persentase beban, pembagian peran total 100%, dan jam inaktif (>72 jam) WAJIB dihitung lewat logika matematika TypeScript deterministik, BUKAN ditebak oleh output teks LLM.
   - LLM hanya digunakan untuk mengolah bahasa, ide kreatif, penjelasan ramah, dan format JSON terstruktur.

4. GAYA KODING SEPERTI MANUSIA:
   - Tulis kode yang rapi, natural, mudah dipahami rekan tim, dan tidak berbelit-belit.
   - Hindari komentar robotik/AI-slop yang berlebihan. Cukup komentar singkat pada logika yang penting.
   - Gunakan penamaan variabel yang ringkas dan deskriptif (misal: `groupId`, `hoursInactive`, `totalWeight`).

5. VALIDASI & ERROR HANDLING:
   - Validasi setiap input request (gunakan Zod atau pengecekan null/empty).
   - Format respon API harus konsisten: `{ ok: boolean, data?: any, error?: { code, message } }`.
   - Selalu siapkan mode `AI_MOCK=true` agar demo aplikasi tidak mati saat koneksi internet offline.

Tolong konfirmasi pemahamanmu terhadap aturan di atas sebelum kita mulai tugas berikutnya!
```

---

## 🎯 2. TEMPLATE PROMPT PER SKENARIO TUGAS

### A. Template Menambah Endpoint AI Baru
```text
Saya ingin menambahkan endpoint baru di Backend 2:
- Rute: [METHOD] /api/ai/[nama-endpoint]
- Akses: [murid / guru saja] (gunakan middleware requireTeacher jika hanya guru)
- Input Body / Param: [sebutkan parameter, misal: groupId, title]
- Output yang diharapkan: [sebutkan format data respon]

Instruksi tambahan:
- Tulis kode controller di `src/controllers/ai.controller.ts` dan rute di `src/routes/ai.routes.ts`.
- Jika butuh logic AI, buat service terpisah di `src/services/` dan gunakan adapter `LlmClient`.
- Pastikan ada fallback mock data jika AI_MOCK=true.
- Jangan ubah file di luar folder backend-2/.
```

### B. Template Memperbaiki Bug / Refactoring
```text
Terdapat kendala/bug pada file `backend-2/src/[path/file.ts]`:
[Jelaskan masalahnya, misal: "Normalisasi bobot peran belum pas 100% saat jumlah anggota ganjil"].

Tolong perbaiki dengan ketentuan:
1. Hanya edit file yang bermasalah tersebut di dalam `backend-2/`.
2. Pastikan gaya koding tetap bersih, natural, dan tidak merusak type TypeScript yang sudah ada.
3. Jalankan pengujian verifikasi untuk memastikan bug sudah tuntas.
```

### C. Template Membuat Prompt AI Baru untuk Gemini
```text
Saya ingin membuat system prompt baru untuk fitur: [Nama Fitur].
Target pengguna: Pelajar SMP/SMA di Indonesia.

Aturan prompt:
1. Nada bahasa: Santai, hangat, positif, tidak menggurui, dan tidak mempermalukan murid pasif.
2. Keamanan: Sertakan guardrails anti prompt-injection (murid tidak bisa mengubah aturan sistem lewat chat).
3. Format output: Wajib JSON murni sesuai schema [sebutkan key-nya].
4. Buat filenya di `backend-2/src/modules/ai/prompts/[nama-fitur].prompt.ts`.
```

---

## 🛡️ 3. CHECKLIST VERIFIKASI KEAMANAN (SEBELUM COMMIT/PUSH)

Sebelum kamu melakukan `git add` dan `git commit`, lakukan pengecekan kilat ini:

| Pengecekan | Pertanyaan Penting | Standar Aman |
| :--- | :--- | :---: |
| 📁 **Wilayah Folder** | Apakah ada file di luar `backend-2/` yang ikut terubah? | **Hanya di `backend-2/**`** |
| 🔑 **Rahasia & API Key** | Apakah ada string API key Gemini / database URL tertulis langsung di `.ts`? | **WAJIB lewat `.env`** |
| 📊 **Matematika Kontribusi** | Apakah angka persentase dihitung dengan rumus atau hasil tebakan AI? | **Rumus matematika murni** |
| 🚫 **Role Guard Guru** | Apakah endpoint guru (`alerts`, `teacher-summary`) terlindungi dari murid? | **Wajib middleware `requireTeacher` (403)** |
| 🧪 **Pengujian Berjalan** | Apakah script `npm test` berjalan 100% tanpa error? | **14/14 PASS** |

---

> 💡 **Tips Praktis:** File panduan ini tersimpan di `backend-2/PROMPT_SPEC_AMAN.md`. Kamu bisa membukanya kapan saja saat ingin memberikan perintah ke asisten AI!
