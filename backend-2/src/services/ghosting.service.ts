import { z } from 'zod';
import { repo } from '../deps/repository.stub.js';
import { ContributionConfig } from '../config/contribution.config.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { SUMMARY_SYSTEM_PROMPT } from '../modules/ai/prompts/summary.prompt.js';
import { NUDGE_SYSTEM_PROMPT } from '../modules/ai/prompts/nudge.prompt.js';

export interface GhostingAlertItem {
  groupId: string;
  groupName: string;
  taskId: string;
  taskTitle: string;
  assigneeId?: string;
  assigneeName?: string;
  deadline: string;
  hoursOverdue: number;
  status: string;
  message: string;
}

export interface TeacherSummaryResponse {
  summary: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  nearestDeadline: string | null;
  highlights: string[];
  generatedAt: string;
  source: 'ai' | 'fallback';
}

const TeacherSummaryOutputSchema = z.object({
  summary: z.string().max(1000),
  highlights: z.array(z.string().max(300)).default([]),
});

export class GhostingService {
  private static summaryCache: Map<string, { data: TeacherSummaryResponse; expiry: number }> = new Map();

  /**
   * Peringatan kendala tugas untuk dashboard guru (Aturan Baru Berbasis Tenggat)
   * - Tugas tanpa deadline TIDAK PERNAH memicu alert.
   * - Tugas mendekati deadline (< N jam) memicu pengingat ramah ke grup (tanpa menyebut nama siapa pun).
   * - Alert ke guru HANYA muncul jika deadline SUDAH LEWAT dan tugas BELUM SELESAI, dengan bahasa netral ("perlu perhatian").
   */
  public static async scanRoomAlerts(roomId: string): Promise<GhostingAlertItem[]> {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error(`Room dengan ID ${roomId} tidak ditemukan`);
    }

    if (!room.aiEnabled) {
      return [];
    }

    const groups = await repo.getGroupsByRoom(roomId);
    const alerts: GhostingAlertItem[] = [];
    const nowTime = Date.now();
    const warnHours = ContributionConfig.ghosting.warnHoursThreshold;

    for (const group of groups) {
      const memberMap = new Map<string, string>();
      group.members.forEach((m) => memberMap.set(m.id, m.name));

      const tasks = await repo.getTasks(group.id);

      for (const t of tasks) {
        // 1. Tugas tanpa deadline TIDAK PERNAH memicu alert ke guru
        if (!t.deadline || t.deadline.trim() === '') {
          continue;
        }

        // 2. Tugas yang sudah selesai tidak memicu alert
        if (t.status === 'done' || t.evidenceStatus === 'valid') {
          continue;
        }

        const deadlineTime = new Date(t.deadline).getTime();
        if (isNaN(deadlineTime)) {
          continue;
        }

        const diffHours = (deadlineTime - nowTime) / (3600 * 1000);

        // Kasus 1: Deadline sudah lewat dan tugas belum selesai -> Picu alert ke guru dengan bahasa netral
        if (diffHours < 0) {
          const hoursOverdue = Math.max(1, Math.floor((nowTime - deadlineTime) / (3600 * 1000)));
          const assigneeName = t.assigneeId ? memberMap.get(t.assigneeId) : undefined;

          const alertItem: GhostingAlertItem = {
            groupId: group.id,
            groupName: group.name,
            taskId: t.id,
            taskTitle: t.title,
            assigneeId: t.assigneeId,
            assigneeName,
            deadline: t.deadline,
            hoursOverdue,
            status: t.status,
            message: `Tugas "${t.title}" telah melewati tenggat waktu (${hoursOverdue} jam lalu) dan belum selesai. Perlu perhatian dan konfirmasi berkala.`,
          };

          alerts.push(alertItem);

          await repo.saveAiFlag({
            groupId: group.id,
            memberId: t.assigneeId || 'unassigned',
            kind: 'ghosting',
            detail: alertItem,
          });
        }
        // Kasus 2: Deadline kurang dari N jam (default 48 jam) dan belum selesai -> Kirim pengingat ramah ke grup (tanpa menyebut nama siapa pun)
        else if (diffHours < warnHours) {
          const remainingHours = Math.max(1, Math.ceil(diffHours));
          await repo.saveAiMessage({
            groupId: group.id,
            senderType: 'ai',
            senderName: 'AI Asisten Rukun',
            action: 'nudge',
            content: `Halo rekan-rekan ${group.name}! 👋 Pengingat ramah: tugas "${t.title}" memiliki batas tenggat dalam waktu kurang dari ${remainingHours} jam. Yuk saling bantu dan koordinasikan di papan Kanban agar selesai tepat waktu! ✨`,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Menghasilkan ringkasan progres tugas untuk guru (Privasi Terjaga: Tanpa Membaca Obrolan Siswa)
   */
  public static async getTeacherSummary(groupId: string): Promise<TeacherSummaryResponse> {
    const cached = this.summaryCache.get(groupId);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    // Hanya membaca data tugas (tanpa membaca atau mengirim pesan chat siswa)
    const tasks = await repo.getTasks(groupId);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done' || t.evidenceStatus === 'valid').length;
    const pendingTasks = totalTasks - completedTasks;
    const tasksWithEvidence = tasks.filter((t) => Boolean(t.evidenceUrl)).length;

    // Hitung deadline terdekat dari tugas yang belum selesai
    const pendingWithDeadlines = tasks
      .filter((t) => t.status !== 'done' && t.evidenceStatus !== 'valid' && Boolean(t.deadline))
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

    const nearestDeadline = pendingWithDeadlines[0]?.deadline || null;

    // Fallback faktual berbasis data tugas murni
    const mockSummaryFallback: TeacherSummaryResponse = {
      summary: `Ringkasan progres tugas: terdapat ${totalTasks} tugas terdaftar (${completedTasks} selesai, ${pendingTasks} belum selesai). ${
        nearestDeadline
          ? `Tenggat tugas terdekat adalah ${new Date(nearestDeadline).toLocaleDateString('id-ID')}.`
          : 'Belum ada tenggat waktu terdekat.'
      }`,
      totalTasks,
      completedTasks,
      pendingTasks,
      nearestDeadline,
      highlights: [
        `Total tugas terdaftar: ${totalTasks} (${completedTasks} selesai verifikasi)`,
        `Tugas yang telah mengunggah bukti: ${tasksWithEvidence} dari ${totalTasks}`,
        nearestDeadline
          ? `Tenggat terdekat: ${new Date(nearestDeadline).toLocaleDateString('id-ID')}`
          : 'Tidak ada tenggat waktu aktif yang mendesak',
      ],
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    };

    const promptContext = `
Kelompok: ${group.name}
Total Tugas: ${totalTasks}
Tugas Selesai: ${completedTasks}
Tugas Belum Selesai: ${pendingTasks}
Tenggat Terdekat: ${nearestDeadline || 'Tidak ada'}

<data>
Daftar Tugas dan Status Bukti:
${tasks
  .map(
    (t) =>
      `- "${t.title}": Status=${t.status}, Bukti=${t.evidenceType || 'dokumen'} (${t.evidenceStatus || 'belum ada bukti'}), Tenggat=${t.deadline || 'tidak ada'}`
  )
  .join('\n')}
</data>
`;

    let rawGenerated: any = mockSummaryFallback;
    let rawSource: 'ai' | 'fallback' = 'fallback';

    try {
      const llmResult = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: SUMMARY_SYSTEM_PROMPT,
          temperature: 0.3,
        },
        mockSummaryFallback
      );
      rawGenerated = llmResult.data;
      rawSource = llmResult.source;
    } catch {
      rawGenerated = mockSummaryFallback;
      rawSource = 'fallback';
    }

    const parsed = TeacherSummaryOutputSchema.safeParse(rawGenerated);
    const isAiValid = rawSource === 'ai' && parsed.success;
    const generated = isAiValid ? parsed.data : mockSummaryFallback;

    if (!parsed.success && rawSource === 'ai') {
      console.warn('Output Gemini teacherSummary tidak sesuai Zod, memakai fallback:', parsed.error.issues);
    }

    const result: TeacherSummaryResponse = {
      summary: generated.summary,
      totalTasks,
      completedTasks,
      pendingTasks,
      nearestDeadline,
      highlights: generated.highlights.length > 0 ? generated.highlights : mockSummaryFallback.highlights,
      generatedAt: new Date().toISOString(),
      source: isAiValid ? 'ai' : 'fallback',
    };

    this.summaryCache.set(groupId, {
      data: result,
      expiry: Date.now() + 10 * 60 * 1000,
    });

    return result;
  }

  /**
   * Mengirimkan nudge ramah ke kelompok (tanpa menyudutkan individu)
   */
  public static async sendFriendlyNudge(groupId: string): Promise<{ sentMessageId: string; message: string; source: 'ai' | 'fallback' }> {
    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const tasks = await repo.getTasks(groupId);
    const pendingCount = tasks.filter((t) => t.status !== 'done').length;

    const fallbackNudge = `Halo rekan-rekan ${group.name}! 👋 Pengingat ramah: terdapat ${pendingCount} tugas di papan Kanban yang masih berjalan. Mari saling bantu dan koordinasikan bila ada kendala materi ya! ✨`;

    const promptContext = `
Kelompok: ${group.name}
Total Tugas Belum Selesai: ${pendingCount}
Buatkan sapaan ramah, hangat, dan memotivasi seluruh anggota kelompok tanpa menyebut nama individu secara negatif.
`;

    const { text: messageText, source } = await LlmClient.generateText(
      promptContext,
      {
        systemInstruction: NUDGE_SYSTEM_PROMPT,
        temperature: 0.6,
      },
      fallbackNudge
    );

    const savedMsg = await repo.saveAiMessage({
      groupId,
      senderType: 'ai',
      senderName: 'AI Asisten Rukun',
      action: 'nudge',
      content: messageText,
    });

    return {
      sentMessageId: savedMsg.id,
      message: messageText,
      source,
    };
  }
}
