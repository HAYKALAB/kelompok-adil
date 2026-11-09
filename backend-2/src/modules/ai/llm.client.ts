import { GoogleGenAI } from '@google/genai';

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: any;
}

export class LlmClient {
  private static aiInstance: GoogleGenAI | null = null;
  private static lastPromptSent: string | undefined = undefined;

  private static getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!this.aiInstance) {
      this.aiInstance = new GoogleGenAI({ apiKey });
    }
    return this.aiInstance;
  }

  public static isMockMode(): boolean {
    const isMock = process.env.AI_MOCK === 'true' || process.env.AI_MOCK === '1';
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    return isMock || !hasKey;
  }

  public static getModel(): string {
    return process.env.AI_MODEL || 'gemini-2.5-flash';
  }

  // Rekaman prompt hanya disimpan dan dapat diakses saat NODE_ENV === 'test'
  public static getLastPrompt(): string | undefined {
    if (process.env.NODE_ENV !== 'test') {
      return undefined;
    }
    return this.lastPromptSent;
  }

  // Eksekusi pemanggilan Gemini dengan timeout 20 detik dan retry satu kali
  private static async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutMs = 20000;

    const runWithTimeout = () =>
      Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('LLM_TIMEOUT: Waktu tunggu AI melebihi 20 detik')), timeoutMs)
        ),
      ]);

    try {
      return await runWithTimeout();
    } catch (err: any) {
      console.warn('Percobaan pertama LLM gagal, mencoba ulang sekali:', err.message);
      try {
        return await runWithTimeout();
      } catch (retryErr: any) {
        console.error('Layanan LLM tidak tersedia setelah retry:', retryErr.message);
        const error: any = new Error('AI_UNAVAILABLE: Layanan AI sedang sibuk atau tidak dapat diakses.');
        error.code = 'AI_UNAVAILABLE';
        throw error;
      }
    }
  }

  public static async generateText(
    userPrompt: string,
    options?: GenerateOptions,
    mockFallback?: string
  ): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      this.lastPromptSent = userPrompt;
    }

    if (this.isMockMode()) {
      return (
        mockFallback ||
        'Hai rekan tim! Ini saran dari AI Asisten Rukun: mari bagi peran dan pastikan setiap anggota mengunggah bukti kerja di Kanban.'
      );
    }

    const ai = this.getClient();
    if (!ai) {
      return mockFallback || 'Layanan AI offline (mode mock aktif).';
    }

    try {
      return await this.executeWithRetry(async () => {
        const response = await ai.models.generateContent({
          model: this.getModel(),
          contents: userPrompt,
          config: {
            systemInstruction: options?.systemInstruction,
            temperature: options?.temperature ?? 0.7,
          },
        });

        return response.text?.trim() || '';
      });
    } catch (err: any) {
      if (mockFallback !== undefined) {
        console.warn('Pemanggilan generateText gagal, beralih ke fallback:', err.message);
        return mockFallback;
      }
      throw err;
    }
  }

  public static async generateJSON<T>(
    userPrompt: string,
    options?: GenerateOptions,
    mockFallback?: T
  ): Promise<T> {
    if (process.env.NODE_ENV === 'test') {
      this.lastPromptSent = userPrompt;
    }

    if (this.isMockMode()) {
      if (mockFallback !== undefined) return mockFallback;
      throw new Error('AI_MOCK_ERROR: Tidak ada data fallback untuk mode mock.');
    }

    const ai = this.getClient();
    if (!ai) {
      if (mockFallback !== undefined) return mockFallback;
      throw new Error('AI_UNAVAILABLE: Tidak ada API key.');
    }

    try {
      return await this.executeWithRetry(async () => {
        const response = await ai.models.generateContent({
          model: this.getModel(),
          contents: userPrompt,
          config: {
            systemInstruction: options?.systemInstruction,
            temperature: options?.temperature ?? 0.3,
            responseMimeType: 'application/json',
            responseSchema: options?.responseSchema,
          },
        });

        const text = response.text?.trim() || '{}';
        try {
          return JSON.parse(text) as T;
        } catch {
          const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
          return JSON.parse(cleaned) as T;
        }
      });
    } catch (err: any) {
      if (mockFallback !== undefined) {
        console.warn('Pemanggilan generateJSON gagal atau tidak valid, beralih ke fallback:', err.message);
        return mockFallback;
      }
      throw err;
    }
  }
}
