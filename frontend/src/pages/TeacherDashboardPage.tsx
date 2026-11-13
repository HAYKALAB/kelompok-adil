import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MASCOT_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W5eZPrRliobZqL7wjMSsv9q12K9-2ZiW7u3Vggyi3NHg1EiT2-_FIyJFaiy7GVBpetGWXcV91c2HzchqV-9RucCrkr4Atyps34eet5RVzN_pDDGpsYtm3tF78FON0KtYUyftgwSVYa5r9yLYnw8-wjWY9jUJ4magzvYQhjlvzq7w-SyC0yUcdugwx-dcuLYo7kV4hrTUVcM3VWZVbaIiTL4iFe0rFglynUz9Uen5hZWA';

type Fase = 'penilaian' | 'diskusi' | 'lobi';

interface Room {
  id: number;
  kelas: string;
  kelasClass: string;
  pin: string;
  judul: string;
  fase: Fase;
  faseLabel: string;
  laporan: number;
  kelompokAktif: number;
  progres: number; // 0-100
  info: string;
}

// TODO: ganti dengan data dari backend (GET room milik guru)
const INITIAL_ROOMS: Room[] = [
  {
    id: 1,
    kelas: 'XI IPA 2',
    kelasClass: 'bg-secondary-fixed text-on-secondary-fixed',
    pin: '749201',
    judul: 'Turnamen Sejarah Nusantara',
    fase: 'penilaian',
    faseLabel: 'Fase Penilaian Teman',
    laporan: 1,
    kelompokAktif: 4,
    progres: 50,
    info: 'Selesai dlm 45 mnt',
  },
  {
    id: 2,
    kelas: 'XI IPA 1',
    kelasClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    pin: '583190',
    judul: 'Riset Biologi Sel Tumbuhan',
    fase: 'diskusi',
    faseLabel: 'Fase Diskusi Ahli',
    laporan: 0,
    kelompokAktif: 6,
    progres: 75,
    info: 'Rubrik terdistribusi adil',
  },
  {
    id: 3,
    kelas: 'XI IPS 3',
    kelasClass: 'bg-secondary-fixed-dim text-on-secondary-fixed',
    pin: '910244',
    judul: 'Debat Bahasa Indonesia: Etika AI',
    fase: 'lobi',
    faseLabel: 'Lobi Terbuka',
    laporan: 0,
    kelompokAktif: 2,
    progres: 15,
    info: 'Lobi sedang dibuka',
  },
];

// TODO: ganti dengan rangkuman dari AI Gemini
const REKAP = [
  {
    nama: 'Kelompok Sriwijaya (XI IPA 2)',
    label: 'Sangat Adil ✦',
    adil: true,
    anggota: [
      { n: 'Budi', p: 25, bar: 'bg-tertiary' },
      { n: 'Siti', p: 25, bar: 'bg-tertiary-container' },
      { n: 'Fajar', p: 25, bar: 'bg-secondary-container' },
      { n: 'Dewi', p: 25, bar: 'bg-primary-container' },
    ],
  },
  {
    nama: 'Kelompok Majapahit (XI IPA 2)',
    label: 'Perlu Dibenahi Bareng',
    adil: false,
    anggota: [
      { n: 'Rian (60% - Terlalu Berat)', p: 60, bar: 'bg-primary-container' },
      { n: 'Dina (20%)', p: 20, bar: 'bg-secondary-container' },
      { n: 'Bagas (0% - Belum submit)', p: 20, bar: 'bg-surface-variant' },
    ],
  },
];
const NAV = [
  { label: 'Kelas', icon: 'dashboard', path: '/guru' },
  { label: 'Pantau', icon: 'monitoring', path: '/guru' },
  { label: 'Kelompok', icon: 'groups', path: '/ruang-kerja' },
  { label: 'Lobi', icon: 'meeting_room', path: '/guru' },
];

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [rekapOpen, setRekapOpen] = useState(false);
  const [disalin, setDisalin] = useState<string | null>(null);

  const totalRoom = rooms.length;
  const totalKelompok = 12; // TODO: hitung dari backend
  const totalLaporan = rooms.reduce((n, r) => n + r.laporan, 0);

  const salinPin = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setDisalin(pin);
      setTimeout(() => setDisalin(null), 1500);
    } catch {
      /* clipboard bisa ditolak browser */
    }
  };

  const mulaiRoom = (id: number) => {
    // TODO: PATCH status room ke backend
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, fase: 'diskusi', faseLabel: 'Fase Diskusi Ahli', info: 'Room sudah berjalan' }
          : r,
      ),
    );
  };

  const buatRoom = () => {
    // TODO: arahkan ke halaman guru buat room
  };

  const pantauSiswa = (_id: number) => {
    // TODO: arahkan ke halaman pantau kontribusi
  };

  const bukaRoom = (_id: number) => {
    navigate('/ruang-kerja');
  };

  const unduhRekap = () => {
    // TODO: unduh rekap Excel dari backend
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,27,52,0.05)]">
        <div className="h-16 px-margin max-w-5xl mx-auto flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <img alt="Kelompok Adil Mascot Logo" className="h-8 w-auto object-contain" src={MASCOT_URL} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-none tracking-tight">
                  Kelompok Adil
                </span>
                <span className="font-label-sticker text-label-sticker bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded -rotate-2 leading-none">
                  ✦ Rukun
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-medium leading-none mt-0.5">
                Teacher Dashboard
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Pemberitahuan"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md">
                BR
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-tertiary-container rounded-full ring-2 ring-surface" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-5xl mx-auto px-margin py-space-md gap-space-md">
          {/* Sapaan */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md">
            <div className="flex items-center justify-between gap-space-sm">
              <div className="flex flex-col min-w-0 pr-2">
                <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 mb-1.5 rounded-full bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  <span className="font-label-sticker text-label-sticker">SMAN 1 Teladan</span>
                </div>
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight flex items-center gap-1">
                  Halo, Bu Rina
                  <span className="inline-block animate-bounce origin-bottom-right">👋</span>
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Kelola room turnamen &amp; pantau kelompok aktif.
                </p>
              </div>
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-surface-container-high p-1 shadow-sm flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">
                    BR
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-tertiary-container rounded-full ring-2 ring-surface-container-lowest flex items-center justify-center text-[10px] text-on-tertiary font-bold">
                  ✓
                </span>
              </div>
            </div>
          </div>
          {/* Statistik */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-surface-container-lowest p-3 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-tertiary" />
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface block leading-none">
                  {totalRoom}
                </span>
                <span className="font-label-md text-label-md text-tertiary font-bold mt-1 block">
                  Room Aktif
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-3 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">diversity_3</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-secondary" />
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface block leading-none">
                  {totalKelompok}
                </span>
                <span className="font-label-md text-label-md text-secondary font-bold mt-1 block">
                  Kelompok
                </span>
              </div>
            </div>

            <div className="bg-error-container/40 p-3 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-error text-on-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                </div>
                {totalLaporan > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
                  </span>
                )}
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-error-container block leading-none">
                  {totalLaporan}
                </span>
                <span className="font-label-md text-label-md text-error font-bold mt-1 block">
                  Laporan 🚨
                </span>
              </div>
            </div>
          </div>

          {/* Aksi utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <button
              type="button"
              onClick={() => setRekapOpen(true)}
              className="w-full text-left bg-surface-container-highest text-on-surface rounded-xl p-space-md shadow-md transition-all active:translate-y-0.5 active:shadow-sm flex items-center justify-between gap-space-sm group"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-11 h-11 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">visibility</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-title-md text-title-md text-on-surface leading-snug truncate">
                    Hasil Kerja Siswa
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Rekap transparansi seluruh {totalKelompok} kelompok
                  </span>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface shadow-sm">
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </button>

            <button
              type="button"
              onClick={buatRoom}
              className="w-full bg-surface-container-lowest/80 hover:bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-on-surface"
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </div>
              <span className="font-title-md text-title-md font-bold text-on-surface">
                + Buat Room Turnamen Baru
              </span>
            </button>
          </div>

          {/* Header daftar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                Room Berjalan Saat Ini
              </h2>
              <span className="font-label-sticker text-label-sticker bg-surface-container-high text-on-surface px-2 py-0.5 rounded-full">
                {totalRoom} Sesi
              </span>
            </div>
            <button
              type="button"
              className="font-label-md text-label-md text-primary font-bold hover:underline flex items-center gap-0.5"
            >
              Filter
              <span className="material-symbols-outlined text-[16px]">tune</span>
            </button>
          </div>

          {/* Daftar room */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md items-start">
            {rooms.map((r) => {
              const lobi = r.fase === 'lobi';
              const adaLaporan = r.laporan > 0;
              return (
                <div
                  key={r.id}
                  className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col"
                >
                  <div
                    className={`p-space-md flex flex-col gap-2 ${
                      adaLaporan ? 'bg-surface-container-high/60' : 'bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-label-sticker text-label-sticker px-2 py-0.5 rounded-md font-bold ${r.kelasClass}`}
                        >
                            {r.kelas}
                        </span>
                        <button
                          type="button"
                          onClick={() => salinPin(r.pin)}
                          title="Salin PIN"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-label-sticker text-label-sticker font-mono active:bg-surface-container-highest"
                        >
                          <span>PIN: {r.pin}</span>
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                            {disalin === r.pin ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>

                      {adaLaporan ? (
                        <span className="inline-flex items-center gap-1 font-label-sticker text-label-sticker px-2 py-0.5 rounded-md bg-error-container text-on-error-container animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          {r.laporan} Laporan Masuk
                        </span>
                      ) : lobi ? (
                        <span className="inline-flex items-center gap-1 font-label-sticker text-label-sticker px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Baru Dibuat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-label-sticker text-label-sticker px-2 py-0.5 rounded-md bg-surface-container-highest text-tertiary font-bold">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Aman • Semua Aktif
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{r.judul}</h3>
                  </div>

                  {/* Garis tiket */}
                  <div className="relative flex items-center h-4 bg-surface-container-lowest">
                    <div className="absolute -left-2 w-4 h-4 rounded-full bg-surface" />
                    <div className="w-full mx-4 h-[1px] bg-outline-variant/50" />
                    <div className="absolute -right-2 w-4 h-4 rounded-full bg-surface" />
                  </div>

                  <div className="p-space-md pt-2 flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {lobi
                          ? `${r.kelompokAktif} Kelompok Terdaftar`
                          : `${r.kelompokAktif} Kelompok Aktif Berjalan`}
                      </span>
                      <span
                        className={`font-label-md text-label-md font-bold ${
                          lobi ? 'text-on-surface-variant' : 'text-tertiary'
                        }`}
                      >
                        {lobi ? 'Menunggu Siswa' : `${r.progres}% Progres`}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden flex shadow-inner">
                      <div
                        className={`h-full transition-all ${
                          lobi ? 'bg-secondary-container' : 'bg-tertiary-container'
                        }`}
                        style={{ width: `${r.progres}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-body-sm text-on-surface-variant pt-1">
                      <span className="flex items-center gap-1 font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">
                          {lobi ? 'hourglass_empty' : 'check_circle'}
                        </span>
                        {r.info}
                      </span>
                      <span className="font-label-sticker text-label-sticker text-on-primary-container bg-primary-fixed px-2 py-0.5 rounded whitespace-nowrap">
                        {r.faseLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-space-sm pt-2">
                      {lobi ? (
                        <>
                          <button
                            type="button"
                            onClick={() => salinPin(r.pin)}
                            className="w-full py-2.5 px-3 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg font-bold hover:bg-surface-container-high active:scale-95 transition-all text-center"
                          >
                            {disalin === r.pin ? 'PIN Tersalin ✓' : 'Bagikan PIN'}
                          </button>
                          <button
                            type="button"
                            onClick={() => mulaiRoom(r.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <span>Mulai Room</span>
                            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => bukaRoom(r.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg font-bold hover:bg-surface-container-high active:scale-95 transition-all text-center"
                          >
                            Buka Room
                          </button>
                          <button
                            type="button"
                            onClick={() => pantauSiswa(r.id)}
                            className={`w-full py-2.5 px-3 rounded-xl font-label-lg text-label-lg font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 ${
                              adaLaporan
                                ? 'bg-primary-container text-on-primary'
                                : 'bg-tertiary-container text-on-tertiary'
                            }`}
                          >
                            <span>Pantau Siswa</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      {/* Navigasi bawah */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(15,27,52,0.06)]">
        <div className="flex items-center justify-around h-16 px-space-sm max-w-5xl mx-auto">
          {NAV.map((n, i) => {
            const aktif = i === 0;
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => navigate(n.path)}
                aria-current={aktif ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-xl transition-all ${
                  aktif
                    ? 'bg-surface-container-high text-primary font-bold shadow-[2px_2px_0px_#0f1b34]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
                <span className="font-label-md text-label-md mt-0.5">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modal rekap */}
      {rekapOpen && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-margin"
          onClick={() => setRekapOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-space-md bg-surface-container-high/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary-container text-on-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">analytics</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Rekap Kerja Siswa</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Laporan keadilan kerja semua kelompok aktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setRekapOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-on-surface active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-md overflow-y-auto flex flex-col gap-space-md">
              {/* TODO: isi dengan rangkuman dari API Gemini */}
              <div className="bg-secondary-container/30 rounded-xl p-3.5 shadow-sm flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-on-secondary-container font-label-sticker text-label-sticker">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>Rangkuman Cerdas Sistem</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface">
                  92% siswa berkontribusi seimbang hari ini. Terdapat 1 anomali pembagian tugas di{' '}
                  <strong>Kelompok Majapahit (XI IPA 2)</strong> yang membutuhkan penyesuaian peran.
                </p>
              </div>

              <div className="flex flex-col gap-space-sm">
                <span className="font-title-md text-title-md text-on-surface block">
                  Keseimbangan Beban Tugas
                </span>
                {REKAP.map((k) => (
                  <div key={k.nama} className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label-lg text-label-lg text-on-surface">{k.nama}</span>
                      <span
                        className={`font-label-sticker text-label-sticker px-2 py-0.5 rounded whitespace-nowrap ${
                          k.adil
                            ? 'text-tertiary bg-tertiary-fixed'
                            : 'text-error bg-error-container'
                        }`}
                      >
                        {k.label}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
                      {k.anggota.map((a) => (
                        <div key={a.n} className={`h-full ${a.bar}`} style={{ width: `${a.p}%` }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 font-body-sm text-body-sm text-on-surface-variant">
                      {k.anggota.map((a) => (
                        <span key={a.n}>{a.n.includes('(') ? a.n : `${a.n} (${a.p}%)`}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-space-md bg-surface-container-lowest flex items-center justify-end gap-space-sm shadow-inner">
              <button
                type="button"
                onClick={() => setRekapOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg font-bold"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={unduhRekap}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Unduh Rekap Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}