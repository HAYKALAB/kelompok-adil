import dotenv from 'dotenv';
import pg from 'pg';

// Muat variabel environment dari .env
dotenv.config();

const { Pool } = pg;

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Hilangkan pola kredensial URL koneksi seperti postgres://user:pass@host:port/db
  return raw.replace(/postgres(?:ql)?:\/\/[^@\s]+@[^\s/]+/gi, 'postgres://[REDACTED]');
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
