import { GoogleGenAI } from '@google/genai';

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: any;
}

export interface LlmTextResult {
  text: string;
  source: 'ai' | 'fallback';
}

export interface LlmJsonResult<T> {
  data: T;
  source: 'ai' | 'fallback';
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
    return process.env.AI_MODEL || 'gemini-3.5-flash-lite';
  }

  public static getTimeoutMs(): number {
    if (process.env.NODE_ENV === 'test') return 2000;
    const envVal = Number(process.env.AI_TIMEOUT_MS);
    return !isNaN(envVal) && envVal > 0 ? envVal : 45000;
  }

  // Rekaman prompt hanya disimpan dan dapat diakses saat NODE_ENV === 'test'
  public static getLastPrompt(): string | undefined {
    if (process.env.NODE_ENV !== 'test') {
      return undefined;
    }
    return this.lastPromptSent;
  }

  // Deteksi error sementara (transient) yang layak di-retry
  private static isTransientError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message || '').toLowerCase();
    const status = err.status || err.statusCode || err.code;

    // Timeout atau pembatalan request
    if (msg.includes('timeout') || msg.includes('aborted') || err.name === 'AbortError') {
      return true;
    }
    // Rate limit 429
    if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('resource exhausted')) {
      return true;
    }
    // Server error 5xx
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('unavailable')) {
      return true;
    }

    return false;
  }

  // Eksekusi pemanggilan Gemini dengan timeout configurable dan 1x retry jika transient
  private static async executeWithRetry<T>(fn: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const timeoutMs = this.getTimeoutMs();

    const runWithTimeout = async () => {
      const controller = new AbortController();
      let timer: NodeJS.Timeout | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`LLM_TIMEOUT: Waktu tunggu AI melebihi ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        return await Promise.race([fn(controller.signal), timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    try {
      return await runWithTimeout();
    } catch (err: any) {
      if (this.isTransientError(err)) {
        console.warn('Terjadi transient error pada LLM, mencoba ulang sekali dalam 500ms:', err.message);
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          return await runWithTimeout();
        } catch (retryErr: any) {
          console.error('Layanan LLM tetap gagal setelah retry:', retryErr.message);
          const error: any = new Error('AI_UNAVAILABLE: Layanan AI sedang sibuk atau tidak dapat diakses.');
          error.code = 'AI_UNAVAILABLE';
          throw error;
        }
      }
      throw err;
    }
  }

  public static async generateText(
    userPrompt: string,
    options?: GenerateOptions,
    mockFallback: string = ''
  ): Promise<LlmTextResult> {
    if (process.env.NODE_ENV === 'test') {
      this.lastPromptSent = userPrompt;
    }

    if (this.isMockMode()) {
      return { text: mockFallback, source: 'fallback' };
    }

    const ai = this.getClient();
    if (!ai) {
      return { text: mockFallback, source: 'fallback' };
    }

    try {
      const responseText = await this.executeWithRetry(async (signal) => {
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

      return { text: responseText, source: 'ai' };
    } catch (err: any) {
      console.warn('Pemanggilan generateText gagal, beralih ke fallback deterministik:', err.message);
      return { text: mockFallback, source: 'fallback' };
    }
  }

  public static async generateJSON<T>(
    userPrompt: string,
    options?: GenerateOptions,
    mockFallback?: T
  ): Promise<LlmJsonResult<T>> {
    if (process.env.NODE_ENV === 'test') {
      this.lastPromptSent = userPrompt;
    }

    if (this.isMockMode()) {
      if (mockFallback !== undefined) {
        return { data: mockFallback, source: 'fallback' };
      }
      throw new Error('AI_MOCK_ERROR: Tidak ada data fallback untuk mode mock.');
    }

    const ai = this.getClient();
    if (!ai) {
      if (mockFallback !== undefined) {
        return { data: mockFallback, source: 'fallback' };
      }
      throw new Error('AI_UNAVAILABLE: Tidak ada API key.');
    }

    try {
      const parsed = await this.executeWithRetry(async (signal) => {
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

      return { data: parsed, source: 'ai' };
    } catch (err: any) {
      if (mockFallback !== undefined) {
        console.warn('Pemanggilan generateJSON gagal atau output tidak valid, beralih ke fallback deterministik:', err.message);
        return { data: mockFallback, source: 'fallback' };
      }
      throw err;
    }
  }
}
