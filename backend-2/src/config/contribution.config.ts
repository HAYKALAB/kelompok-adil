/**
 * Konfigurasi formula deterministik kontribusi & deteksi tenggat tugas.
 * Menghindari "halusinasi LLM" dalam angka — perhitungan murni matematika.
 */
export const ContributionConfig = {
  // Bobot aktivitas per poin
  weights: {
    // Tugas selesai dikalikan bobot tugas (porsi terbesar penilaian)
    taskCompletedMultiplier: 1.0,
    // Bukti dokumen yang diunggah / divalidasi
    documentUpload: 5,
    // Log catatan riset atau progres
    activityLog: 2,
    // Komentar di Kanban / chat (diberi bobot kecil agar tidak bisa dispam)
    comment: 0.5,
  },

  // Konfigurasi deteksi kendala & tenggat tugas (Aturan Baru)
  ghosting: {
    // Ambang jam sebelum tenggat untuk memicu pengingat ramah ke grup (default 48 jam)
    warnHoursThreshold: Number(process.env.GHOSTING_WARN_HOURS) || 48,
    // Interval jam minimal antar-pengingat untuk tugas yang sama guna mencegah pesan duplikat (default 24 jam)
    nudgeIntervalHours: Number(process.env.GHOSTING_NUDGE_INTERVAL_HOURS) || 24,
  },

  // Status keseimbangan tim
  balanceThresholds: {
    // Deviasi standar beban: jika perbedaan tertinggi dan terendah > 20%
    imbalanceSpread: 20,
  },
};
