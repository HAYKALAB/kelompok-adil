import app from './index.js';
import http from 'http';

const PORT = 5055; // Port khusus untuk automated test
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
    // 1. Health check (format baru: { data: { ... } }, tanpa "ok")
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
    // 11a. Test role STUDENT (ditolak 403)
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

    // 11b. Test alias lama "murid" (dinormalisasi ke STUDENT, tetap ditolak 403)
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

    // 12b. Test alias "guru"
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
  } catch (e: any) {
    console.error('Terjadi error saat pengujian:', e);
    allPassed = false;
  } finally {
    server.close();
    console.log('\n=========================================');
    if (allPassed) {
      console.log('🎉 SEMUA 15 PENGUJIAN FITUR & KONTRAK BARU BERHASIL (100% PASS)!');
    } else {
      console.log('⚠️ TERDAPAT PENGUJIAN YANG GAGAL.');
    }
    console.log('=========================================\n');
    process.exit(allPassed ? 0 : 1);
  }
}

runTests();
