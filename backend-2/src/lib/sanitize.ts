/**
 * Utility sanitasi input dan proteksi integritas output AI
 */

const NON_NAME_WORDS = new Set([
  // Kata umum & partikel
  'dan', 'atau', 'tetapi', 'namun', 'serta', 'juga', 'pun', 'hanya', 'lagi',
  'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'oleh', 'kepada',
  'tentang', 'terkait', 'sebagai', 'secara', 'karena', 'sebab', 'agar', 'supaya',
  'jika', 'bila', 'kalau', 'apabila', 'ketika', 'saat', 'sebelum', 'setelah', 'sesudah',
  'hingga', 'sampai', 'antara', 'terhadap', 'bagi', 'tanpa', 'melalui', 'sementara',
  'meskipun', 'walaupun', 'selain', 'adapun',
  // Kata bantu, sifat & keterangan
  'ada', 'tidak', 'belum', 'bukan', 'sudah', 'telah', 'sedang', 'masih', 'akan',
  'bisa', 'dapat', 'harus', 'wajib', 'perlu', 'boleh', 'pasti', 'mungkin', 'sangat',
  'lebih', 'paling', 'kurang', 'cukup', 'selalu', 'sering', 'jarang', 'pernah',
  'baik', 'buruk', 'aktif', 'pasif', 'adil', 'timpang', 'jelas', 'lengkap', 'nyata',
  'kondusif', 'ramah', 'positif', 'negatif', 'santai', 'faktual', 'netral',
  // Kata benda, subjek, istilah sekolah, platform & AI
  'guru', 'pendidik', 'pengajar', 'wali', 'siswa', 'murid', 'pelajar', 'peserta',
  'anggota', 'rekan', 'teman', 'tim', 'kelompok', 'ketua', 'orang', 'pihak',
  'kelas', 'sekolah', 'ruang', 'room', 'grup', 'group',
  'papan', 'kanban', 'tugas', 'bagian', 'subtema', 'bab', 'proyek', 'materi', 'topik',
  'dokumen', 'bukti', 'tautan', 'slide', 'canva', 'presentasi', 'link', 'foto', 'tulisan',
  'laporan', 'ringkasan', 'catatan', 'hasil', 'saran', 'masukan', 'rekomendasi',
  'evaluasi', 'peringatan', 'notifikasi', 'intervensi', 'mediasi', 'diskusi',
  'komunikasi', 'koordinasi', 'kolaborasi', 'kerjasama', 'dinamika', 'situasi',
  'kondisi', 'kendala', 'masalah', 'tenggat', 'deadline', 'waktu', 'hari', 'jam',
  'skor', 'nilai', 'bobot', 'persentase', 'persen', 'skala', 'tingkat', 'level',
  'keadilan', 'kontribusi', 'beban', 'kinerja', 'kualitas', 'progres', 'tahap',
  'ai', 'asisten', 'rukun', 'fasilitator', 'sistem', 'platform', 'peer', 'review',
  'rating', 'bintang', 'data', 'informasi', 'konfirmasi', 'perhatian', 'asistensi',
  'pelapor', 'temuan',
  // Aplikasi & AI tools
  'kanban', 'gemini', 'google', 'docs',
  // Nama-nama bulan
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
  // Nama-nama hari
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
  // Nama tempat & topik sejarah kurikulum
  'sejarah', 'nusantara', 'majapahit', 'sriwijaya', 'singasari', 'indonesia',
  'kedukan', 'bukit', 'talang', 'tuo', 'malaka', 'sunda', 'tang', 'india',
  'negarakretagama', 'kertanegara', 'raden', 'wijaya', 'dapunta', 'hyang', 'i-tsing',
  // Kata kerja umum di awal dan tengah kalimat
  'membuat', 'mengerjakan', 'menyelesaikan', 'mengunggah', 'membagi', 'membantu', 'mengajak',
  'meminta', 'melihat', 'mendampingi', 'mengikuti', 'memberi', 'menulis', 'membaca',
  'menghubungi', 'memanggil', 'memfasilitasi', 'memantau', 'mendorong', 'memotivasi',
  'memeriksa', 'memastikan', 'menemukan', 'mencapai', 'mengalami', 'terjadi', 'berjalan',
  'berkembang', 'berdiskusi', 'berkoordinasi', 'berkolaborasi', 'berpartisipasi',
  'disarankan', 'diharapkan', 'terdapat', 'berdasarkan', 'menurut', 'pastikan', 'harap',
  'mohon', 'hendaknya', 'langkah', 'upaya', 'tindakan', 'solusi', 'cara', 'metode',
  'strategi', 'fokus', 'target', 'umum', 'khusus', 'utama', 'penting', 'prioritas',
  'halo', 'hai', 'selamat', 'terima', 'kasih', 'semangat', 'sukses',
]);

/**
 * Menghapus tag <data> dan </data> secara rekursif/berulang sampai stabil,
 * serta meng-escape karakter < dan > yang tersisa agar tidak bisa menutup blok XML lebih awal.
 */
export function stripDataTags(input: string): string {
  if (!input) return '';
  let prev = '';
  let curr = input;

  // Hapus berulang sampai teks stabil (mencegah nested bypass seperti <</data>data>)
  while (curr !== prev) {
    prev = curr;
    curr = curr.replace(/<\s*\/?\s*data\b[^>]*>/gi, '');
  }

  // Escape sisa karakter < dan > menjadi entitas HTML aman
  return curr.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

/**
 * Cara deteksi nama orang:
 * 1. Menangkap kandidat nama (frasa berhuruf kapital 1-3 kata berurutan).
 * 2. Mencocokkan terhadap daftar nama sah di data (validNames) & token nama sah (validNameTokens).
 *    Jika cocok, NAMA DIPERTAHANKAN.
 * 3. Mencocokkan terhadap kosa kata umum/kamus (NON_NAME_WORDS) yang mencakup istilah sistem,
 *    alat (Kanban, Gemini, Google, Docs), nama bulan (Januari-Desember), hari, dan kata kerja/keterangan awal kalimat.
 *    Jika cocok, KATA DIPERTAHANKAN.
 * 4. Jika sebuah kata/frasa berhuruf kapital TIDAK ada di data sah dan BUKAN kata umum/kamus,
 *    kata tersebut diidentifikasi sebagai nama orang fiktif/halusinasi dan diganti dengan teks netral.
 */
export function sanitizeUnknownNames(text: string, validNames: string[]): string {
  if (!text) return '';

  const validLowerNames = validNames.map((n) => n.trim().toLowerCase());
  const validNameTokens = new Set(
    validNames.flatMap((n) => n.trim().toLowerCase().split(/\s+/))
  );

  // Regex menangkap frasa berhuruf kapital (1-3 kata berurutan)
  const nameCandidateRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;

  return text.replace(nameCandidateRegex, (match, offset) => {
    const trimmed = match.trim();
    const lower = trimmed.toLowerCase();

    // 1. Jika frasa lengkap terdaftar sebagai nama sah di data, pertahankan
    if (validLowerNames.includes(lower)) {
      return match;
    }

    const words = lower.split(/\s+/);

    // 2. Jika seluruh kata adalah bagian nama anggota yang sah, pertahankan
    if (words.every((w) => validNameTokens.has(w))) {
      return match;
    }

    // 3. Jika seluruh kata merupakan kosa kata umum / non-nama (Kanban, Gemini, Google, bulan, dll.), pertahankan
    if (words.every((w) => NON_NAME_WORDS.has(w))) {
      return match;
    }

    // 4. Deteksi apakah posisi kata berada di awal kalimat
    const isStartOfSentence = offset === 0 || /(?:[.!?:]\s*|^)$/.test(text.slice(0, offset));

    // Jika kata tunggal di awal kalimat ada di kamus non-nama, pertahankan
    if (words.length === 1 && isStartOfSentence && NON_NAME_WORDS.has(words[0])) {
      return match;
    }

    // 5. Nama orang fiktif / tidak terdaftar di data -> ganti dengan teks netral
    return isStartOfSentence ? 'Anggota yang bersangkutan' : 'anggota yang bersangkutan';
  });
}
