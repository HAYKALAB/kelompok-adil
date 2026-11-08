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

    let generated: {
      persona?: string;
      assignments: AssignmentItem[];
      rationale?: string;
    };

    try {
      generated = await LlmClient.generateJSON<any>(
        promptContext,
        {
          systemInstruction: SPLIT_ROLES_SYSTEM_PROMPT,
          temperature: 0.4,
        },
        mockFallback
      );
    } catch {
      generated = mockFallback;
    }

    // --- VALIDASI DETERMINISTIK KODE ---
    let assignments = generated.assignments || [];

    // 1. Pastikan setiap anggota ada minimal 1 tugas
    const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
    for (const member of memberList) {
      if (!assignedMemberIds.has(member.id)) {
        assignments.push({
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
    let totalWeight = assignments.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0);
    if (totalWeight <= 0) totalWeight = 100;

    let runningTotal = 0;
    assignments = assignments.map((item, idx) => {
      let normalized = Math.round(((Number(item.weightPercent) || 25) / totalWeight) * 100);
      if (idx === assignments.length - 1) {
        // Elemen terakhir menyesuaikan sisa agar mutlak 100%
        normalized = Math.max(5, 100 - runningTotal);
      } else {
        runningTotal += normalized;
      }

      // Pastikan evidenceType valid
      const validEv: AssignmentItem['evidenceType'][] = ['google_docs', 'slide', 'handwritten_photo', 'web_link'];
      const evType = validEv.includes(item.evidenceType) ? item.evidenceType : 'google_docs';

      return {
        ...item,
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
      persona: generated.persona || '✦ Gotong Royong',
      assignments,
      rationale: generated.rationale || mockFallback.rationale,
    };
  }

  /**
   * Menerapkan usulan peran ke Kanban otomatis (createTasks)
   */
  public static async applySuggestion(suggestionId: string): Promise<{ appliedCount: number; createdTasks: TaskData[] }> {
    const suggestion = await repo.getAiSuggestion(suggestionId);
    if (!suggestion) {
      throw new Error(`Saran dengan ID ${suggestionId} tidak ditemukan`);
    }

    if (suggestion.status === 'applied') {
      throw new Error('Saran ini sudah pernah diterapkan ke Kanban');
    }

    const { groupId, payload } = suggestion;
    const assignments: AssignmentItem[] = payload.assignments || [];

    const tasksToCreate = assignments.map((a) => ({
      title: a.title,
      description: a.description,
      assigneeId: a.memberId,
      status: 'todo' as const,
      weight: a.weightPercent,
      deadline: a.suggestedDeadline,
      evidenceType: a.evidenceType,
    }));

    const created = await repo.createTasks(groupId, tasksToCreate);

    // Update status suggestion
    await repo.updateAiSuggestionStatus(suggestionId, 'applied');

    // Tulis notifikasi transparan di chat kelompok
    await repo.saveAiMessage({
      groupId,
      senderType: 'ai',
      senderName: 'AI Asisten Rukun',
      action: 'split_roles',
      content: `🚀 Kabar baik! Usulan pembagian tugas telah berhasil diterapkan ke Papan Kanban Gotong Royong (${created.length} tugas baru). Selamat berkolaborasi!`,
      structuredPayload: {
        appliedSuggestionId: suggestionId,
        createdTaskIds: created.map((t) => t.id),
      },
    });

    return {
      appliedCount: created.length,
      createdTasks: created,
    };
  }

  /**
   * Menolak/mengabaikan usulan
   */
  public static async dismissSuggestion(suggestionId: string): Promise<boolean> {
    const updated = await repo.updateAiSuggestionStatus(suggestionId, 'dismissed');
    return Boolean(updated);
  }
}
