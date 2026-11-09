import { z } from 'zod';
import { repo } from '../deps/repository.stub.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import {
  buildFairnessAnalysisPrompt,
  AnonymizedReportItem,
} from '../modules/ai/prompts/fairness.prompt.js';

// Schema validasi output LLM menggunakan Zod
const FairnessOutputSchema = z.object({
  fairnessScore: z.coerce.number().min(0).max(100),
  summary: z.string().max(1000),
  alerts: z.array(z.string().max(300)).default([]),
  teacherAdvice: z.string().max(1000),
});

export interface FairnessAnalysisResult {
  fairnessScore: number;
  summary: string;
  alerts: string[];
  teacherAdvice: string;
  totalReports: number;
  generatedAt: string;
}

export class FairnessService {
  /**
   * Menganalisis laporan peer-review keadilan kelas untuk Guru
   */
  public static async analyzeRoomFairness(roomId: string): Promise<FairnessAnalysisResult> {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error(`Room dengan ID ${roomId} tidak ditemukan`);
    }

    const now = new Date().toISOString();

    // 1. Jika AI dinonaktifkan oleh guru di room ini
    if (!room.aiEnabled) {
      return {
        fairnessScore: 100,
        summary: 'Fitur analisis AI dinonaktifkan untuk room ini.',
        alerts: [],
        teacherAdvice: 'Aktifkan toggle AI Fasilitator di pengaturan room untuk menjalankan analisis keadilan.',
        totalReports: 0,
        generatedAt: now,
      };
    }

    // 2. Ambil seluruh laporan peer-review siswa di room ini
    const reports = await repo.getPeerReportsByRoom(roomId);

    // Jika belum ada laporan masuk
    if (reports.length === 0) {
      return {
        fairnessScore: 100,
        summary: 'Belum ada laporan kendala peer-review dari siswa di ruang kelas ini.',
        alerts: [],
        teacherAdvice: 'Dinamika kelompok berjalan kondusif. Tetap pantau berkala pada papan Kanban kelompok.',
        totalReports: 0,
        generatedAt: now,
      };
    }

    // 3. Anonimisasi Pelapor (TUGAS 2: IDENTITAS ASLI PELAPOR TIDAK PERNAH DIKIRIM KE AI)
    const reporterAliasMap = new Map<string, string>();
    let aliasCounter = 1;

    const anonymizedReports: AnonymizedReportItem[] = reports.map((r) => {
      if (!reporterAliasMap.has(r.reporterId)) {
        reporterAliasMap.set(r.reporterId, `Pelapor-${aliasCounter++}`);
      }

      // Potong panjang teks feedback maksimal 300 karakter untuk mencegah bloating/prompt injection
      const sanitizedFeedback = r.feedback.slice(0, 300).trim();

      return {
        reporterAlias: reporterAliasMap.get(r.reporterId)!,
        reportedMemberName: r.reportedMemberName,
        rating: Math.max(1, Math.min(5, Number(r.rating) || 3)),
        feedback: sanitizedFeedback,
      };
    });

    // 4. Hitung skor dasar deterministik (rata-rata rating 1-5 dikonversi ke skala 0-100)
    const avgRating = reports.reduce((acc, r) => acc + r.rating, 0) / reports.length;
    const deterministicScore = Math.round((avgRating / 5) * 100);

    // Fallback realistis deterministik jika AI_MOCK aktif atau Gemini gagal
    const uniqueReported = Array.from(new Set(reports.map((r) => r.reportedMemberName)));
    const mockFallback: FairnessAnalysisResult = {
      fairnessScore: Math.min(100, Math.max(0, deterministicScore)),
      summary: `Terdapat ${reports.length} laporan peer-review yang masuk. Terindikasi ketimpangan koordinasi pada pembagian tugas subtema kelompok.`,
      alerts: uniqueReported.map(
        (name) => `${name} dilaporkan perlu perhatian dan konfirmasi terkait dokumen bukti kerja.`
      ),
      teacherAdvice:
        'Disarankan mengundang perwakilan kelompok untuk berdiskusi santai guna mengidentifikasi kendala sebelum batas tenggat.',
      totalReports: reports.length,
      generatedAt: now,
    };

    // 5. Eksekusi pemanggilan Gemini via LlmClient
    const prompt = buildFairnessAnalysisPrompt(anonymizedReports);

    try {
      const generated = await LlmClient.generateJSON<any>(
        prompt,
        { temperature: 0.3 },
        mockFallback
      );

      // Validasi hasil menggunakan Zod (TUGAS 3)
      const parsed = FairnessOutputSchema.safeParse(generated);
      if (parsed.success) {
        return {
          fairnessScore: parsed.data.fairnessScore,
          summary: parsed.data.summary,
          alerts: parsed.data.alerts,
          teacherAdvice: parsed.data.teacherAdvice,
          totalReports: reports.length,
          generatedAt: now,
        };
      } else {
        console.warn('⚠️ Output Gemini tidak sesuai schema Zod, menggunakan fallback deterministik:', parsed.error.issues);
        return mockFallback;
      }
    } catch (err: any) {
      console.warn('⚠️ Gagal menghubungi LLM, beralih ke fallback deterministik tanpa error 500:', err.message);
      return mockFallback;
    }
  }
}
