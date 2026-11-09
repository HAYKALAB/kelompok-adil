import 'dotenv/config';
import { getPrisma } from '../src/lib/prisma.js';

/**
 * Seed data fiktif + 1 kelas demo tetap.
 * Idempotent: upsert untuk entitas ber-key, hapus+buat untuk data dinamis per grup.
 *
 * Kelas demo tetap:
 *   PIN room        : 123456
 *   Kode guru       : GURU-DEMO-2026
 *   Kode siswa      : SISWA-MAJAPAHIT-01 .. 08
 */

const DEMO_PIN = '123456';
const DEMO_TEACHER_CODE = 'GURU-DEMO-2026';
const DEMO_ROOM_TITLE = 'Proyek Sejarah Majapahit';
const DEMO_ROOM_SUBJECT = 'Sejarah Nusantara';
const DEMO_ROOM_CLASS = 'XI IPS 2';

const FUTURE = new Date('2026-12-31T23:59:59+07:00');
const ROOM_DEADLINE = new Date('2026-11-20T23:59:00+07:00');

async function main() {
  const prisma = getPrisma();
  console.log('Menjalankan seed database...');

  // --- Users ---
  const teacher = await prisma.user.upsert({
    where: { email: 'ratna@demo.sch.id' },
    update: { name: 'Ibu Ratna, M.Pd.', role: 'TEACHER' },
    create: { name: 'Ibu Ratna, M.Pd.', email: 'ratna@demo.sch.id', role: 'TEACHER' },
  });

  const studentDefs = [
    { name: 'Dafano', email: 'dafano@demo.sch.id' },
    { name: 'Nadya', email: 'nadya@demo.sch.id' },
    { name: 'Bima', email: 'bima@demo.sch.id' },
    { name: 'Salsa', email: 'salsa@demo.sch.id' },
    { name: 'Intan Permata', email: 'intan@demo.sch.id' },
    { name: 'Fajar Nugraha', email: 'fajar@demo.sch.id' },
    { name: 'Dani Saputra', email: 'dani@demo.sch.id' },
    { name: 'Rafi Ahmad', email: 'rafi@demo.sch.id' },
  ];

  const students = [];
  for (const s of studentDefs) {
    students.push(
      await prisma.user.upsert({
        where: { email: s.email },
        update: { name: s.name, role: 'STUDENT' },
        create: { name: s.name, email: s.email, role: 'STUDENT' },
      })
    );
  }

  // --- Room (kelas demo tetap) ---
  const room = await prisma.room.upsert({
    where: { pin: DEMO_PIN },
    update: {
      title: DEMO_ROOM_TITLE,
      subject: DEMO_ROOM_SUBJECT,
      className: DEMO_ROOM_CLASS,
      aiEnabled: true,
      deadline: ROOM_DEADLINE,
      teacherId: teacher.id,
      status: 'ACTIVE',
    },
    create: {
      pin: DEMO_PIN,
      title: DEMO_ROOM_TITLE,
      subject: DEMO_ROOM_SUBJECT,
      className: DEMO_ROOM_CLASS,
      aiEnabled: true,
      deadline: ROOM_DEADLINE,
      teacherId: teacher.id,
      status: 'ACTIVE',
    },
  });

  // --- Tiket kode guru (tetap) ---
  await prisma.teacherCodeTicket.upsert({
    where: { code: DEMO_TEACHER_CODE },
    update: { roomId: room.id, teacherId: teacher.id, expiresAt: FUTURE },
    create: {
      code: DEMO_TEACHER_CODE,
      roomId: room.id,
      teacherId: teacher.id,
      expiresAt: FUTURE,
    },
  });

  // --- Groups (4 kelompok) ---
  const groupNames = [
    'Kelompok 1: Majapahit',
    'Kelompok 2: Sriwijaya Bahari',
    'Kelompok 3: Kerajaan Mataram',
    'Kelompok 4: Perjalanan Dagang Nusantara',
  ];
  const groups = [];
  for (let i = 0; i < groupNames.length; i++) {
    groups.push(
      await prisma.group.upsert({
        where: { roomId_groupNumber: { roomId: room.id, groupNumber: i + 1 } },
        update: { name: groupNames[i] },
        create: { roomId: room.id, groupNumber: i + 1, name: groupNames[i] },
      })
    );
  }

  // --- Participants (2 anggota per kelompok) ---
  const participants = [];
  for (let i = 0; i < studentDefs.length; i++) {
    const group = groups[Math.floor(i / 2)];
    participants.push(
      await prisma.roomParticipant.upsert({
        where: { roomId_name: { roomId: room.id, name: studentDefs[i].name } },
        update: { userId: students[i].id, role: 'STUDENT', groupId: group.id },
        create: {
          roomId: room.id,
          userId: students[i].id,
          name: studentDefs[i].name,
          role: 'STUDENT',
          groupId: group.id,
        },
      })
    );
  }

  // --- Tiket kode siswa (tetap per anggota) ---
  for (let i = 0; i < participants.length; i++) {
    const code = `SISWA-MAJAPAHIT-${String(i + 1).padStart(2, '0')}`;
    await prisma.studentCodeTicket.upsert({
      where: { code },
      update: { roomId: room.id, studentId: students[i].id, expiresAt: FUTURE },
      create: { code, roomId: room.id, studentId: students[i].id, expiresAt: FUTURE },
    });
  }

  // --- Data dinamis per grup (idempotent: hapus dulu, lalu buat) ---
  const groupIds = groups.map((g) => g.id);
  const member = (gi: number, mi: number) => participants[gi * 2 + mi];

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  await prisma.$transaction(async (tx) => {
    await tx.peerReport.deleteMany({ where: { roomId: room.id } });
    await tx.aiFlag.deleteMany({ where: { groupId: { in: groupIds } } });
    await tx.aiSuggestion.deleteMany({ where: { groupId: { in: groupIds } } });
    await tx.groupMessage.deleteMany({ where: { groupId: { in: groupIds } } });
    await tx.activity.deleteMany({ where: { groupId: { in: groupIds } } });
    await tx.task.deleteMany({ where: { groupId: { in: groupIds } } });

    // Tasks: 2 per group
    const taskDefs = [
      { gi: 0, title: 'Studi Pustaka Negarakretagama', description: 'Rangkum biografi Kertanegara dari kakawin pupuh 13-16', weight: 60, status: 'IN_PROGRESS', ai: 0, deadline: new Date(now.getTime() + 3 * day), evidenceType: 'GOOGLE_DOCS' },
      { gi: 0, title: 'Peta Wilayah Kekuasaan Maritim', description: 'Visualisasi jalur ekspedisi laut Majapahit', weight: 40, status: 'TODO', ai: 1, deadline: new Date(now.getTime() + 5 * day), evidenceType: 'SLIDE' },
      { gi: 1, title: 'Riset Prasasti Kedukan Bukit', description: 'Transkripsi isi prasasti dan rute dapunta hyang', weight: 55, status: 'DONE', ai: 0, deadline: new Date(now.getTime() - 1 * day), evidenceType: 'GOOGLE_DOCS', doneAt: new Date(now.getTime() - 1 * day) },
      { gi: 1, title: 'Peta Jalur Niaga Selat Malaka', description: 'Peta grafis bandar perdagangan laut', weight: 45, status: 'IN_PROGRESS', ai: 1, deadline: new Date(now.getTime() + 2 * day), evidenceType: 'SLIDE' },
      { gi: 2, title: 'Sejarah Berdirinya Mataram Islam', description: 'Kronologi dan sumber primer', weight: 50, status: 'TODO', ai: 0, deadline: new Date(now.getTime() + 6 * day), evidenceType: 'GOOGLE_DOCS' },
      { gi: 2, title: 'Analisis Sistem Pemerintahan Mataram', description: 'Struktur kerajaan dan bukti', weight: 50, status: 'TODO', ai: 1, deadline: new Date(now.getTime() + 6 * day), evidenceType: 'WEB_LINK' },
      { gi: 3, title: 'Komoditas Rempah dan Jalur Dagang', description: 'Mapping rempah dan rute dagang abad 15', weight: 70, status: 'IN_PROGRESS', ai: 0, deadline: new Date(now.getTime() + 4 * day), evidenceType: 'GOOGLE_DOCS' },
      { gi: 3, title: 'Dampak Dagang terhadap Masyarakat Pesisir', description: 'Analisis sosial-ekonomi', weight: 30, status: 'TODO', ai: 1, deadline: new Date(now.getTime() + 4 * day), evidenceType: 'HANDWRITTEN_PHOTO' },
    ];

    for (const t of taskDefs) {
      await tx.task.create({
        data: {
          groupId: groups[t.gi].id,
          title: t.title,
          description: t.description,
          assigneeId: member(t.gi, t.ai).id,
          status: t.status,
          weight: t.weight,
          deadline: t.deadline,
          evidenceType: t.evidenceType,
          evidenceStatus: t.status === 'DONE' ? 'VALID' : 'PENDING',
          evidenceUrl: t.status === 'DONE' ? 'https://docs.google.com/document/d/demo-migrated' : null,
          createdAt: new Date(now.getTime() - 2 * day),
          doneAt: t.doneAt ?? null,
        },
      });
    }

    // Activities: mixed types per group
    const activityDefs = [
      { gi: 0, mi: 0, type: 'DOCUMENT', description: 'Mengunggah rangkuman Bab 2' },
      { gi: 0, mi: 0, type: 'COMMENT', description: 'Komentar di tugas Studi Pustaka' },
      { gi: 0, mi: 1, type: 'LOG', description: 'Membuka dokumen kelompok' },
      { gi: 1, mi: 0, type: 'DOCUMENT', description: 'Mengunggah transkripsi prasasti' },
      { gi: 1, mi: 1, type: 'COMMENT', description: 'Review peta jalur niaga' },
      { gi: 1, mi: 1, type: 'UPLOAD', description: 'Mengunggah bukti slide' },
      { gi: 2, mi: 0, type: 'LOG', description: 'Login ke platform' },
      { gi: 2, mi: 1, type: 'COMMENT', description: 'Diskusi sistem pemerintahan' },
      { gi: 3, mi: 0, type: 'DOCUMENT', description: 'Mengunggah daftar komoditas' },
      { gi: 3, mi: 1, type: 'LOG', description: 'Membuka dokumen kelompok' },
    ];
    for (const a of activityDefs) {
      await tx.activity.create({
        data: {
          groupId: groups[a.gi].id,
          memberId: member(a.gi, a.mi).id,
          type: a.type,
          description: a.description,
          createdAt: new Date(now.getTime() - Math.floor(Math.random() * 48) * 3600 * 1000),
        },
      });
    }

    // Group messages: 2 member + 1 AI per group (pesan AI tersimpan, isAi=true)
    for (let gi = 0; gi < groups.length; gi++) {
      await tx.groupMessage.createMany({
        data: [
          { groupId: groups[gi].id, senderName: member(gi, 0).name, content: 'Halo, kita mulai bagi tugas dulu ya.', isAi: false, createdAt: new Date(now.getTime() - 2 * day) },
          { groupId: groups[gi].id, senderName: member(gi, 1).name, content: 'Siap, saya ambil bagian presentasi.', isAi: false, createdAt: new Date(now.getTime() - 2 * day + 3600 * 1000) },
          {
            groupId: groups[gi].id,
            senderName: 'Asisten AI',
            content: `Usulan pembagian untuk ${groups[gi].name}: sesuaikan beban berdasarkan kontribusi minggu ini.`,
            isAi: true,
            createdAt: new Date(now.getTime() - 1 * day),
          },
        ],
      });
    }

    // AI suggestion: role_split pending untuk grup 1
    await tx.aiSuggestion.create({
      data: {
        groupId: groups[0].id,
        type: 'ROLE_SPLIT',
        payload: {
          assignments: [
            { memberId: member(0, 0).id, name: member(0, 0).name, weightPercent: 50 },
            { memberId: member(0, 1).id, name: member(0, 1).name, weightPercent: 50 },
          ],
        },
        status: 'PENDING',
      },
    });

    // AI flags: ghosting + low_contribution (Rafi di grup 4)
    await tx.aiFlag.createMany({
      data: [
        {
          groupId: groups[3].id,
          memberId: member(3, 1).id,
          kind: 'GHOSTING',
          detail: { lastActiveHoursAgo: 80, activitiesCount: 1 },
        },
        {
          groupId: groups[3].id,
          memberId: member(3, 1).id,
          kind: 'LOW_CONTRIBUTION',
          detail: { percentage: 5, tasksDone: 0 },
        },
      ],
    });

    // Peer reports: 2 laporan (grup 1 dan grup 4)
    await tx.peerReport.createMany({
      data: [
        {
          roomId: room.id,
          groupId: groups[0].id,
          reporterId: member(0, 0).id,
          reportedId: member(0, 1).id,
          rating: 4,
          feedback: 'Aktif mendiskusikan sumber primer.',
          createdAt: new Date(now.getTime() - 1 * day),
        },
        {
          roomId: room.id,
          groupId: groups[3].id,
          reporterId: member(3, 0).id,
          reportedId: member(3, 1).id,
          rating: 2,
          feedback: 'Belum ada kontribusi dan jarang online.',
          createdAt: new Date(now.getTime() - 12 * 3600 * 1000),
        },
      ],
    });
  }, { timeout: 60000, maxWait: 15000 });

  const counts = {
    users: await prisma.user.count(),
    rooms: await prisma.room.count(),
    participants: await prisma.roomParticipant.count(),
    groups: await prisma.group.count(),
    tasks: await prisma.task.count(),
    activities: await prisma.activity.count(),
    messages: await prisma.groupMessage.count(),
    peerReports: await prisma.peerReport.count(),
    suggestions: await prisma.aiSuggestion.count(),
    flags: await prisma.aiFlag.count(),
    teacherTickets: await prisma.teacherCodeTicket.count(),
    studentTickets: await prisma.studentCodeTicket.count(),
  };

  console.log('Seed selesai. Data di database:');
  console.log(JSON.stringify(counts, null, 2));
  console.log('---');
  console.log(`Kelas demo tetap -> PIN: ${DEMO_PIN}, kode guru: ${DEMO_TEACHER_CODE}`);
  console.log('Kode siswa: SISWA-MAJAPAHIT-01 .. 08');
}

main()
  .catch((error) => {
    console.error('Gagal menjalankan seed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // abaikan error saat disconnect
    }
  });
