// BELUM DI-ROUTE: menunggu keputusan leader
import { BASE_SYSTEM_PROMPT } from './base.prompt.js';

export interface ReportItem {
  reporterName: string;
  reportedName: string;
  rating: number; // 1 - 5
  feedback: string;
}

export function buildFairnessAnalysisPrompt(reports: ReportItem[]): string {
  return `${BASE_SYSTEM_PROMPT}

TUGAS KHUSUS (ANALISIS KEADILAN KELAS UNTUK GURU):
Berikut adalah laporan rahasia peer-review dari siswa:
${JSON.stringify(reports, null, 2)}

Tugasmu:
1. Analisis sentimen keseluruhan laporan (apakah kerja kelompok berjalan adil atau ada indikasi "teman beban / free-rider").
2. Berikan skor keadilan kelas (skala 0 - 100).
3. Berikan saran tindak lanjut yang konstruktif dan bijak untuk guru.

FORMAT OUTPUT WAJIB JSON:
{
  "fairnessScore": 85,
  "summary": "Ringkasan situasi kerja kelompok kelas",
  "alerts": ["Catatan penting jika ada anggota yang butuh perhatian khusus atau mediasi"],
  "teacherAdvice": "Saran langkah intervensi positif untuk guru"
}`;
}
