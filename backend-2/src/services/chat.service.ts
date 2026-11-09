import { z } from 'zod';
import { repo } from '../deps/repository.stub.js';
import { LlmClient } from '../modules/ai/llm.client.js';
import { BASE_SYSTEM_PROMPT } from '../modules/ai/prompts/base.prompt.js';
import { IDEAS_SYSTEM_PROMPT } from '../modules/ai/prompts/ideas.prompt.js';

export interface ChatRequestParams {
  groupId: string;
  senderId?: string;
  senderName: string;
  message: string;
  action?: 'chat' | 'ideas' | 'split_roles' | 'check_completeness' | 'nudge';
}

export interface ChatResponseData {
  messageId: string;
  persona: string;
  text: string;
  structured?: any;
  createdAt: string;
}

const IdeasOutputSchema = z.object({
  persona: z.string().optional().default('✦ Ringkasan Adil'),
  text: z.string().max(1000).optional().default(''),
  structured: z.object({
    ideas: z
      .array(
        z.object({
          title: z.string().max(200),
          angle: z.string().max(500),
          difficulty: z.enum(['ringan', 'sedang', 'berat']).optional().default('sedang'),
        })
      )
      .min(1),
  }),
});

export class ChatService {
  /**
   * Mengirim pesan ke AI Fasilitator Kelompok
   */
  public static async processGroupChat(params: ChatRequestParams): Promise<ChatResponseData> {
    const { groupId, senderId, senderName, message, action = 'chat' } = params;

    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const room = await repo.getRoom(group.roomId);
    const tasks = await repo.getTasks(groupId);
    const recentMessages = await repo.getAiMessages(groupId, undefined, 15);

    // 1. Simpan pesan murid ke riwayat transparan kelompok
    await repo.saveAiMessage({
      groupId,
      senderType: 'member',
      senderId: senderId || 'unknown-student',
      senderName,
      action,
      content: message,
    });

    // 2. Susun konteks untuk LLM
    const membersSummary = group.members.map((m) => m.name).join(', ');
    const tasksSummary =
      tasks.length > 0
        ? tasks.map((t) => `- ${t.title} [Status: ${t.status}, Bobot: ${t.weight}%]`).join('\n')
        : 'Belum ada tugas di papan Kanban.';

    const chatHistorySummary = recentMessages
      .map((m) => `${m.senderName}: "${m.content}"`)
      .join('\n');

    const promptContext = `
[KONTEKS KELOMPOK]
Nama Kelompok: ${group.name}
Topik/Room: ${room?.name || 'Proyek Kelompok'} (${room?.subject || 'Pelajaran'}, Kelas ${room?.class || 'Umum'})
Anggota: ${membersSummary}
Daftar Tugas Saat Ini:
${tasksSummary}

Riwayat Chat Terakhir:
${chatHistorySummary || '(Belum ada percakapan)'}

Pesan Terbaru dari ${senderName}:
"${message}"
`;

    // 3. Tangani berdasarkan Action
    if (action === 'ideas') {
      const mockIdeasFallback = {
        persona: '✦ Ringkasan Adil',
        text: `Hai Tim ${group.name}! Ini 3 sudut pandang unik yang jarang dibahas dan dinilai berbobot oleh guru:`,
        structured: {
          ideas: [
            {
              title: 'Strategi Diplomasi Ekspedisi Pamalayu Kertanegara',
              angle: 'Menganalisis strategi ekspedisi persahabatan damai untuk membendung ekspansi Mongol ke Nusantara.',
              difficulty: 'sedang' as const,
            },
            {
              title: 'Konflik Internal vs Serangan Pasukan Kubilai Khan',
              angle: 'Meneliti intrik politik suksesi Singasari yang memicu berdirinya Majapahit di Hutan Tarik.',
              difficulty: 'berat' as const,
            },
            {
              title: 'Peran Perempuan Bangsawan dalam Suksesi Tahta Singasari-Majapahit',
              angle: 'Mengkaji pengaruh Gayatri Rajapatni dan Ken Dedes dalam stabilitas kerajaan.',
              difficulty: 'ringan' as const,
            },
          ],
        },
      };

      let rawResult: any;
      try {
        rawResult = await LlmClient.generateJSON<any>(
          promptContext,
          {
            systemInstruction: IDEAS_SYSTEM_PROMPT,
            temperature: 0.7,
          },
          mockIdeasFallback
        );
      } catch {
        rawResult = mockIdeasFallback;
      }

      const parsed = IdeasOutputSchema.safeParse(rawResult);
      const result = parsed.success ? parsed.data : mockIdeasFallback;
      if (!parsed.success) {
        console.warn('Output Gemini ideas tidak sesuai Zod, memakai fallback:', parsed.error.issues);
      }

      const text = result.text || mockIdeasFallback.text;
      const structured = result.structured || mockIdeasFallback.structured;

      // Simpan balasan AI
      const savedAiMsg = await repo.saveAiMessage({
        groupId,
        senderType: 'ai',
        senderName: 'AI Asisten Rukun',
        action: 'ideas',
        content: text,
        structuredPayload: structured,
      });

      return {
        messageId: savedAiMsg.id,
        persona: result.persona || '✦ Ringkasan Adil',
        text,
        structured,
        createdAt: savedAiMsg.createdAt,
      };
    }

    // Default Action: 'chat'
    const mockChatFallback = `Hai ${senderName} dan rekan-rekan ${group.name}! 👋 Senang bisa mendampingi diskusi kalian. Untuk topik ${room?.name || 'ini'}, kalian bisa mulai dengan menyepakati target luaran presentasi dan membagi peran agar pengerjaannya berimbang ya!`;

    const generatedText = await LlmClient.generateText(
      promptContext,
      {
        systemInstruction: BASE_SYSTEM_PROMPT,
        temperature: 0.7,
      },
      mockChatFallback
    );

    const savedAiMsg = await repo.saveAiMessage({
      groupId,
      senderType: 'ai',
      senderName: 'AI Asisten Rukun',
      action: 'chat',
      content: generatedText,
    });

    return {
      messageId: savedAiMsg.id,
      persona: '✦ Ringkasan Adil',
      text: generatedText,
      createdAt: savedAiMsg.createdAt,
    };
  }

  /**
   * Mengambil riwayat pesan kelompok (untuk polling frontend)
   */
  public static async getGroupMessages(groupId: string, since?: string) {
    return repo.getAiMessages(groupId, since, 50);
  }
}
