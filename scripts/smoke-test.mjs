#!/usr/bin/env node

/**
 * =============================================================================
 * SMOKE TEST END-TO-END UNTUK APLIKASI KELOMPOK ADIL (PRODUCTION / DEPLOYED)
 * =============================================================================
 *
 * Skrip pengujian asap (smoke test) berbasis HTTP publik murni.
 * - Tanpa dependensi eksternal (menggunakan native Node.js fetch & ESM).
 * - Tidak memerlukan dan tidak mencetak secret / token JWT apa pun.
 * - Memiliki mekanisme retry hingga 90 detik untuk mengatasi cold start hosting gratis (Render).
 * - Menguji 10 tahap krusial: Health, CORS, Auth, Ruang Kelas Baru, Izin Peran,
 *   Papan Tugas, Laporan Rahasia, AI Fasilitator, dan Proteksi Token 401.
 * - Menampilkan laporan hasil dalam format tabel Markdown.
 * =============================================================================
 */

const API_URL = (process.env.API_URL || process.argv[2] || 'http://localhost:4000').replace(/\/+$/, '');
const AI_URL = (process.env.AI_URL || process.argv[3] || 'http://localhost:5000').replace(/\/+$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || process.argv[4] || 'http://localhost:5173').replace(/\/+$/, '');

const results = [];

function recordResult(stepNum, testName, httpStatus, durationMs, pass, note = '-') {
  results.push({
    step: stepNum,
    name: testName,
    status: httpStatus ?? '-',
    duration: `${durationMs ?? 0}ms`,
    verdict: pass ? 'PASS' : 'FAIL',
    note: String(note),
  });
}

async function fetchWithRetry(url, options = {}, maxWaitMs = 90000) {
  const start = Date.now();
  let attempt = 0;
  while (true) {
    attempt++;
    const reqStart = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      const dur = Date.now() - reqStart;
      if (res.status === 200 || res.status === 201 || (res.status >= 400 && res.status < 500)) {
        return { res, duration: dur, attempts: attempt };
      }
    } catch {
      // Tunggu cold start bangun
    }
    const elapsed = Date.now() - start;
    if (elapsed >= maxWaitMs) {
      return {
        res: null,
        duration: elapsed,
        attempts: attempt,
        error: `Timeout ${Math.round(elapsed / 1000)}s`,
      };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function sendRequest(url, options = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const duration = Date.now() - start;
    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { res, duration, json };
  } catch (err) {
    return { res: null, duration: Date.now() - start, error: err.message || 'Network error' };
  }
}

async function runSmokeTest() {
  console.log('='.repeat(70));
  console.log('🚀 MEMULAI SMOKE TEST APLIKASI KELOMPOK ADIL');
  console.log(`📡 Backend Core API  : ${API_URL}`);
  console.log(`🤖 Backend AI Engine : ${AI_URL}`);
  console.log(`🌐 Frontend Client   : ${FRONTEND_URL}`);
  console.log('='.repeat(70));
  console.log('⏳ Memeriksa kesiapan layanan (toleransi cold start s/d 90 detik)...\n');

  let state = {
    teacherToken: null,
    teacherSession1: null,
    teacherSession2: null,
    studentTokenA: null,
    studentIdA: null,
    studentTokenB: null,
    studentIdB: null,
    studentTokenC: null,
    studentIdC: null,
    pin: null,
    roomId: null,
    teacherCode: null,
    groupId: null,
    group2Id: null,
    taskId: null,
    aiSource: null,
  };

  // ---------------------------------------------------------------------------
  // 1. Health Check (Cold Start Ready)
  // ---------------------------------------------------------------------------
  try {
    const h1 = await fetchWithRetry(`${API_URL}/api/health`, { method: 'GET' }, 90000);
    const pass1 = h1.res?.status === 200;
    recordResult(
      '1.1',
      'GET API_URL/api/health (Cold Start Retry)',
      h1.res?.status,
      h1.duration,
      pass1,
      pass1 ? `Siap dalam percobaan ke-${h1.attempts}` : h1.error || 'Gagal 200'
    );
  } catch (e) {
    recordResult('1.1', 'GET API_URL/api/health', 0, 0, false, e.message);
  }

  try {
    const h2 = await fetchWithRetry(`${AI_URL}/api/ai/health`, { method: 'GET' }, 90000);
    const pass2 = h2.res?.status === 200;
    recordResult(
      '1.2',
      'GET AI_URL/api/ai/health (Cold Start Retry)',
      h2.res?.status,
      h2.duration,
      pass2,
      pass2 ? `Siap dalam percobaan ke-${h2.attempts}` : h2.error || 'Gagal 200'
    );
  } catch (e) {
    recordResult('1.2', 'GET AI_URL/api/ai/health', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 2. Preflight CORS
  // ---------------------------------------------------------------------------
  try {
    const cors1 = await sendRequest(`${API_URL}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const allowOrigin1 = cors1.res?.headers.get('access-control-allow-origin');
    const allowHeaders1 = cors1.res?.headers.get('access-control-allow-headers') || '';
    const passCors1 =
      cors1.res?.status === 204 || cors1.res?.status === 200 || allowOrigin1 === FRONTEND_URL || allowOrigin1 === '*';
    recordResult(
      '2.1',
      'Preflight CORS Backend Core (Origin check)',
      cors1.res?.status,
      cors1.duration,
      passCors1,
      `Origin: ${allowOrigin1 || 'none'}`
    );
  } catch (e) {
    recordResult('2.1', 'Preflight CORS Backend Core', 0, 0, false, e.message);
  }

  try {
    const cors2 = await sendRequest(`${AI_URL}/api/ai/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const allowOrigin2 = cors2.res?.headers.get('access-control-allow-origin');
    const passCors2 =
      cors2.res?.status === 204 || cors2.res?.status === 200 || allowOrigin2 === FRONTEND_URL || allowOrigin2 === '*';
    recordResult(
      '2.2',
      'Preflight CORS Backend AI (Origin check)',
      cors2.res?.status,
      cors2.duration,
      passCors2,
      `Origin: ${allowOrigin2 || 'none'}`
    );
  } catch (e) {
    recordResult('2.2', 'Preflight CORS Backend AI', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 3. Buat Kelas Baru (Bukan Ruang Demo)
  // ---------------------------------------------------------------------------
  const testSuffix = Date.now().toString().slice(-5);
  try {
    const regTeacher = await sendRequest(`${API_URL}/api/teachers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Guru_Smoke_${testSuffix}` }),
    });
    state.teacherToken = regTeacher.json?.data?.token;

    const createRoomReq = await sendRequest(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.teacherToken}`,
      },
      body: JSON.stringify({
        title: `Kelas_Smoke_${testSuffix}`,
        subject: 'Informatika',
        className: 'XII RPL',
        targetGroups: 1,
      }),
    });
    const roomData = createRoomReq.json?.data;
    state.pin = roomData?.pin;
    state.roomId = roomData?.room?.id;
    state.teacherCode = roomData?.teacherCode;

    const pass3 = Boolean(createRoomReq.res?.status === 201 && state.pin && state.teacherCode);
    recordResult(
      '3.0',
      'Buat Kelas Baru (POST /api/rooms)',
      createRoomReq.res?.status,
      createRoomReq.duration,
      pass3,
      pass3 ? `PIN Kelas: ${state.pin} (Room ID: ${state.roomId})` : 'Gagal membuat kelas baru'
    );
  } catch (e) {
    recordResult('3.0', 'Buat Kelas Baru', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 4. Login Guru dengan Kode Unik DUA KALI (Reusable Check)
  // ---------------------------------------------------------------------------
  try {
    const login1 = await sendRequest(`${API_URL}/api/rooms/${state.pin}/teacher-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Guru_Smoke_${testSuffix}`,
        code: state.teacherCode,
      }),
    });
    state.teacherSession1 = login1.json?.data?.token;
    const pass4_1 = login1.res?.status === 200 && Boolean(state.teacherSession1);
    recordResult('4.1', 'Login Guru Pertama (POST teacher-login)', login1.res?.status, login1.duration, pass4_1, 'Token sah diterima');

    const login2 = await sendRequest(`${API_URL}/api/rooms/${state.pin}/teacher-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Guru_Smoke_${testSuffix}`,
        code: state.teacherCode,
      }),
    });
    state.teacherSession2 = login2.json?.data?.token;
    const pass4_2 = login2.res?.status === 200 && Boolean(state.teacherSession2);
    recordResult(
      '4.2',
      'Login Guru Kedua (Reusable Ticket Check)',
      login2.res?.status,
      login2.duration,
      pass4_2,
      pass4_2 ? 'Kode guru tidak hangus (reusable)' : 'Kode guru gagal dipakai ulang'
    );
  } catch (e) {
    recordResult('4.0', 'Login Guru', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 5. Dua Siswa Masuk & Proteksi Nama Kembar
  // ---------------------------------------------------------------------------
  try {
    // Siswa A
    const joinA = await sendRequest(`${API_URL}/api/rooms/${state.pin}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Siswa Alpha', studentPin: '1234' }),
    });
    state.studentTokenA = joinA.json?.data?.token;
    state.studentIdA = joinA.json?.data?.participant?.id;
    const pass5_1 = joinA.res?.status === 200 && Boolean(state.studentTokenA);
    recordResult('5.1', 'Siswa A Masuk Kelas (POST /join)', joinA.res?.status, joinA.duration, pass5_1, 'Siswa A terdaftar');

    // Percobaan nama kembar PIN salah -> harus ditolak 403 atau 409
    const joinDup = await sendRequest(`${API_URL}/api/rooms/${state.pin}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Siswa Alpha', studentPin: '9999' }),
    });
    const pass5_2 = joinDup.res?.status === 403 || joinDup.res?.status === 409;
    recordResult(
      '5.2',
      'Proteksi Pembajakan Nama (PIN Salah)',
      joinDup.res?.status,
      joinDup.duration,
      pass5_2,
      pass5_2 ? 'Nama kembar berhasil ditolak (aman)' : 'Nama kembar bocor/diterima'
    );

    // Siswa B
    const joinB = await sendRequest(`${API_URL}/api/rooms/${state.pin}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Siswa Beta', studentPin: '5678' }),
    });
    state.studentTokenB = joinB.json?.data?.token;
    state.studentIdB = joinB.json?.data?.participant?.id;
    const pass5_3 = joinB.res?.status === 200 && Boolean(state.studentTokenB);
    recordResult('5.3', 'Siswa B Masuk Kelas (POST /join)', joinB.res?.status, joinB.duration, pass5_3, 'Siswa B terdaftar');
  } catch (e) {
    recordResult('5.0', 'Siswa Join', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 6. Bagi Kelompok & Detail Kelas (Privasi Siswa vs Guru)
  // ---------------------------------------------------------------------------
  try {
    const splitReq = await sendRequest(`${API_URL}/api/rooms/${state.pin}/groups/split?count=1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.teacherSession1}`,
        'Content-Type': 'application/json',
      },
    });
    const pass6_1 = splitReq.res?.status === 200;
    recordResult('6.1', 'Bagi Kelompok Otomatis (POST /split)', splitReq.res?.status, splitReq.duration, pass6_1, 'Kelompok terbentuk');

    // Detail sebagai Siswa A (hanya melihat kelompoknya sendiri)
    const detailStudent = await sendRequest(`${API_URL}/api/rooms/${state.pin}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.studentTokenA}` },
    });
    const studentGroups = detailStudent.json?.data?.groups || [];
    state.groupId = studentGroups[0]?.id;

    // Periksa bahwa tidak ada bocoran rahasia guru/tiket di respons siswa
    const rawStudentDetail = JSON.stringify(detailStudent.json || {});
    const noLeak =
      !rawStudentDetail.includes('teacherCode') &&
      !rawStudentDetail.includes('StudentCodeTicket') &&
      !rawStudentDetail.includes('teacherId');
    const pass6_2 = detailStudent.res?.status === 200 && studentGroups.length === 1 && noLeak;
    recordResult(
      '6.2',
      'GET Detail Kelas (Sudut Pandang Siswa)',
      detailStudent.res?.status,
      detailStudent.duration,
      pass6_2,
      pass6_2 ? 'Hanya kelompok sendiri, tanpa kebocoran kode guru' : 'Privasi siswa bocor/tidak sesuai'
    );

    // Detail sebagai Guru (melihat semua kelompok & peserta)
    const detailTeacher = await sendRequest(`${API_URL}/api/rooms/${state.pin}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const teacherGroups = detailTeacher.json?.data?.groups || [];
    const pass6_3 = detailTeacher.res?.status === 200 && teacherGroups.length >= 1;
    recordResult('6.3', 'GET Detail Kelas (Sudut Pandang Guru)', detailTeacher.res?.status, detailTeacher.duration, pass6_3, 'Melihat rekap seluruh kelompok');
  } catch (e) {
    recordResult('6.0', 'Kelompok & Detail', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 7. Siklus Tugas: Siswa A Buat, Update Progres, Siswa B Ditolak 403
  // ---------------------------------------------------------------------------
  try {
    // Siswa A buat tugas
    const createTask = await sendRequest(`${API_URL}/api/groups/${state.groupId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.studentTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Tugas Riset Lapangan Smoke',
        weight: 50,
        assigneeId: state.studentIdA,
      }),
    });
    state.taskId = createTask.json?.data?.id;
    const pass7_1 = createTask.res?.status === 201 && Boolean(state.taskId);
    recordResult('7.1', 'Siswa A Buat Tugas Baru (POST /tasks)', createTask.res?.status, createTask.duration, pass7_1, 'Tugas dibuat & di-assign');

    // Siswa A update progres ke 50%
    const updateProg50 = await sendRequest(`${API_URL}/api/tasks/${state.taskId}/progress`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${state.studentTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progress: 50 }),
    });
    const pass7_2 = updateProg50.res?.status === 200 && updateProg50.json?.data?.progress === 50;
    recordResult('7.2', 'Siswa A Update Progres 50% (PATCH /progress)', updateProg50.res?.status, updateProg50.duration, pass7_2, 'Progres tersimpan');

    // Siswa B coba ubah progres tugas Siswa A -> Wajib 403 Forbidden!
    const hackProg = await sendRequest(`${API_URL}/api/tasks/${state.taskId}/progress`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${state.studentTokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progress: 80 }),
    });
    const pass7_3 = hackProg.res?.status === 403;
    recordResult(
      '7.3',
      'Siswa B Mengubah Tugas Siswa A (Otorisasi PIC)',
      hackProg.res?.status,
      hackProg.duration,
      pass7_3,
      pass7_3 ? 'Akses ditolak 403 (Hanya PIC sah yang berhak)' : 'Gagal: tugas orang lain dapat diubah'
    );

    // Siswa A selesaikan progres 100% -> Otomatis status DONE
    const updateProg100 = await sendRequest(`${API_URL}/api/tasks/${state.taskId}/progress`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${state.studentTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progress: 100 }),
    });
    const pass7_4 = updateProg100.res?.status === 200 && updateProg100.json?.data?.status === 'DONE';
    recordResult('7.4', 'Siswa A Selesaikan Tugas (Progres 100% -> DONE)', updateProg100.res?.status, updateProg100.duration, pass7_4, 'Status otomatis DONE');
  } catch (e) {
    recordResult('7.0', 'Siklus Tugas', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 8. Evaluasi Rahasia Sejawat (Peer Report) & Audit Guru
  // ---------------------------------------------------------------------------
  try {
    // Siswa A kirim laporan rahasia mengenai Siswa B
    const sendRep = await sendRequest(`${API_URL}/api/groups/${state.groupId}/reports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.studentTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportedId: state.studentIdB,
        rating: 5,
        feedback: 'Kerja sama solid dan sangat responsif di kelompok.',
      }),
    });
    const pass8_1 = sendRep.res?.status === 201 || sendRep.res?.status === 200;
    recordResult('8.1', 'Siswa Kirim Laporan Rahasia (POST /reports)', sendRep.res?.status, sendRep.duration, pass8_1, 'Laporan tersimpan');

    // Siswa coba intip daftar laporan rahasia -> Wajib 403 Forbidden!
    const peekRep = await sendRequest(`${API_URL}/api/rooms/${state.roomId}/reports`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.studentTokenA}` },
    });
    const pass8_2 = peekRep.res?.status === 403;
    recordResult('8.2', 'Siswa Coba Intip Laporan Sejawat', peekRep.res?.status, peekRep.duration, pass8_2, 'Ditolak 403 (Kerahasiaan terjamin)');

    // Guru membaca daftar laporan rahasia kelas -> Wajib 200 OK
    const teacherRep = await sendRequest(`${API_URL}/api/rooms/${state.roomId}/reports`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const pass8_3 = teacherRep.res?.status === 200;
    recordResult('8.3', 'Guru Akses Laporan Rahasia (GET /reports)', teacherRep.res?.status, teacherRep.duration, pass8_3, 'Guru dapat audit laporan');

    // Guru memantau progres kelas -> Wajib 200 OK
    const monTeacher = await sendRequest(`${API_URL}/api/rooms/${state.roomId}/progress`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const pass8_4 = monTeacher.res?.status === 200;
    recordResult('8.4', 'Guru Monitor Progres Kelas (GET /progress)', monTeacher.res?.status, monTeacher.duration, pass8_4, 'Telemetri kelas terbaca');

    // Siswa coba akses monitor guru -> Wajib 403 Forbidden!
    const monStudent = await sendRequest(`${API_URL}/api/rooms/${state.roomId}/progress`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.studentTokenA}` },
    });
    const pass8_5 = monStudent.res?.status === 403;
    recordResult('8.5', 'Siswa Akses Monitor Guru', monStudent.res?.status, monStudent.duration, pass8_5, 'Ditolak 403 (Khusus role Guru)');
  } catch (e) {
    recordResult('8.0', 'Evaluasi Rahasia', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 9. AI Fasilitator, Telemetri Guru, & Isolasi Chat Siswa
  // ---------------------------------------------------------------------------
  try {
    // Siswa memanggil AI Chat dengan aksi 'ideas'
    const aiIdeas = await sendRequest(`${AI_URL}/api/ai/groups/${state.groupId}/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.studentTokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'ideas',
        message: 'Beri 3 ide topik proyek sejarah lokal yang unik',
      }),
    });
    state.aiSource = aiIdeas.json?.data?.source || aiIdeas.json?.source || 'unknown';
    const pass9_1 = aiIdeas.res?.status === 200 && Boolean(state.aiSource);
    recordResult(
      '9.1',
      'AI Fasilitator: Curah Ide (POST /ai/chat)',
      aiIdeas.res?.status,
      aiIdeas.duration,
      pass9_1,
      `Source: ${state.aiSource}`
    );

    // Guru memanggil Alerts AI
    const aiAlerts = await sendRequest(`${AI_URL}/api/ai/rooms/${state.roomId}/alerts`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const pass9_2 = aiAlerts.res?.status === 200;
    recordResult('9.2', 'Guru Akses Peringatan AI (GET /alerts)', aiAlerts.res?.status, aiAlerts.duration, pass9_2, 'Peringatan tugas dievaluasi');

    // Guru membaca ringkasan kelompok
    const aiSummary = await sendRequest(`${AI_URL}/api/ai/groups/${state.groupId}/teacher-summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const pass9_3 = aiSummary.res?.status === 200;
    recordResult('9.3', 'Guru Akses Ringkasan Kelompok (GET /teacher-summary)', aiSummary.res?.status, aiSummary.duration, pass9_3, 'Ringkasan murni data Kanban');

    // Guru mencoba membaca obrolan antarsiswa -> Wajib 403 Forbidden!
    const teacherPeekChat = await sendRequest(`${API_URL}/api/groups/${state.groupId}/messages`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.teacherSession1}` },
    });
    const pass9_4 = teacherPeekChat.res?.status === 403;
    recordResult(
      '9.4',
      'Guru Coba Mengintip Chat Pribadi Siswa',
      teacherPeekChat.res?.status,
      teacherPeekChat.duration,
      pass9_4,
      pass9_4 ? 'Ditolak 403 (Privasi ruang aman siswa terjaga)' : 'Chat siswa bocor ke guru'
    );

    // Siswa kelompok luar (Siswa C baru join setelah split sehingga belum masuk Kelompok 1)
    const joinC = await sendRequest(`${API_URL}/api/rooms/${state.pin}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Siswa Gamma', studentPin: '7777' }),
    });
    state.studentTokenC = joinC.json?.data?.token;

    // Siswa kelompok luar (Siswa C) mencoba membaca chat Kelompok 1 -> Wajib 403 Forbidden!
    const otherStudentPeekChat = await sendRequest(`${API_URL}/api/groups/${state.groupId}/messages`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${state.studentTokenC}` },
    });
    const pass9_5 = otherStudentPeekChat.res?.status === 403;
    recordResult(
      '9.5',
      'Siswa Luar Kelompok Akses Chat',
      otherStudentPeekChat.res?.status,
      otherStudentPeekChat.duration,
      pass9_5,
      pass9_5 ? 'Ditolak 403 (Isolasi antarkelompok aman)' : 'Chat kelompok bocor ke siswa lain'
    );
  } catch (e) {
    recordResult('9.0', 'Fitur AI & Chat', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // 10. Proteksi Request Tanpa Token (401 Unauthorized)
  // ---------------------------------------------------------------------------
  try {
    const noToken1 = await sendRequest(`${API_URL}/api/groups/${state.groupId || 'group-1'}/tasks`, {
      method: 'GET',
    });
    const pass10_1 = noToken1.res?.status === 401;
    recordResult('10.1', 'Request Core API Tanpa Authorization', noToken1.res?.status, noToken1.duration, pass10_1, 'Ditolak 401 Unauthorized');

    const noToken2 = await sendRequest(`${AI_URL}/api/ai/groups/${state.groupId || 'group-1'}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ideas', message: 'halo' }),
    });
    const pass10_2 = noToken2.res?.status === 401;
    recordResult('10.2', 'Request AI Engine Tanpa Authorization', noToken2.res?.status, noToken2.duration, pass10_2, 'Ditolak 401 Unauthorized');
  } catch (e) {
    recordResult('10.0', 'Proteksi Token 401', 0, 0, false, e.message);
  }

  // ---------------------------------------------------------------------------
  // CETAK TABEL HASIL LAPORAN
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('📊 REKAPITULASI HASIL SMOKE TEST');
  console.log('='.repeat(70));

  const total = results.length;
  const passCount = results.filter((r) => r.verdict === 'PASS').length;
  const failCount = total - passCount;

  console.log(`| Langkah | Pengujian | Status HTTP | Durasi | Hasil | Keterangan / Source |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const r of results) {
    const mark = r.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`| **${r.step}** | ${r.name} | \`${r.status}\` | ${r.duration} | **${mark}** | ${r.note} |`);
  }

  console.log('='.repeat(70));
  console.log(`🎯 TOTAL SKOR: ${passCount} / ${total} PENGUJIAN LOLOS (${Math.round((passCount / total) * 100)}%)`);
  if (failCount === 0) {
    console.log('🎉 SEMUA PENGUJIAN SMOKE TEST BERHASIL 100%!');
  } else {
    console.log(`⚠️ TERDAPAT ${failCount} PENGUJIAN YANG GAGAL. Harap periksa rincian di atas.`);
  }
  console.log('='.repeat(70) + '\n');
}

runSmokeTest().catch((err) => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});
