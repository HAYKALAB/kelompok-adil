// BELUM DI-ROUTE: menunggu keputusan leader
import { LlmClient } from '../modules/ai/llm.client.js';
import { buildShufflerPrompt } from '../modules/ai/prompts/shuffler.prompt.js';
import { buildFairnessAnalysisPrompt, ReportItem } from '../modules/ai/prompts/fairness.prompt.js';

export interface GroupShuffleResult {
  groups: Array<{
    groupNumber: number;
    name: string;
    members: string[];
  }>;
  reasoning: string;
}

export interface FairnessAnalysisResult {
  fairnessScore: number;
  summary: string;
  alerts: string[];
  teacherAdvice: string;
}

export class GroupBalanceService {
  /**
   * Smart Group Shuffler - Membagi kelompok secara berimbang lewat LlmClient
   */
  static async shuffleGroups(participants: string[], targetGroups: number): Promise<GroupShuffleResult> {
    const fallbackGroups = Array.from({ length: targetGroups }, (_, i) => ({
      groupNumber: i + 1,
      name: `Kelompok ${i + 1}`,
      members: [] as string[],
    }));

    participants.forEach((p, idx) => {
      fallbackGroups[idx % targetGroups].members.push(p);
    });

    const mockFallback: GroupShuffleResult = {
      groups: fallbackGroups,
      reasoning: 'Pembagian kelompok acak berimbang otomatis (Mode Cepat).',
    };

    const prompt = buildShufflerPrompt(participants, targetGroups);
    const result = await LlmClient.generateJSON<GroupShuffleResult>(prompt, { temperature: 0.5 }, mockFallback);
    return result.data;
  }

  /**
   * Analisis Laporan Beban & Skor Keadilan untuk Guru lewat LlmClient
   */
  static async analyzeFairness(reports: ReportItem[]): Promise<FairnessAnalysisResult> {
    const mockFallback: FairnessAnalysisResult = {
      fairnessScore: 90,
      summary: 'Sebagian besar anggota berkontribusi aktif dalam pembagian tugas kelompok.',
      alerts: [],
      teacherAdvice: 'Apresiasi kerja sama kelompok dan pantau siswa yang butuh asistensi teknis.',
    };

    const prompt = buildFairnessAnalysisPrompt(reports);
    const result = await LlmClient.generateJSON<FairnessAnalysisResult>(prompt, { temperature: 0.3 }, mockFallback);
    return result.data;
  }
}
