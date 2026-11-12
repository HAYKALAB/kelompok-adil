import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service.js';
import { SuggestionService } from '../services/suggestion.service.js';
import { AssigneeService } from '../services/assignee.service.js';
import { ValidationService } from '../services/validation.service.js';
import { ContributionService } from '../services/contribution.service.js';
import { GhostingService } from '../services/ghosting.service.js';
import { FairnessService } from '../services/fairness.service.js';
import { sendData, sendError } from '../lib/response.js';

// Helper ekstraksi route params aman untuk Express 5
function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

/**
 * Meneruskan error infrastruktur (503 SERVICE_UNAVAILABLE, 501 NOT_IMPLEMENTED) apa adanya,
 * serta menggunakan fallback status & pesan aman untuk error lainnya.
 */
function handleControllerError(
  res: Response,
  err: any,
  fallbackMessage: string,
  defaultStatus = 500,
  defaultCode = 'INTERNAL_ERROR'
): void {
  if (err && (err.status === 503 || err.status === 501)) {
    sendError(
      res,
      err.status,
      err.code || (err.status === 503 ? 'SERVICE_UNAVAILABLE' : 'NOT_IMPLEMENTED'),
      err.message || fallbackMessage
    );
    return;
  }

  const status = typeof err?.status === 'number' ? err.status : defaultStatus;
  const code = err?.code || defaultCode;
  const message = defaultStatus < 500 ? err?.message || fallbackMessage : fallbackMessage;
  sendError(res, status, code, message);
}

export class AiController {
  // 1. Obrolan AI Fasilitator & Ide Kreatif
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const { message, senderId, senderName, action } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        sendError(res, 400, 'VALIDATION_ERROR', 'Pesan tidak boleh kosong.');
        return;
      }

      const result = await ChatService.processGroupChat({
        groupId,
        senderId,
        senderName: senderName || 'Siswa',
        message,
        action,
      });

      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal memproses pesan AI:', err.message);
      handleControllerError(res, err, 'Gagal memproses permintaan chat fasilitator.');
    }
  }

  // 2. Mengambil riwayat pesan kelompok
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const since = req.query.since as string | undefined;

      const messages = await ChatService.getGroupMessages(groupId, since);
      sendData(res, { messages });
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal memuat riwayat pesan kelompok.');
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
      handleControllerError(res, err, 'Gagal menyusun usulan pembagian peran adil.');
    }
  }

  // 4. Terapkan usulan pembagian peran ke Kanban
  static async applySuggestion(req: Request, res: Response): Promise<void> {
    try {
      const suggestionId = getParam(req.params.suggestionId);
      const result = await SuggestionService.applySuggestion(suggestionId);
      sendData(res, result);
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal menerapkan tugas ke Kanban.', 400, 'VALIDATION_ERROR');
    }
  }

  // 5. Tolak usulan peran
  static async dismissSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const suggestionId = getParam(req.params.suggestionId);
      const success = await SuggestionService.dismissSuggestion(suggestionId);
      sendData(res, { dismissed: success });
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal membatalkan usulan peran.');
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
      console.error('Gagal merekomendasikan assignee:', err.message);
      handleControllerError(res, err, 'Gagal merekomendasikan penanggung jawab tugas.');
    }
  }

  // 7. Validasi bukti tugas individu
  static async validateTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = getParam(req.params.taskId);
      const { evidenceUrl } = req.body;

      const result = await ValidationService.validateTaskEvidence(taskId, evidenceUrl);
      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal memvalidasi tugas:', err.message);
      handleControllerError(res, err, 'Gagal memvalidasi bukti tugas siswa.');
    }
  }

  // 8. Cek kelengkapan seluruh bab kelompok
  static async checkCompleteness(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await ValidationService.checkGroupCompleteness(groupId);
      sendData(res, result);
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal memeriksa kelengkapan bab kelompok.');
    }
  }

  // 9. Ambil skala kontribusi riil kelompok (Deterministik)
  static async getContributions(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await ContributionService.calculateGroupContribution(groupId);
      sendData(res, result);
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal menghitung skala kontribusi kelompok.');
    }
  }

  // 10. Deteksi peringatan tenggat tugas untuk Guru
  static async getRoomAlerts(req: Request, res: Response): Promise<void> {
    try {
      const roomId = getParam(req.params.roomId);
      const alerts = await GhostingService.scanRoomAlerts(roomId);
      sendData(res, { alerts });
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal memindai peringatan tenggat tugas.');
    }
  }

  // 11. Ringkasan progres tugas untuk Guru (Tanpa Mengakses Obrolan Siswa)
  static async getTeacherSummary(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const summary = await GhostingService.getTeacherSummary(groupId);
      sendData(res, summary);
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal memuat ringkasan tugas guru.');
    }
  }

  // 12. Kirim pengingat ramah (Nudge) ke chat kelompok
  static async sendNudge(req: Request, res: Response): Promise<void> {
    try {
      const groupId = getParam(req.params.groupId);
      const result = await GhostingService.sendFriendlyNudge(groupId);
      sendData(res, result);
    } catch (err: any) {
      handleControllerError(res, err, 'Gagal mengirimkan pengingat ramah ke kelompok.');
    }
  }

  // 13. Analisis Keadilan Kelas dari Peer-Review (Khusus Guru)
  static async analyzeFairness(req: Request, res: Response): Promise<void> {
    try {
      const roomId = getParam(req.params.roomId);
      const result = await FairnessService.analyzeRoomFairness(roomId);
      sendData(res, result);
    } catch (err: any) {
      console.error('Gagal memproses analisis keadilan:', err.message);
      handleControllerError(res, err, 'Gagal memproses analisis keadilan kelas.');
    }
  }
}
