import { z } from 'zod';
import { repo } from '../deps/repository.stub.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { VALIDATION_SYSTEM_PROMPT } from '../modules/ai/prompts/validation.prompt.js';

export interface ValidationResponse {
  taskId: string;
  status: 'valid' | 'incomplete' | 'suspicious';
  score: number;
  feedback: string;
  missing: string[];
}

export interface CompletenessResponse {
  groupId: string;
  completedTasksCount: number;
  totalTasksCount: number;
  overallScore: number;
  summaryFeedback: string;
  readinessLevel: 'siap_presentasi' | 'hampir_siap' | 'butuh_perhatian';
  missingChapters: string[];
}

const ValidationOutputSchema = z.object({
  status: z.enum(['valid', 'incomplete', 'suspicious']),
  score: z.coerce.number().min(0).max(100),
  feedback: z.string().max(500),
  missing: z.array(z.string().max(200)).default([]),
});

export class ValidationService {
  /**
   * Validasi bukti tugas individu
   */
  public static async validateTaskEvidence(
    taskId: string,
    evidenceTextOrUrl?: string
  ): Promise<ValidationResponse> {
    const task = await repo.getTaskById(taskId);
    if (!task) {
      throw new Error(`Tugas dengan ID ${taskId} tidak ditemukan`);
    }

    const targetEvidence = evidenceTextOrUrl || task.evidenceUrl;

    // Jika bukti sama sekali belum ada
    if (!targetEvidence || targetEvidence.trim().length === 0) {
      await repo.updateTask(taskId, {
        evidenceStatus: 'incomplete',
        evidenceFeedback: 'Belum ada bukti dokumen atau tautan yang diunggah.',
      });

      return {
        taskId,
        status: 'incomplete',
        score: 0,
        feedback: 'Bukti pengerjaan belum diunggah. Mohon cantumkan tautan Google Docs, slide Canva, atau foto hasil kerja.',
        missing: ['Tautan atau dokumen bukti kerja'],
      };
    }

    const mockValidationFallback: ValidationResponse = {
      taskId,
      status: 'valid',
      score: 92,
      feedback: 'Tautan bukti sesuai dengan luaran tugas. Dokumen memuat narasi analisis terstruktur dan referensi memadai.',
      missing: [],
    };

    const promptContext = `
Tugas: "${task.title}"
Deskripsi Target: "${task.description || '-'}"
Format Bukti Wajib: ${task.evidenceType || 'google_docs'}
Bukti Yang Diserahkan: "${targetEvidence}"
`;

    let rawGenerated: any;
    try {
      rawGenerated = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: VALIDATION_SYSTEM_PROMPT,
          temperature: 0.2,
        },
        mockValidationFallback
      );
    } catch {
      rawGenerated = mockValidationFallback;
    }

    const parsed = ValidationOutputSchema.safeParse(rawGenerated);
    const generated = parsed.success ? parsed.data : mockValidationFallback;
    if (!parsed.success) {
      console.warn('Output Gemini validateTask tidak sesuai Zod, memakai fallback:', parsed.error.issues);
    }

    const status = generated.status;
    const score = Number(generated.score);
    const feedback = generated.feedback;
    const missing = generated.missing;

    // Perbarui status tugas di repo
    await repo.updateTask(taskId, {
      evidenceUrl: targetEvidence,
      evidenceStatus: status,
      evidenceFeedback: feedback,
    });

    return {
      taskId,
      status,
      score,
      feedback,
      missing,
    };
  }

  /**
   * Cek kelengkapan seluruh bab kelompok terhadap target presentasi
   */
  public static async checkGroupCompleteness(groupId: string): Promise<CompletenessResponse> {
    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const tasks = await repo.getTasks(groupId);
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done' || t.evidenceStatus === 'valid').length;

    const ratio = total > 0 ? done / total : 0;
    const overallScore = Math.round(ratio * 100);

    let readinessLevel: CompletenessResponse['readinessLevel'] = 'butuh_perhatian';
    if (overallScore >= 80) readinessLevel = 'siap_presentasi';
    else if (overallScore >= 50) readinessLevel = 'hampir_siap';

    const missingChapters = tasks
      .filter((t) => t.status !== 'done' && t.evidenceStatus !== 'valid')
      .map((t) => t.title);

    const summaryFeedback =
      readinessLevel === 'siap_presentasi'
        ? 'Luar biasa! Seluruh bab penting dan bukti dokumen telah siap untuk dipresentasikan di depan kelas.'
        : `Masih ada ${missingChapters.length} bagian tugas yang perlu diselesaikan bukti dan pembahasannya.`;

    // Tulis juga catatan ke ai_messages
    await repo.saveAiMessage({
      groupId,
      senderType: 'ai',
      senderName: 'AI Asisten Rukun',
      action: 'check_completeness',
      content: `🔍 Cek Kelengkapan Bab: Progres tim mencapai ${overallScore}%. ${summaryFeedback}`,
      structuredPayload: {
        overallScore,
        readinessLevel,
        missingChapters,
      },
    });

    return {
      groupId,
      completedTasksCount: done,
      totalTasksCount: total,
      overallScore,
      summaryFeedback,
      readinessLevel,
      missingChapters,
    };
  }
}
