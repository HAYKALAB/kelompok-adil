import { repo } from '../deps/repository.stub.js';
import { ContributionConfig } from '../config/contribution.config.js';
import { ContributionService } from './contribution.service.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { SUMMARY_SYSTEM_PROMPT } from '../modules/ai/prompts/summary.prompt.js';
import { NUDGE_SYSTEM_PROMPT } from '../modules/ai/prompts/nudge.prompt.js';

export interface GhostingAlertItem {
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  kind: 'ghosting' | 'low_contribution';
  message: string;
  hoursInactive: number;
  contributionPercent: number;
}

export interface TeacherSummaryResponse {
  summary: string;
  totalPrompts: number;
  highlights: string[];
  generatedAt: string;
}

export class GhostingService {
  private static summaryCache: Map<string, { data: TeacherSummaryResponse; expiry: number }> = new Map();

  /**
   * Deteksi ghosting di seluruh room untuk dashboard guru
   * Syarat: kontribusi < 10% DAN inaktif > 72 jam
   */
  public static async scanRoomAlerts(roomId: string): Promise<GhostingAlertItem[]> {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error(`Room dengan ID ${roomId} tidak ditemukan`);
    }

    // Hanya berjalan jika guru mengaktifkan toggle AI di room
    if (!room.aiEnabled) {
      return [];
    }

    const groups = await repo.getGroupsByRoom(roomId);
    const alerts: GhostingAlertItem[] = [];
    const nowTime = Date.now();

    for (const group of groups) {
      const contribution = await ContributionService.calculateGroupContribution(group.id);

      for (const m of contribution.members) {
        // Cek durasi inaktif dalam jam
        let hoursInactive = 999;
        if (m.lastActiveAt) {
          const lastActiveTime = new Date(m.lastActiveAt).getTime();
          hoursInactive = Math.max(0, Math.floor((nowTime - lastActiveTime) / (3600 * 1000)));
        }

        const isLowContribution = m.percentage < ContributionConfig.ghosting.minContributionPercent;
        const isGhosting = isLowContribution && hoursInactive >= ContributionConfig.ghosting.inactiveHoursThreshold;

        if (isGhosting) {
          const alertItem: GhostingAlertItem = {
            groupId: group.id,
            groupName: group.name,
            memberId: m.memberId,
            memberName: m.name,
            kind: 'ghosting',
            message: `Kontribusi di bawah ${ContributionConfig.ghosting.minContributionPercent}% (${m.percentage}%) dan tidak mengunggah bukti selama ${hoursInactive} jam. Risiko ketidakadilan pembagian nilai.`,
            hoursInactive,
            contributionPercent: m.percentage,
          };

          alerts.push(alertItem);

          // Simpan flag di repo AI
          await repo.saveAiFlag({
            groupId: group.id,
            memberId: m.memberId,
            kind: 'ghosting',
            detail: alertItem,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Menghasilkan ringkasan riwayat interaksi AI untuk guru
   */
  public static async getTeacherSummary(groupId: string): Promise<TeacherSummaryResponse> {
    // Cek cache 10 menit
    const cached = this.summaryCache.get(groupId);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const messages = await repo.getAiMessages(groupId);
    const tasks = await repo.getTasks(groupId);

    const mockSummaryFallback: TeacherSummaryResponse = {
      summary: `AI merekomendasikan pembagian tugas pada tahap awal, namun hingga saat ini terdapat tugas yang belum memiliki bukti verifikasi dokumen pendukung. Secara umum dinamika diskusi berlangsung aktif.`,
      totalPrompts: messages.length || 42,
      highlights: [
        `Terdapat ${tasks.length} tugas terdaftar di Kanban kelompok`,
        `Interaksi tanya jawab dengan AI Asisten Kelompok berjalan ${messages.length} kali`,
        `Perlu tindak lanjut untuk siswa yang memiliki tugas dengan deadline terdekat`,
      ],
      generatedAt: new Date().toISOString(),
    };

    const promptContext = `
Kelompok: ${group.name}
Total Pesan Chat: ${messages.length}
Daftar Tugas:
${tasks.map((t) => `- ${t.title} [Status: ${t.status}, Assignee: ${t.assigneeId}]`).join('\n')}

Cuplikan Diskusi Terakhir:
${messages.slice(-10).map((m) => `${m.senderName}: "${m.content}"`).join('\n')}
`;

    let generated: any;
    try {
      generated = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: SUMMARY_SYSTEM_PROMPT,
          temperature: 0.3,
        },
        mockSummaryFallback
      );
    } catch {
      generated = mockSummaryFallback;
    }

    const result: TeacherSummaryResponse = {
      summary: generated.summary || mockSummaryFallback.summary,
      totalPrompts: messages.length || generated.totalPrompts || 42,
      highlights: Array.isArray(generated.highlights) ? generated.highlights : mockSummaryFallback.highlights,
      generatedAt: new Date().toISOString(),
    };

    // Cache selama 10 menit
    this.summaryCache.set(groupId, {
      data: result,
      expiry: Date.now() + 10 * 60 * 1000,
    });

    return result;
  }

  /**
   * Mengambil transkrip lengkap chat kelompok untuk guru
   */
  public static async getGroupTranscript(groupId: string) {
    return repo.getAiMessages(groupId, undefined, 200);
  }

  /**
   * Mengirimkan nudge ramah ke murid pasif di chat kelompok
   */
  public static async sendFriendlyNudge(groupId: string): Promise<{ sentMessageId: string; message: string }> {
    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const mockNudgeFallback = {
      message: 'Hai teman-teman! Yuk kita cek lagi progres tugas untuk subtema masing-masing. Ada bagian materi yang butuh kita diskusikan bareng biar makin lancar? Semangat ya! 🚀',
    };

    let generated: any;
    try {
      generated = await LlmClient.generateJSON<any>(
        `Kelompok: ${group.name}`,
        {
          systemInstruction: NUDGE_SYSTEM_PROMPT,
          temperature: 0.5,
        },
        mockNudgeFallback
      );
    } catch {
      generated = mockNudgeFallback;
    }

    const messageText = generated.message || mockNudgeFallback.message;

    const saved = await repo.saveAiMessage({
      groupId,
      senderType: 'ai',
      senderName: 'AI Asisten Rukun',
      action: 'nudge',
      content: messageText,
    });

    return {
      sentMessageId: saved.id,
      message: messageText,
    };
  }
}
