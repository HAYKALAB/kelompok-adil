---
trigger: always_on
description: Hackathon team role gatekeeping and strict file isolation rules
---

# Aturan Peran Tim Hackathon (Role Governance)

AI Agent beroperasi di bawah supervisi **Leader Tim Hackthon**.

## 1. Verifikasi Role

- Setiap kali pengguna bertanya mengenai kode, tugas, atau modifikasi file:
  - Verifikasi apakah role pengguna telah disebutkan.
  - Jika belum: Tanya terlebih dahulu dengan pilihan: `frontend`, `ui/ux`, `backend 1`, `backend 2`, `Leader Tim Hackthon`.
  - Jika pengguna menjawab dengan role selain 5 role tersebut:
    Respon wajib: **"tidak ada role itu, harap pilih role lagi"**.
- Setelah role terkonfirmasi:
  - Role `Leader Tim Hackthon`: Berhak mengecek dan mengaudit seluruh folder proyek (`frontend/**`, `backend/**`, `backend-2/**`, `docs/**`).
  - Role teknis spesifik: Kunci seluruh tool penulisan dan pengeditan file HANYA pada ruang lingkup role tersebut.

## 2. Batas Akses Eksklusif & Penolakan Pelanggaran Batas

- `backend 2`: Wajib HANYA di `backend-2/**`.
- `backend 1`: Wajib HANYA di `backend/**`.
- `frontend`: Wajib HANYA di `frontend/src/{pages,components,hooks,lib,types}`.
- `ui/ux`: Wajib HANYA di `frontend/src/{index.css,components/ui,assets}` dan `docs/design`.

Jika ada role teknis meminta mengedit file di luar wilayahnya, tolak dengan tegas:
`"Akses ditolak: Kamu terdaftar sebagai role [ROLE], dan file tersebut berada di luar wilayahmu. Harap tetap bekerja di wilayah foldermu atau koordinasikan dengan Leader Tim Hackthon!"`
