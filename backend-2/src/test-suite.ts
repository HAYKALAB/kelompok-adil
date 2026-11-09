process.env.NODE_ENV = 'test';

import app from './index.js';
import http from 'http';
import { repo } from './deps/repository.stub.js';
import { LlmClient } from './modules/ai/llm.client.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api/ai`;

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  console.log(`\n🧪 Server pengujian berjalan di port ${PORT}\n`);

  let allPassed = true;

  const json = async (r: any): Promise<any> => r.json();

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      allPassed = false;
    }
  }

  try {
    // 1. Health check (format: { data: { ... } }, tanpa "ok")
    const resHealth = await fetch(`${BASE_URL}/health`).then(json);
    assert(
      resHealth.ok === undefined && resHealth.data?.status === 'ready',
      'Tugas 1: Health Check API berformat { data }, tanpa field "ok"'
    );

    // 2. Chat Fasilitator Kelompok
    const resChat = await fetch(`${BASE_URL}/groups/group-1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Halo AI, apa saja fokus materi kelompok kita?',
        senderName: 'Dafano',
      }),
    }).then(json);
    assert(
      resChat.ok === undefined && Boolean(resChat.data?.text),
      'Tugas 1: Chat fasilitator merespons dengan format { data }'
    );

    // 3. Ide Topik (Fitur B - Tepat 3 ide)
    const resIdeas = await fetch(`${BASE_URL}/groups/group-1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Kasih 3 ide topik presentasi menarik tentang Kerajaan Singasari dong! 🏛️',
        action: 'ideas',
        senderName: 'Dafano',
      }),
    }).then(json);
    assert(
      Array.isArray(resIdeas.data?.structured?.ideas) &&
        resIdeas.data.structured.ideas.length === 3,
      'Fitur B: Tepat 3 ide sudut pandang unik dihasilkan'
    );

    // 4. Riwayat Chat
    const resMsg = await fetch(`${BASE_URL}/groups/group-1/messages`).then(json);
    assert(
      Array.isArray(resMsg.data?.messages) && resMsg.data.messages.length >= 2,
      'Riwayat chat tersimpan secara transparan'
    );

    // 5. Pembagian Peran Adil (Fitur C - Total 100%)
    const resSplit = await fetch(`${BASE_URL}/groups/group-1/split-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Strategi Diplomasi Ekspedisi Pamalayu Kertanegara',
      }),
    }).then(json);

    const assignments = resSplit.data?.assignments || [];
    const totalWeight = assignments.reduce((acc: number, a: any) => acc + a.weightPercent, 0);
    assert(
      assignments.length === 4 && totalWeight === 100,
      `Fitur C: Total bobot peran persis 100% (${totalWeight}%) dan mencakup 4 anggota`
    );

    // 6. Terapkan usulan peran ke Kanban otomatis
    const suggestionId = resSplit.data?.suggestionId;
    const resApply = await fetch(`${BASE_URL}/suggestions/${suggestionId}/apply`, {
      method: 'POST',
    }).then(json);
    assert(
      resApply.data?.appliedCount === 4,
      'Fitur C: Terapkan ke Kanban otomatis (createTasks) berhasil'
    );

    // 7. Rekomendasi penanggung jawab (Fitur D & E)
    const resAssignee = await fetch(`${BASE_URL}/groups/group-1/recommend-assignee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Desain Slide Presentasi Canva',
        description: 'Pembuatan 10 slide interaktif',
      }),
    }).then(json);
    const topRec = resAssignee.data?.recommendations?.[0];
    assert(
      topRec?.starred === true && typeof topRec?.currentLoadPercent === 'number',
      `Fitur D & E: Rekomendasi penanggung jawab menunjuk anggota beban terendah (${topRec?.name})`
    );

    // 8. Validasi bukti tugas (Fitur F)
    const resVal = await fetch(`${BASE_URL}/tasks/task-1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceUrl: 'https://docs.google.com/document/d/1example-dafano',
      }),
    }).then(json);
    assert(resVal.data?.status === 'valid', 'Fitur F: Validasi bukti tugas berhasil');

    // 9. Cek kelengkapan bab kelompok
    const resComp = await fetch(`${BASE_URL}/groups/group-1/check-completeness`, {
      method: 'POST',
    }).then(json);
    assert(
      typeof resComp.data?.overallScore === 'number',
      'Fitur F: Cek kelengkapan bab berhasil'
    );

    // 10. Skala kontribusi riil (Fitur G - Sriwijaya: Intan 42%, Rafi 5%)
    const resContrib = await fetch(`${BASE_URL}/groups/group-2/contributions`).then(json);
    const members = resContrib.data?.members || [];
    const rafi = members.find((m: any) => m.name.includes('Rafi'));
    const intan = members.find((m: any) => m.name.includes('Intan'));
    assert(
      rafi?.percentage === 5 && intan?.percentage === 42,
      `Fitur G: Skala kontribusi deterministik akurat (Intan: ${intan?.percentage}%, Rafi: ${rafi?.percentage}%)`
    );

    // 11. Role Guard & Normalisasi Role (Tugas 2)
    const resMuridAlerts = await fetch(`${BASE_URL}/rooms/room-2/alerts`, {
      headers: { 'x-role': 'STUDENT' },
    });
    const errStudent: any = await resMuridAlerts.json();
    assert(
      resMuridAlerts.status === 403 &&
        errStudent.error?.code === 'FORBIDDEN_TEACHER_ONLY' &&
        errStudent.ok === undefined,
      'Tugas 2: Role STUDENT ditolak 403 dengan format { error: { code, message } }'
    );

    const resAliasMurid = await fetch(`${BASE_URL}/rooms/room-2/alerts`, {
      headers: { 'x-role': 'murid' },
    });
    assert(
      resAliasMurid.status === 403,
      'Tugas 2: Alias lama "murid" berhasil dinormalisasi ke STUDENT (ditolak 403)'
    );

    // 12. Peringatan Ghosting Guru (Akses TEACHER & alias "guru")
    const resGuruAlerts = await fetch(`${BASE_URL}/rooms/room-2/alerts`, {
      headers: { 'x-role': 'TEACHER' },
    }).then(json);
    const alerts = resGuruAlerts.data?.alerts || [];
    assert(
      alerts.length > 0 &&
        alerts[0].memberName === 'Rafi Ahmad' &&
        alerts[0].kind === 'ghosting',
      `Tugas 2: Role TEACHER berhasil mengakses alerts dan mendeteksi murid pasif (${alerts[0]?.memberName})`
    );

    const resAliasGuru = await fetch(`${BASE_URL}/rooms/room-2/alerts`, {
      headers: { 'x-role': 'guru' },
    }).then(json);
    assert(
      Array.isArray(resAliasGuru.data?.alerts),
      'Tugas 2: Alias lama "guru" berhasil dinormalisasi ke TEACHER'
    );

    // 13. Ringkasan Guru (Fitur I)
    const resSummary = await fetch(`${BASE_URL}/groups/group-2/teacher-summary`, {
      headers: { 'x-role': 'TEACHER' },
    }).then(json);
    assert(
      Boolean(resSummary.data?.summary),
      'Fitur I: Ringkasan riwayat interaksi AI untuk guru berhasil'
    );

    // 14. Nudge murid pasif (Fitur J)
    const resNudge = await fetch(`${BASE_URL}/groups/group-2/nudge`, {
      method: 'POST',
    }).then(json);
    assert(
      Boolean(resNudge.data?.message),
      'Fitur J: Pengingat ramah (nudge) terkirim ke chat kelompok'
    );

    // 15. Handler 404 Route Tak Dikenal (Tugas 1)
    const res404 = await fetch(`${BASE_URL}/route-palsu-ngawur`);
    const data404: any = await res404.json();
    assert(
      res404.status === 404 && data404.error?.code === 'NOT_FOUND',
      'Tugas 1: Route tak dikenal ditangani handler 404 dengan code NOT_FOUND'
    );

    // 16. Analisis Keadilan Peer-Review (Langkah 1)
    const resStudentFairness = await fetch(`${BASE_URL}/rooms/room-2/analyze-fairness`, {
      method: 'POST',
      headers: { 'x-role': 'STUDENT' },
    });
    assert(
      resStudentFairness.status === 403,
      'Langkah 1: Role STUDENT ditolak 403 saat akses analyze-fairness'
    );

    const resTeacherFairness = await fetch(`${BASE_URL}/rooms/room-2/analyze-fairness`, {
      method: 'POST',
      headers: { 'x-role': 'TEACHER' },
    }).then(json);
    assert(
      resTeacherFairness.data?.totalReports === 2 &&
        typeof resTeacherFairness.data?.fairnessScore === 'number' &&
        resTeacherFairness.data?.fairnessScore >= 0 &&
        resTeacherFairness.data?.fairnessScore <= 100 &&
        Boolean(resTeacherFairness.data?.summary),
      'Langkah 1: Role TEACHER berhasil mendapatkan analisis keadilan skor 0-100 & ringkasan'
    );

    // 17. Analisis Keadilan saat Room belum memiliki laporan (Langkah 1)
    const resEmptyFairness = await fetch(`${BASE_URL}/rooms/room-1/analyze-fairness`, {
      method: 'POST',
      headers: { 'x-role': 'TEACHER' },
    }).then(json);
    assert(
      resEmptyFairness.data?.totalReports === 0 &&
        resEmptyFairness.data?.fairnessScore === 100 &&
        Boolean(resEmptyFairness.data?.summary),
      'Langkah 1: Room tanpa laporan menghasilkan respon kosong yang jelas (skor 100)'
    );

    // 18. Anonimisasi Pelapor & Sanitasi Nama di Teks Bebas (Langkah 2)
    await repo.savePeerReport({
      roomId: 'room-2',
      groupId: 'group-2',
      reporterId: 'm-intan',
      reportedMemberId: 'm-dani',
      reportedMemberName: 'Dani Saputra',
      rating: 2,
      feedback: 'Saya Intan Permata (m-intan), saya dan Intan merasa beban tugas tidak seimbang.',
    });

    await fetch(`${BASE_URL}/rooms/room-2/analyze-fairness`, {
      method: 'POST',
      headers: { 'x-role': 'TEACHER' },
    });

    const lastPrompt = LlmClient.getLastPrompt() || '';
    const hasReporterFullName = lastPrompt.includes('Intan Permata');
    const hasReporterFirstName = /\bIntan\b/i.test(lastPrompt);
    const hasReporterId = lastPrompt.includes('m-intan');
    const hasReporterAlias = lastPrompt.includes('Pelapor-1');
    const hasReportedName = lastPrompt.includes('Dani Saputra');

    assert(
      !hasReporterFullName && !hasReporterFirstName && !hasReporterId && hasReporterAlias && hasReportedName,
      'Langkah 2: Prompt ke LLM bebas dari nama & ID asli pelapor di teks feedback, tersamarkan menjadi alias'
    );

    // 19. Data asli di repository tidak dimodifikasi oleh proses anonimisasi
    const room2Reports = await repo.getPeerReportsByRoom('room-2');
    const originalReport = room2Reports.find((r) => r.reportedMemberName === 'Dani Saputra');
    assert(
      originalReport?.feedback.includes('Saya Intan Permata') === true,
      'Langkah 2: Data asli laporan di repository tetap utuh dan tidak dimodifikasi'
    );

    // 20. Proteksi Akses Siswa Terhadap Endpoint Khusus Guru
    const resTranscriptStudent = await fetch(`${BASE_URL}/groups/group-2/transcript`, {
      headers: { 'x-role': 'STUDENT' },
    });
    const resSummaryStudent = await fetch(`${BASE_URL}/groups/group-2/teacher-summary`, {
      headers: { 'x-role': 'STUDENT' },
    });
    assert(
      resTranscriptStudent.status === 403 && resSummaryStudent.status === 403,
      'Langkah 2: Role STUDENT ditolak 403 dari endpoint transcript & teacher-summary'
    );

    // 21. Endpoint Pesan Siswa Tidak Membocorkan Peer Report
    const resGroupMsgs = await fetch(`${BASE_URL}/groups/group-2/messages`).then(json);
    const msgsStr = JSON.stringify(resGroupMsgs);
    assert(
      !msgsStr.includes('Intan Permata') &&
        !msgsStr.includes('Pelapor-') &&
        !msgsStr.includes('beban tugas tidak seimbang'),
      'Langkah 2: Endpoint pesan murid bebas dari kebocoran data peer report'
    );

    // 22. Perbaikan Langkah 2: LlmClient.getLastPrompt() hanya aktif saat NODE_ENV === 'test'
    process.env.NODE_ENV = 'production';
    const promptInProd = LlmClient.getLastPrompt();
    process.env.NODE_ENV = 'test';
    const promptInTest = LlmClient.getLastPrompt();
    assert(
      promptInProd === undefined && typeof promptInTest === 'string',
      'Perbaikan Langkah 2: getLastPrompt() mengembalikan undefined di luar NODE_ENV test'
    );

    // 23. Perbaikan Langkah 2: Word boundary & Proteksi nama tumpang tindih
    const group2 = await repo.getGroup('group-2');
    if (group2) {
      group2.members.push({ id: 'm-ani', name: 'Ani' });
    }

    await repo.savePeerReport({
      roomId: 'room-2',
      groupId: 'group-2',
      reporterId: 'm-ani',
      reportedMemberId: 'm-daniel',
      reportedMemberName: 'Daniel Surya',
      rating: 2,
      feedback: 'Saya Ani sudah mengingatkan Daniel berkali-kali.',
    });

    await repo.savePeerReport({
      roomId: 'room-2',
      groupId: 'group-2',
      reporterId: 'm-fajar',
      reportedMemberId: 'm-fajar-ahmad',
      reportedMemberName: 'Fajar Ahmad',
      rating: 1,
      feedback: 'Saya Fajar Nugraha melaporkan bahwa Fajar Ahmad sama sekali belum mengirim tugas.',
    });

    await fetch(`${BASE_URL}/rooms/room-2/analyze-fairness`, {
      method: 'POST',
      headers: { 'x-role': 'TEACHER' },
    });

    const boundaryPrompt = LlmClient.getLastPrompt() || '';
    const danielIntact = boundaryPrompt.includes('Daniel') && !boundaryPrompt.includes('DPelapor');
    const fajarAhmadIntact = boundaryPrompt.includes('Fajar Ahmad');
    const aniRedacted = !/\bAni\b/i.test(boundaryPrompt.replace(/Daniel/g, ''));
    const fajarNugrahaRedacted = !boundaryPrompt.includes('Fajar Nugraha');

    assert(
      danielIntact && fajarAhmadIntact && aniRedacted && fajarNugrahaRedacted,
      'Perbaikan Langkah 2: Word boundary tepat ("Ani" tidak merusak "Daniel") dan nama orang terlapor ("Fajar Ahmad") tidak tertukar'
    );

    // 24. Langkah 3: Ketahanan Fallback LlmClient saat output rusak / error
    const testFallback = { fallbackField: 'aman', score: 100 };
    const directFallbackResult = await LlmClient.generateJSON(
      'prompt invalid json test',
      {},
      testFallback
    );
    assert(
      directFallbackResult.fallbackField === 'aman' && directFallbackResult.score === 100,
      'Langkah 3: LlmClient.generateJSON selalu mengembalikan fallback deterministik saat mode mock atau error'
    );

    // 25. Langkah 3: Validasi Zod dan Fallback pada SuggestionService
    const resSplitValid = await fetch(`${BASE_URL}/groups/group-1/split-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Topik Riset Zod Validation' }),
    }).then(json);
    const assignmentsValid = resSplitValid.data?.assignments || [];
    assert(
      assignmentsValid.every(
        (a: any) =>
          typeof a.weightPercent === 'number' &&
          a.weightPercent >= 0 &&
          a.weightPercent <= 100 &&
          typeof a.title === 'string'
      ),
      'Langkah 3: Output split-roles tervalidasi skema Zod (bobot 0-100, field terstruktur)'
    );

    // 26. Langkah 3: Validasi Zod pada ValidationService
    const resValTask = await fetch(`${BASE_URL}/tasks/task-1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceUrl: 'https://docs.google.com/valid' }),
    }).then(json);
    assert(
      typeof resValTask.data?.score === 'number' &&
        resValTask.data?.score >= 0 &&
        resValTask.data?.score <= 100 &&
        ['valid', 'incomplete', 'suspicious'].includes(resValTask.data?.status),
      'Langkah 3: Output validasi tugas tervalidasi skema Zod (skor 0-100 dan status enum sah)'
    );
  } catch (e: any) {
    console.error('Terjadi error saat pengujian:', e);
    allPassed = false;
  } finally {
    server.close();
    console.log('\n=========================================');
    if (allPassed) {
      console.log('🎉 SEMUA 26 PENGUJIAN FITUR & KONTRAK BARU BERHASIL (100% PASS)!');
    } else {
      console.log('⚠️ TERDAPAT PENGUJIAN YANG GAGAL.');
    }
    console.log('=========================================\n');
    process.exit(allPassed ? 0 : 1);
  }
}

runTests();
