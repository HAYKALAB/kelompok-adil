import { z } from 'zod';
import { repo } from '../deps/repository.stub.js';
import { ContributionService } from './contribution.service.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { ASSIGNEE_RECOMMENDATION_SYSTEM_PROMPT } from '../modules/ai/prompts/assignee.prompt.js';

export interface RecommendAssigneeRequest {
  groupId: string;
  title: string;
  description?: string;
}

export interface RecommendAssigneeResponse {
  estimatedWeight: {
    level: 'ringan' | 'sedang' | 'berat';
    rangePercent: [number, number];
    reason: string;
  };
  recommendations: Array<{
    memberId: string;
    name: string;
    currentLoadPercent: number;
    starred?: boolean;
  }>;
  warnings: Array<{
    memberId: string;
    name: string;
    currentLoadPercent: number;
    message: string;
  }>;
  message: string;
  source: 'ai' | 'fallback';
}

const AssigneeOutputSchema = z.object({
  estimatedWeight: z.object({
    level: z.enum(['ringan', 'sedang', 'berat']),
    rangePercent: z.tuple([
      z.coerce.number().min(0).max(100),
      z.coerce.number().min(0).max(100),
    ]),
    reason: z.string().max(500),
  }),
  narrativeMessage: z.string().max(500).optional(),
});

export class AssigneeService {
  /**
   * Merekomendasikan penanggung jawab & estimasi beban tugas baru
   */
  public static async recommendAssignee(params: RecommendAssigneeRequest): Promise<RecommendAssigneeResponse> {
    const { groupId, title, description = '' } = params;

    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    // Batasi panjang input (anti-injection & anti-bloat)
    const sanitizedTitle = (title || '').slice(0, 150).trim();
    const sanitizedDesc = (description || '').slice(0, 300).trim();

    // 1. Hitung beban terkini tiap anggota secara deterministik
    const contributionData = await ContributionService.calculateGroupContribution(groupId);
    const sortedMembers = [...contributionData.members].sort(
      (a, b) => a.assignedLoadPercent - b.assignedLoadPercent
    );

    const recommendations: RecommendAssigneeResponse['recommendations'] = [];
    const warnings: RecommendAssigneeResponse['warnings'] = [];

    // Pisahkan anggota beban terendah dan anggota yang kelebihan beban
    sortedMembers.forEach((m, idx) => {
      if (m.assignedLoadPercent > 35) {
        warnings.push({
          memberId: m.memberId,
          name: m.name,
          currentLoadPercent: m.assignedLoadPercent,
          message: 'Beban sudah timpang ⚠️',
        });
      } else {
        recommendations.push({
          memberId: m.memberId,
          name: m.name,
          currentLoadPercent: m.assignedLoadPercent,
          starred: idx === 0,
        });
      }
    });

    if (recommendations.length === 0 && sortedMembers.length > 0) {
      recommendations.push({
        memberId: sortedMembers[0].memberId,
        name: sortedMembers[0].name,
        currentLoadPercent: sortedMembers[0].assignedLoadPercent,
        starred: true,
      });
    }

    // 2. Tentukan estimasi bobot lewat LLM / Mock
    const mockWeightFallback = {
      estimatedWeight: {
        level: 'sedang' as const,
        rangePercent: [20, 25] as [number, number],
        reason: 'Estimasi AI belum tersedia. Sistem menetapkan bobot standar menengah (20-25%) berdasarkan rata-rata beban tugas kelompok.',
      },
      narrativeMessage: `Estimasi AI belum tersedia. Berdasarkan data beban tim (${contributionData.balanceStatus}), tugas dialokasikan ke ${
        recommendations[0]?.name || 'anggota tim'
      } (${recommendations[0]?.currentLoadPercent || 0}%) agar beban tim tetap berimbang.`,
    };

    const promptContext = `
Status Beban Tim Saat Ini:
${sortedMembers.map((m) => `- ${m.name}: ${m.assignedLoadPercent}%`).join('\n')}
Rekomendasi Utama: ${recommendations[0]?.name || 'Belum ada'}

<data>
Judul Tugas Baru dari Siswa: "${sanitizedTitle}"
Deskripsi Tugas: "${sanitizedDesc || 'Tidak ada deskripsi'}"
</data>
`;

    let rawGenerated: any = mockWeightFallback;
    let rawSource: 'ai' | 'fallback' = 'fallback';

    try {
      const llmResult = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: ASSIGNEE_RECOMMENDATION_SYSTEM_PROMPT,
          temperature: 0.3,
        },
        mockWeightFallback
      );
      rawGenerated = llmResult.data;
      rawSource = llmResult.source;
    } catch {
      rawGenerated = mockWeightFallback;
      rawSource = 'fallback';
    }

    const parsed = AssigneeOutputSchema.safeParse(rawGenerated);
    const isAiValid = rawSource === 'ai' && parsed.success;
    const generated = isAiValid ? parsed.data : mockWeightFallback;
    if (!parsed.success && rawSource === 'ai') {
      console.warn('Output Gemini recommendAssignee tidak sesuai Zod, memakai fallback:', parsed.error.issues);
    }

    const estimatedWeight = generated.estimatedWeight;
    const message =
      isAiValid && generated.narrativeMessage
        ? generated.narrativeMessage
        : mockWeightFallback.narrativeMessage;

    return {
      estimatedWeight,
      recommendations,
      warnings,
      message,
      source: isAiValid ? 'ai' : 'fallback',
    };
  }
}
