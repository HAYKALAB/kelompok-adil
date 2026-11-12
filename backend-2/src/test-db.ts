import dotenv from 'dotenv';
import pg from 'pg';

// Muat variabel environment dari .env
dotenv.config();

const { Pool } = pg;

function sanitizeErrorMessage(err: unknown): string {
  let raw = err instanceof Error ? err.message : String(err);
  const envUrl = process.env.BACKEND2_DATABASE_URL?.trim();
  if (envUrl) {
    raw = raw.split(envUrl).join('[REDACTED_DB_URL]');
  }
  // Hilangkan pola kredensial URL koneksi seperti postgres://user:pass@host:port/db
  return raw
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@[^\s/]+(?:\/[^\s?#]*)?/gi, 'postgres://[REDACTED]')
    .replace(/(password|pwd|secret|token)\s*=\s*[^\s;&]+/gi, '$1=[REDACTED]');
}

async function runDbTest() {
  console.log('----------------------------------------------------');
  console.log('🔍 Menjalankan Pengujian Baca Database (REPO_MODE=db)');
  console.log('----------------------------------------------------');

  const connectionString = process.env.BACKEND2_DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    console.error('❌ Gagal: Variabel environment BACKEND2_DATABASE_URL belum diatur.');
    console.error('💡 Silakan isi BACKEND2_DATABASE_URL pada file .env untuk menguji koneksi database.');
    process.exit(1);
  }

  // Tentukan konfigurasi SSL terverifikasi penuh untuk host non-localhost (Neon)
  let isLocal = false;
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: isLocal ? false : true,
    connectionTimeoutMillis: 5000,
  });

  try {
    // 1. Baca 1 Room (HANYA SELECT)
    const roomRes = await pool.query(`
      SELECT "id", "pin", "title", "subject", "className", "aiEnabled", "deadline", "status"
      FROM "rooms"
      LIMIT 1;
    `);

    // 2. Baca 1 Group (HANYA SELECT)
    const groupRes = await pool.query(`
      SELECT "id", "roomId", "groupNumber", "name"
      FROM "groups"
      LIMIT 1;
    `);

    console.log('✅ Koneksi PostgreSQL berhasil terhubung!');
    console.log('\n📦 Contoh 1 Baris Room:');
    if (roomRes.rows.length > 0) {
      console.log(JSON.stringify(roomRes.rows[0], null, 2));
    } else {
      console.log('(Tabel rooms masih kosong)');
    }

    console.log('\n👥 Contoh 1 Baris Group:');
    if (groupRes.rows.length > 0) {
      console.log(JSON.stringify(groupRes.rows[0], null, 2));
    } else {
      console.log('(Tabel groups masih kosong)');
    }

    // 3. Baca Room Demo (PIN 123456): hanya id guru, id & nama kelompok, serta id & nama anggota (HANYA SELECT)
    const demoRoomRes = await pool.query(
      `SELECT "id", "teacherId"
       FROM "rooms"
       WHERE "pin" = $1
       LIMIT 1;`,
      ['123456']
    );

    console.log('\n🏫 Data Room Demo (PIN 123456):');
    if (demoRoomRes.rows.length === 0) {
      console.log('(Room demo dengan PIN 123456 tidak ditemukan)');
    } else {
      const demoRoom = demoRoomRes.rows[0];

      const teacherParticipantsRes = await pool.query(
        `SELECT "id"
         FROM "room_participants"
         WHERE "roomId" = $1 AND "role" = 'TEACHER'
         ORDER BY "joinedAt" ASC;`,
        [demoRoom.id]
      );

      const demoGroupsRes = await pool.query(
        `SELECT "id", "name"
         FROM "groups"
         WHERE "roomId" = $1
         ORDER BY "groupNumber" ASC;`,
        [demoRoom.id]
      );

      const demoMembersRes = await pool.query(
        `SELECT "id", "name", "groupId"
         FROM "room_participants"
         WHERE "roomId" = $1 AND "groupId" IS NOT NULL AND "role" = 'STUDENT'
         ORDER BY "joinedAt" ASC, "name" ASC;`,
        [demoRoom.id]
      );

      const membersByGroup = new Map<string, Array<{ id: string; name: string }>>();
      for (const m of demoMembersRes.rows) {
        const list = membersByGroup.get(m.groupId) ?? [];
        list.push({ id: m.id, name: m.name });
        membersByGroup.set(m.groupId, list);
      }

      const demoOutput = {
        teacherId: demoRoom.teacherId,
        teacherParticipantIds: teacherParticipantsRes.rows.map((t) => t.id),
        groups: demoGroupsRes.rows.map((g) => ({
          id: g.id,
          name: g.name,
          members: membersByGroup.get(g.id) ?? [],
        })),
      };

      console.log(JSON.stringify(demoOutput, null, 2));
    }

    console.log('\n🎉 Pengujian SELECT database sukses tanpa error.');
  } catch (err: unknown) {
    console.error('❌ Terjadi kesalahan saat membaca database:');
    console.error(sanitizeErrorMessage(err));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDbTest();
