import { Request, Response } from 'express';
import { sendData, sendError } from '../lib/response.js';
import { ChatService } from '../services/chat.service.js';
import { SuggestionService } from '../services/suggestion.service.js';
import { AssigneeService } from '../services/assignee.service.js';
import { ValidationService } from '../services/validation.service.js';
import { ContributionService } from '../services/contribution.service.js';
import { GhostingService } from '../services/ghosting.service.js';
import { FairnessService } from '../services/fairness.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class AiController {
  // 1. Obrolan dengan AI Fasilitator Kelompok
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const { message, action, senderName, senderId } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        sendError(res, 400, 'VALIDATION_ERROR', 'Pesan chat tidak boleh kosong.');
        return;
      }

      const resolvedName =
        senderName || (req.user?.role === 'TEACHER' ? 'Guru Pembimbing' : 'Siswa');
      const resolvedId = senderId || req.user?.id;

      const result = await ChatService.processGroupChat({
        groupId,
        senderId: resolvedId,
        senderName: resolvedName,
        message,
        action: action || 'chat',
      });

      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal memproses chat AI:', err.message);
      const code = err.code || 'INTERNAL_ERROR';
      sendError(res, 500, code, 'Gagal memproses obrolan AI. Silakan coba kembali.');
    }
  }

  // 2. Ambil riwayat chat kelompok (transparan)
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const since = req.query.since as string | undefined;

      const messages = await ChatService.getGroupMessages(groupId, since);
      sendData(res, { messages });
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat riwayat pesan kelompok.');
    }
  }

  // 3. Pembagian peran adil (Split Roles)
  static async splitRoles(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const { topic, deadline, notes } = req.body;

      if (!topic || typeof topic !== 'string' || topic.trim() === '') {
        sendError(res, 400, 'VALIDATION_ERROR', 'Topik penugasan wajib diisi.');
        return;
      }

      const result = await SuggestionService.splitRoles({
        groupId,
        topic,
        deadline,
        notes,
      });

      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal split roles:', err.message);
      const code = err.code || 'INTERNAL_ERROR';
      sendError(res, 500, code, 'Gagal menyusun usulan pembagian peran adil.');
    }
  }

  // 4. Terapkan usulan pembagian peran ke Kanban
  static async applySuggestion(req: Request, res: Response): Promise<void> {
    try {
      const suggestionId = getParam(req.params.suggestionId);
      const result = await SuggestionService.applySuggestion(suggestionId);
      sendData(res, result);
    } catch (err: any) {
      sendError(res, 400, 'VALIDATION_ERROR', err.message || 'Gagal menerapkan tugas ke Kanban.');
    }
  }

  // 5. Tolak usulan peran
  static async dismissSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const suggestionId = getParam(req.params.suggestionId);
      const success = await SuggestionService.dismissSuggestion(suggestionId);
      sendData(res, { dismissed: success });
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal membatalkan usulan peran.');
    }
  }

  // 6. Rekomendasi penanggung jawab saat tambah tugas baru
  static async recommendAssignee(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const { title, description } = req.body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        sendError(res, 400, 'VALIDATION_ERROR', 'Judul tugas wajib diisi.');
        return;
      }

      const result = await AssigneeService.recommendAssignee({
        groupId,
        title,
        description,
      });

      sendData(res, result);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal menganalisis rekomendasi penanggung jawab.');
    }
  }

  // 7. Validasi bukti tugas siswa
  static async validateTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = getParam(req.params.taskId);
      const { evidenceUrl } = req.body;

      const result = await ValidationService.validateTaskEvidence(taskId, evidenceUrl);
      sendData(res, result);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memvalidasi bukti tugas siswa.');
    }
  }

  // 8. Cek kelengkapan seluruh bab kelompok
  static async checkCompleteness(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await ValidationService.checkGroupCompleteness(groupId);
      sendData(res, result);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memeriksa kelengkapan bab kelompok.');
    }
  }

  // 9. Ambil rasio kontribusi kelompok (deterministik)
  static async getContributions(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await ContributionService.calculateGroupContribution(groupId);
      sendData(res, result);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal menghitung skala kontribusi kelompok.');
    }
  }

  // 10. Deteksi peringatan ghosting untuk Guru
  static async getRoomAlerts(req: Request, res: Response): Promise<void> {
    try {
      const roomId = getParam(req.params.roomId);
      const alerts = await GhostingService.scanRoomAlerts(roomId);
      sendData(res, { alerts });
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memindai peringatan ghosting.');
    }
  }

  // 11. Ringkasan riwayat interaksi AI untuk Guru
  static async getTeacherSummary(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const summary = await GhostingService.getTeacherSummary(groupId);
      sendData(res, summary);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat ringkasan interaksi guru.');
    }
  }

  // 12. Transkrip utuh riwayat chat untuk Guru
  static async getTranscript(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const messages = await GhostingService.getGroupTranscript(groupId);
      sendData(res, { transcript: messages });
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengambil transkrip riwayat obrolan.');
    }
  }

  // 13. Kirim pengingat ramah (Nudge) ke chat kelompok
  static async sendNudge(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await GhostingService.sendFriendlyNudge(groupId);
      sendData(res, result);
    } catch (err: any) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengirimkan pengingat ramah ke kelompok.');
    }
  }

  // 14. Analisis Keadilan Kelas dari Peer-Review (Khusus Guru)
  static async analyzeFairness(req: Request, res: Response): Promise<void> {
    try {
      const roomId = getParam(req.params.roomId);
      const result = await FairnessService.analyzeRoomFairness(roomId);
      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal memproses analisis keadilan:', err.message);
      sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memproses analisis keadilan kelas.');
    }
  }
}
