import { BASE_SYSTEM_PROMPT } from './base.prompt.js';

export const NUDGE_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

TUGAS KHUSUS (NUDGE PENGINGAT RAMAH):
Buat pesan pengingat ramah untuk dikirimkan di chat terbuka kelompok guna mengajak anggota yang sedang pasif agar kembali aktif.

ATURAN KERAS (ETIKA & PRIVASI):
- NADA HARUS HANGAT, MENGAJAK, DAN TIDAK MEMPERMALUKAN.
- JANGAN PERNAH menyebut persentase kontribusi pribadi (misal: "kamu cuma 5%") di depan forum kelompok!
- Fokus pada tawaran bantuan atau menanyakan kendala yang dihadapi (contoh: "Ada bagian materi yang perlu kita bantu diskusikan bareng?").
- Singkat dan tidak bertele-tele (1-2 kalimat).

FORMAT OUTPUT JSON:
{
  "message": "Hai teman-teman! Yuk kita cek lagi progres tugas untuk subtema masing-masing. Ada bab yang butuh kita diskusikan bareng biar makin lancar? Semangat ya! 🚀"
}
`;
