import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { requireTeacher } from '../middleware/auth.middleware.js';

const router = Router();

// --- 1. CHAT & FASILITATOR BERSAMA KELOMPOK (Fitur A & B) ---
// Obrolan AI fasilitator, ide topik, dan tanya jawab kelompok
router.post('/groups/:groupId/chat', AiController.chat);
// Riwayat chat kelompok (transparan untuk semua anggota)
router.get('/groups/:groupId/messages', AiController.getMessages);

// --- 2. PEMBAGIAN PERAN ADIL (Fitur C) ---
// Usulan pembagian peran adil (total 100% dan wajib format bukti)
router.post('/groups/:groupId/split-roles', AiController.splitRoles);
// Terapkan usulan pembagian peran ke papan Kanban otomatis
router.post('/suggestions/:suggestionId/apply', AiController.applySuggestion);
// Batalkan atau tolak usulan pembagian peran
router.post('/suggestions/:suggestionId/dismiss', AiController.dismissSuggestion);

// --- 3. REKOMENDASI TUGAS BARU (Fitur D & E) ---
// Rekomendasi penanggung jawab tugas dan estimasi bobot beban
router.post('/groups/:groupId/recommend-assignee', AiController.recommendAssignee);

// --- 4. VALIDASI BUKTI & KELENGKAPAN (Fitur F) ---
// Validasi kesesuaian bukti kerja siswa pada suatu tugas
router.post('/tasks/:taskId/validate', AiController.validateTask);
// Cek kelengkapan seluruh bab kelompok terhadap target presentasi
router.post('/groups/:groupId/check-completeness', AiController.checkCompleteness);

// --- 5. SKALA KONTRIBUSI KELOMPOK (Fitur G) ---
// Hitung persentase kontribusi dan status keseimbangan tim secara deterministik
router.get('/groups/:groupId/contributions', AiController.getContributions);

// --- 6. AREA GURU: DETEKSI KENDALA TENGGAT, RINGKASAN TUGAS & ANALISIS KEADILAN ---
// Peringatan otomatis tugas melewati tenggat (hanya untuk role Guru)
router.get('/rooms/:roomId/alerts', requireTeacher, AiController.getRoomAlerts);
// Ringkasan progres tugas untuk guru berbasis data Kanban murni (hanya untuk role Guru)
router.get('/groups/:groupId/teacher-summary', requireTeacher, AiController.getTeacherSummary);
// Analisis keadilan kelas berbasis laporan rahasia peer-review (hanya untuk role Guru)
router.post('/rooms/:roomId/analyze-fairness', requireTeacher, AiController.analyzeFairness);

// --- 7. PENGINGAT RAMAH / NUDGE (Fitur J) ---
// Kirim pengingat hangat di chat kelompok untuk anggota
router.post('/groups/:groupId/nudge', AiController.sendNudge);

export default router;
