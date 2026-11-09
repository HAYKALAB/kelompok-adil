import { z } from 'zod';
import { repo, TaskData } from '../deps/repository.stub.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { SPLIT_ROLES_SYSTEM_PROMPT } from '../modules/ai/prompts/split_roles.prompt.js';

export interface SplitRolesRequest {
  groupId: string;
  topic: string;
  deadline?: string;
  notes?: string;
}

export interface AssignmentItem {
  memberId: string;
  memberName: string;
  title: string;
  description: string;
  weightPercent: number;
  evidenceType: 'google_docs' | 'slide' | 'handwritten_photo' | 'web_link';
  suggestedDeadline?: string;
}

export interface SplitRolesResponse {
  suggestionId: string;
  persona: string;
  assignments: AssignmentItem[];
  rationale: string;
}

const SplitRolesOutputSchema = z.object({
  persona: z.string().optional().default('✦ Gotong Royong'),
  assignments: z
    .array(
      z.object({
        memberId: z.string(),
        memberName: z.string().optional(),
        title: z.string().max(200),
        description: z.string().max(500).optional().default(''),
        weightPercent: z.coerce.number().min(0).max(100),
        evidenceType: z
          .enum(['google_docs', 'slide', 'handwritten_photo', 'web_link'])
          .optional()
          .default('google_docs'),
        suggestedDeadline: z.string().optional(),
      })
    )
    .min(1),
  rationale: z.string().max(500).optional().default(''),
});

export class SuggestionService {
  /**
   * Mengusulkan pembagian peran adil dengan normalisasi total bobot = 100%
   */
  public static async splitRoles(params: SplitRolesRequest): Promise<SplitRolesResponse> {
    const { groupId, topic, deadline, notes } = params;

    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const memberList = group.members;
    const defaultDeadline = deadline || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

    // Mock fallback realistis untuk Kelompok Majapahit / umum
    const fallbackAssignments: AssignmentItem[] = memberList.map((m, idx) => {
      const titles = [
        'Riset Dokumen & Analisis Latar Belakang',
        'Penulisan Bab Pembahasan & Sistematika Narasi',
        'Peta Jalur & Infografis Visual Pendukung',
        'Slide Canva Presentasi & Skrip Wicara',
      ];
      const evidenceTypes: AssignmentItem['evidenceType'][] = ['google_docs', 'google_docs', 'slide', 'slide'];

      return {
        memberId: m.id,
        memberName: m.name,
        title: titles[idx % titles.length] || `Kajian Bagian ${idx + 1}`,
        description: `Mengerjakan riset terstruktur topik: ${topic}`,
        weightPercent: Math.round(100 / memberList.length),
        evidenceType: evidenceTypes[idx % evidenceTypes.length],
        suggestedDeadline: defaultDeadline,
      };
    });

    // Pastikan fallback persis 100%
    const fallbackSum = fallbackAssignments.reduce((acc, a) => acc + a.weightPercent, 0);
    if (fallbackSum !== 100 && fallbackAssignments.length > 0) {
      fallbackAssignments[fallbackAssignments.length - 1].weightPercent += 100 - fallbackSum;
    }

    const mockFallback = {
      persona: '✦ Gotong Royong',
      assignments: fallbackAssignments,
      rationale: `Beban kerja dibagi rata secara berimbang kepada ${memberList.length} anggota kelompok dengan luaran bukti nyata terverifikasi.`,
    };

    const promptContext = `
Daftar Anggota Kelompok (${memberList.length} orang):
${memberList.map((m) => `- ID: ${m.id}, Nama: ${m.name}`).join('\n')}

Topik Penugasan: "${topic}"
Target Deadline: ${defaultDeadline}
Catatan Tambahan: ${notes || 'Tidak ada'}
`;

    let rawGenerated: any;
    try {
      rawGenerated = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: SPLIT_ROLES_SYSTEM_PROMPT,
          temperature: 0.4,
        },
        mockFallback
      );
    } catch {
      rawGenerated = mockFallback;
    }

    const parsed = SplitRolesOutputSchema.safeParse(rawGenerated);
    const generated = parsed.success ? parsed.data : mockFallback;
    if (!parsed.success) {
      console.warn('Output Gemini split-roles tidak valid menurut Zod, memakai fallback:', parsed.error.issues);
    }

    // --- VALIDASI DETERMINISTIK KODE ---
    const rawAssignments = [...generated.assignments];

    // 1. Pastikan setiap anggota ada minimal 1 tugas
    const assignedMemberIds = new Set(rawAssignments.map((a) => a.memberId));
    for (const member of memberList) {
      if (!assignedMemberIds.has(member.id)) {
        rawAssignments.push({
          memberId: member.id,
          memberName: member.name,
          title: `Penyusunan Materi Pendukung (${member.name})`,
          description: `Riset komparasi dan dokumentasi pendukung topik: ${topic}`,
          weightPercent: 20,
          evidenceType: 'google_docs',
          suggestedDeadline: defaultDeadline,
        });
      }
    }

    // 2. Normalisasi total weightPercent agar TEPAT 100%
    let totalWeight = rawAssignments.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0);
    if (totalWeight <= 0) totalWeight = 100;

    let runningTotal = 0;
    const assignments: AssignmentItem[] = rawAssignments.map((item, idx) => {
      let normalized = Math.round(((Number(item.weightPercent) || 25) / totalWeight) * 100);
      if (idx === rawAssignments.length - 1) {
        normalized = Math.max(5, 100 - runningTotal);
      } else {
        runningTotal += normalized;
      }

      const validEv: AssignmentItem['evidenceType'][] = ['google_docs', 'slide', 'handwritten_photo', 'web_link'];
      const evType = validEv.includes(item.evidenceType as any) ? (item.evidenceType as any) : 'google_docs';
      const mName = item.memberName || memberList.find((m) => m.id === item.memberId)?.name || 'Anggota';

      return {
        memberId: item.memberId,
        memberName: mName,
        title: item.title,
        description: item.description || '',
        weightPercent: normalized,
        evidenceType: evType,
        suggestedDeadline: item.suggestedDeadline || defaultDeadline,
      };
    });

    // 3. Simpan usulan ke database stub AI
    const savedSuggestion = await repo.saveAiSuggestion({
      groupId,
      type: 'role_split',
      payload: {
        topic,
        assignments,
        rationale: generated.rationale || mockFallback.rationale,
      },
      status: 'pending',
    });

    return {
      suggestionId: savedSuggestion.id,
      persona: generated.persona || mockFallback.persona,
      assignments,
      rationale: generated.rationale || mockFallback.rationale,
    };
  }

  /**
   * Terapkan usulan peran ke papan Kanban kelompok secara otomatis
   */
  public static async applySuggestion(suggestionId: string): Promise<{ appliedCount: number; tasks: TaskData[] }> {
    const sug = await repo.getAiSuggestion(suggestionId);
    if (!sug || sug.status !== 'pending') {
      throw new Error('Usulan tidak ditemukan atau sudah diproses');
    }

    const { assignments, topic } = sug.payload;
    if (!assignments || !Array.isArray(assignments)) {
      throw new Error('Payload usulan tidak valid');
    }

    const newTasks = assignments.map((a: AssignmentItem) => ({
      title: a.title,
      description: `[Topik: ${topic}] ${a.description}`,
      assigneeId: a.memberId,
      status: 'todo' as const,
      weight: a.weightPercent,
      deadline: a.suggestedDeadline,
      evidenceType: a.evidenceType,
    }));

    const created = await repo.createTasks(sug.groupId, newTasks);
    await repo.updateAiSuggestionStatus(suggestionId, 'applied');

    return {
      appliedCount: created.length,
      tasks: created,
    };
  }

  /**
   * Batalkan usulan peran
   */
  public static async dismissSuggestion(suggestionId: string): Promise<boolean> {
    const sug = await repo.updateAiSuggestionStatus(suggestionId, 'dismissed');
    return Boolean(sug);
  }
}
