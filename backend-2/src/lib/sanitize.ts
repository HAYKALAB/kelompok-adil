/**
 * Utility sanitasi input dan proteksi integritas output AI
 */

const NON_NAME_WORDS = new Set([
  // Kata umum & partikel
  'dan', 'atau', 'tetapi', 'namun', 'serta', 'juga', 'pun', 'hanya', 'lagi',
  'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'oleh', 'kepada',
  'tentang', 'terkait', 'sebagai', 'secara', 'karena', 'sebab', 'agar', 'supaya',
  'jika', 'bila', 'kalau', 'apabila', 'ketika', 'saat', 'sebelum', 'setelah', 'sesudah',
  'hingga', 'sampai', 'antara', 'terhadap', 'bagi', 'tanpa', 'melalui',
  // Kata bantu, sifat & keterangan
  'ada', 'tidak', 'belum', 'bukan', 'sudah', 'telah', 'sedang', 'masih', 'akan',
  'bisa', 'dapat', 'harus', 'wajib', 'perlu', 'boleh', 'pasti', 'mungkin', 'sangat',
  'lebih', 'paling', 'kurang', 'cukup', 'selalu', 'sering', 'jarang', 'pernah',
  'baik', 'buruk', 'aktif', 'pasif', 'adil', 'timpang', 'jelas', 'lengkap', 'nyata',
  'kondusif', 'ramah', 'positif', 'negatif', 'santai', 'faktual', 'netral',
  // Kata benda, subjek, istilah sekolah & platform
  'guru', 'pendidik', 'pengajar', 'wali', 'siswa', 'murid', 'pelajar', 'peserta',
  'anggota', 'rekan', 'teman', 'tim', 'kelompok', 'ketua', 'orang', 'pihak',
  'kelas', 'sekolah', 'ruang', 'room', 'grup', 'group', 'papan', 'kanban',
  'tugas', 'bagian', 'subtema', 'bab', 'proyek', 'materi', 'topik', 'dokumen',
  'bukti', 'tautan', 'slide', 'canva', 'presentasi', 'link', 'foto', 'tulisan',
  'laporan', 'ringkasan', 'catatan', 'hasil', 'saran', 'masukan', 'rekomendasi',
  'evaluasi', 'peringatan', 'notifikasi', 'intervensi', 'mediasi', 'diskusi',
  'komunikasi', 'koordinasi', 'kolaborasi', 'kerjasama', 'dinamika', 'situasi',
  'kondisi', 'kendala', 'masalah', 'tenggat', 'deadline', 'waktu', 'hari', 'jam',
  'skor', 'nilai', 'bobot', 'persentase', 'persen', 'skala', 'tingkat', 'level',
  'keadilan', 'kontribusi', 'beban', 'kinerja', 'kualitas', 'progres', 'tahap',
  'ai', 'asisten', 'rukun', 'fasilitator', 'sistem', 'platform', 'peer', 'review',
  'rating', 'bintang', 'data', 'informasi', 'konfirmasi', 'perhatian', 'asistensi',
  'pelapor',
  // Nama tempat/sejarah kurikulum
  'sejarah', 'nusantara', 'majapahit', 'sriwijaya', 'singasari', 'indonesia',
  'kedukan', 'bukit', 'talang', 'tuo', 'malaka', 'sunda', 'tang', 'india',
  'google', 'docs',
  // Kata kerja umum
  'membuat', 'mengerjakan', 'menyelesaikan', 'mengunggah', 'membagi', 'membantu', 'mengajak',
  'meminta', 'melihat', 'mendampingi', 'mengikuti', 'memberi', 'menulis', 'membaca',
  'menghubungi', 'memanggil', 'memfasilitasi', 'memantau', 'mendorong', 'memotivasi',
  'memeriksa', 'memastikan', 'menemukan', 'mencapai', 'mengalami', 'terjadi', 'berjalan',
  'berkembang', 'berdiskusi', 'berkoordinasi', 'berkolaborasi', 'berpartisipasi',
  'langkah', 'upaya', 'tindakan', 'solusi', 'cara', 'metode', 'strategi', 'fokus', 'target',
  'umum', 'khusus', 'utama', 'penting', 'prioritas',
  'halo', 'hai', 'selamat', 'terima', 'kasih', 'semangat', 'sukses',
  'negarakretagama', 'kertanegara', 'raden', 'wijaya', 'dapunta', 'hyang', 'i-tsing',
]);

/**
 * Menghapus tag <data> dan </data> (serta variasi spasi/atribut) dari input teks siswa
 * agar tidak dapat menutup blok data XML lebih awal (anti-breakout prompt injection)
 */
export function stripDataTags(input: string): string {
  if (!input) return '';
  return input.replace(/<\s*\/?\s*data\b[^>]*>/gi, '').trim();
}

/**
 * Memeriksa teks output AI dan mengganti nama orang yang tidak ada di data menjadi teks netral
 */
export function sanitizeUnknownNames(text: string, validNames: string[]): string {
  if (!text) return '';

  const validLowerNames = validNames.map((n) => n.trim().toLowerCase());
  const validNameTokens = new Set(
    validNames.flatMap((n) => n.trim().toLowerCase().split(/\s+/))
  );

  // Regex menangkap frasa nama berhuruf kapital (1-3 kata berurutan)
  const nameCandidateRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;

  return text.replace(nameCandidateRegex, (match, offset) => {
    const trimmed = match.trim();
    const lower = trimmed.toLowerCase();

    // 1. Jika frasa lengkap terdaftar sebagai nama sah di data, pertahankan
    if (validLowerNames.includes(lower)) {
      return match;
    }

    const words = lower.split(/\s+/);

    // 2. Jika seluruh kata adalah token nama anggota yang sah, pertahankan
    if (words.every((w) => validNameTokens.has(w))) {
      return match;
    }

    // 3. Jika seluruh kata merupakan kosa kata umum / non-nama, pertahankan
    if (words.every((w) => NON_NAME_WORDS.has(w))) {
      return match;
    }

    // 4. Periksa apakah ini awal kalimat
    const isStartOfSentence = offset === 0 || /(?:[.!?]\s*|^)$/.test(text.slice(0, offset));
    if (words.length === 1 && isStartOfSentence && NON_NAME_WORDS.has(words[0])) {
      return match;
    }

    // 5. Terindikasi nama orang fiktif/tidak terdaftar di data -> ganti dengan teks netral
    return isStartOfSentence ? 'Anggota yang bersangkutan' : 'anggota yang bersangkutan';
  });
}
