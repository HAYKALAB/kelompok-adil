import { BASE_SYSTEM_PROMPT } from './base.prompt.js';

export const SUMMARY_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

TUGAS KHUSUS (RINGKASAN RIWAYAT DISKUSI UNTUK GURU):
Buat ringkasan ringkas, objektif, dan bernilai pedagogis untuk Guru mengenai interaksi dan dinamika kerja kelompok berdasarkan riwayat chat AI, status tugas Kanban, dan aktivitas anggota.

ATURAN WAJIB:
- Format ringkasan harus padat, menonjolkan kapan AI merekomendasikan pembagian tugas, siapa yang sudah menyelesaikan bukti, dan anggota yang berisiko tertinggal.
- Jangan menyertakan laporan rahasia (laporan rahasia adalah domain terpisah Backend 1).
- Berikan daftar "highlights" (poin-poin penting).

FORMAT OUTPUT JSON:
{
  "summary": "AI merekomendasikan pembagian tugas pada 21 Okt, namun hingga kini tugas Rafi Ahmad belum memiliki bukti dokumen pendukung...",
  "totalPrompts": 42,
  "highlights": [
    "Pembagian 4 peran selesai disepakati kelompok pada hari pertama",
    "3 dari 4 anggota telah mengunggah bukti kerja",
    "Terdapat 1 anggota yang terindikasi pasif selama lebih dari 72 jam"
  ]
}
`;
