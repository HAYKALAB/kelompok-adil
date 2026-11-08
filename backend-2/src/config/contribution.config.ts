/**
 * Konfigurasi formula deterministik kontribusi & deteksi ghosting.
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

  // Threshold deteksi ghosting
  ghosting: {
    // Kontribusi di bawah persentase ini memicu potensi ghosting (misal < 10%)
    minContributionPercent: 10,
    // Tidak ada aktivitas / unggahan bukti selama durasi jam ini (72 jam / 3 hari)
    inactiveHoursThreshold: 72,
  },

  // Status keseimbangan tim
  balanceThresholds: {
    // Deviasi standar beban: jika perbedaan tertinggi dan terendah > 20%
    imbalanceSpread: 20,
  },
};
