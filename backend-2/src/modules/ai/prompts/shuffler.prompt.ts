// BELUM DI-ROUTE: menunggu keputusan leader
import { BASE_SYSTEM_PROMPT } from './base.prompt.js';

export function buildShufflerPrompt(participants: string[], targetGroups: number): string {
  return `${BASE_SYSTEM_PROMPT}

TUGAS KHUSUS (SMART GROUP SHUFFLER):
Daftar seluruh siswa di dalam room:
${participants.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Tugasmu:
Bagi seluruh siswa di atas ke dalam ${targetGroups} kelompok secara merata dan seimbang.

FORMAT OUTPUT WAJIB JSON:
{
  "groups": [
    {
      "groupNumber": 1,
      "name": "Kelompok 1",
      "members": ["Nama 1", "Nama 2"]
    }
  ],
  "reasoning": "Penjelasan singkat alasan pembagian yang adil dan berimbang"
}`;
}
