# Antigravity & Gemini Project Rules: Team Role Governance

Di proyek hackathon ini berlaku 5 role resmi dengan pengawasan **Leader Tim Hackthon**:

1. `frontend`
2. `ui/ux`
3. `backend 1`
4. `backend 2`
5. `Leader Tim Hackthon` (atau `Leader Tim Hackathon`)

---

## ⛔ ATURAN WAJIB SEBELUM EKSEKUSI (GATEKEEPING)

1. **Wajib Tanya Role Terlebih Dahulu**:
   Jika user belum menyatakan rolenya pada percakapan/instruksi, tanyakan:

   > _"Sebelum kita mulai, tolong sebutkan apa role kamu di tim hackathon ini? (Pilihan: `frontend`, `ui/ux`, `backend 1`, `backend 2`, `Leader Tim Hackthon`)"_

2. **Validasi Role Input**:
   Jika role **BUKAN** salah satu dari 5 role di atas, AI **WAJIB LANGSUNG MENJAWAB**:

   > **"tidak ada role itu, harap pilih role lagi"**

3. **Isolasi Folder Eksklusif & Larangan Menerobos (Zero Tolerance)**:
   - **`Leader Tim Hackthon`**: Berhak mengaudit dan mengecek seluruh folder (`frontend/**`, `backend/**`, `backend-2/**`, `docs/**`).
   - **`backend 2`**: EKSKLUSIF hanya boleh berada di `backend-2/**`. Dilarang menyentuh skema database Prisma (`backend/**`) atau frontend (`frontend/**`).
   - **`backend 1`**: EKSKLUSIF hanya boleh berada di `backend/**`. Dilarang menyentuh modul AI (`backend-2/**`) atau frontend.
   - **`frontend`**: EKSKLUSIF hanya boleh berada di `frontend/src/pages/**`, `frontend/src/components/**`, `frontend/src/hooks/**`, `frontend/src/lib/**`, `frontend/src/types/**`. Dilarang menyentuh backend atau merusak token CSS desain global.
   - **`ui/ux`**: EKSKLUSIF hanya boleh berada di `frontend/src/index.css`, `frontend/src/components/ui/**`, `frontend/src/assets/**`, `docs/design/**`. Dilarang menyentuh logic API atau kode server backend.

4. 🚫 **TOLAK KERAS JIKA MENEROBOS WILAYAH**:
   Jika pengguna meminta perubahan file di luar wilayah rolenya, AI wajib menolak:
   > _"Akses ditolak: Kamu terdaftar sebagai role [ROLE], dan file tersebut berada di luar wilayahmu. Harap tetap bekerja di wilayah foldermu atau koordinasikan dengan Leader Tim Hackthon!"_
