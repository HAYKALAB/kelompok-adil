import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const MASCOT_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W5eZPrRliobZqL7wjMSsv9q12K9-2ZiW7u3Vggyi3NHg1EiT2-_FIyJFaiy7GVBpetGWXcV91c2HzchqV-9RucCrkr4Atyps34eet5RVzN_pDDGpsYtm3tF78FON0KtYUyftgwSVYa5r9yLYnw8-wjWY9jUJ4magzvYQhjlvzq7w-SyC0yUcdugwx-dcuLYo7kV4hrTUVcM3VWZVbaIiTL4iFe0rFglynUz9Uen5hZWA';

const PROFILE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQvUo5z0d6mAjuLrgnEA0AJhBD9bdpQPXIOOX7YFJrOL_R1LLKJ67tmEBTnXTaGis3CL0wOSSywfK0miUOeLQ4ct4AqaUp5UId8awG19LWC2Ea7QZcofI511-K82QYzM0qNAc-mJlsQfDeqZNCobihGmDx5bzTq-4seXtA0KeMEzP786L6V1XVSAFLyPloV99MOYWDkY0TZW9Dcq1H6havM_Lc-NU44jPo1gRhp4KY';

interface Anggota {
  nama: string;
  idle?: boolean;
  foto: string;
}

const ANGGOTA: Anggota[] = [
  {
    nama: 'Dafano',
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6n31ATgNWiqErpRrvm8_qF82Yid9n0qW5aOw5VQhp7SaBpwua3-8ERvL1Jtu6btq-svlIe1pyRs38MyQjfO7XZL9hQAReYIfdrPkShU1WMsUE6d_eQG2l8bFzxvRHwoje0ENHpWUywJdHQTbPCHF8_zuegxze7Ymiplr3CAnzBKinLBi8rJZpSijHNEnm7eGBlids_JI3SXil7Q3WJPHnBeQkDDVwuQ-PeXNDGIgp',
  },
  {
    nama: 'Nadya',
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeJKch7C-5tXBPEhVidvVFiiXR_cyYVPGfkSfML-YZY4btot3x3Pcjnnz2TLlZLilXyq_8h1eYsKDP5xUhaRTs-X3zTBgT1LWhe-bft0iuz9umIvrLGwsX6zR0GbXR_qxFGv_23OzOn0lmDJWqz7idCcmG65hxR_XFjA5rrAhOedhVG_IEU_2r9ifBa8fOtPq6uXDxp52KFpvv18JIY2uo2B4M9SpeH9vJ5EDbioeo',
  },
  {
    nama: 'Bima',
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8zA8YIAHySylml10JYSXwwxMELd6DkcyJI-ndo-AN8hr1x-QHOmC4TZxsBhWcYrTWVh2ufvE26bz2hRMYFGL9a50NlJj5TQJoqlfKi9BkVAzsbC38J7dsAIQXqmzoeS40Ebg9USd0lOi8Enj5gOue5nyRgxdRunijXLfnbikoBmVeTaOnIpw4qyG4YfEGcXlI4rKwXFXKAKWwO1Ae3UdoxIHmWnXD27T3e3xNqVa0',
  },
  {
    nama: 'Salsa',
    idle: true,
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEoQcUipWH_TlgsccDLbd7N8u1JKvpdeJ10d5eRFHxdiBmOxpv2pOZEKuE2zxTHGjDrsAMrY4Zwvydc2Cp7IUkJdUXLFLtnBmY_qDx0FJOirsPWUht3z4Xckw1FLzobXIvOD1Im9M9r89qJNfXlGZFagVRtXxzy0m254VHLE8tyqJj_fyb-gKytxKUfH_fOpt4Ne4vMI15IaehHRMovv6p20MgHw_t5LlnjI5SzMwN',
  },
];

const IDE_SUDUT_PANDANG = [
  'Strategi Diplomasi Ekspedisi Pamalayu Kertanegara',
  'Konflik Internal vs Serangan Bangsa Mongol',
  'Peran Perempuan Bangsawan dalam Suksesi Tahta',
];

interface PembagianPeran {
  inisial: string;
  badgeClass: string;
  judul: string;
  deskripsi: string;
  beban: string;
}
const PEMBAGIAN_PERAN: PembagianPeran[] = [
  {
    inisial: 'DF',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed',
    judul: 'Dafano: Riset Dokumen Ekspedisi',
    deskripsi: 'Analisis naskah Kertanegara',
    beban: 'Beban 25%',
  },
  {
    inisial: 'ND',
    badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    judul: 'Nadya: Penulisan Bab Latar Belakang',
    deskripsi: 'Sistematika narasi & korelasi',
    beban: 'Beban 25%',
  },
  {
    inisial: 'BM',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed',
    judul: 'Bima: Peta Jalur & Infografis',
    deskripsi: 'Visual peta rute pelayaran laut',
    beban: 'Beban 25%',
  },
  {
    inisial: 'SL',
    badgeClass: 'bg-surface-container-highest text-on-surface',
    judul: 'Salsa: Slide Canva & Skrip',
    deskripsi: 'Finalisasi slide presentasi 10 menit',
    beban: 'Beban 25%',
  },
];

const CHIPS = ['💡 Cari ide tugas', '⚖️ Bagi peran tim', '🔍 Cek kelengkapan bab'];

const NAV_ITEMS = [
  { label: 'Kelas', icon: 'dashboard', path: '/guru' },
  { label: 'Pantau', icon: 'monitoring', path: '/status' },
  { label: 'Kelompok', icon: 'groups', path: '/workspace' },
  { label: 'Lobi', icon: 'meeting_room', path: '/' },
];

interface PesanBaru {
  id: number;
  teks: string;
}

export function AiFasilitatorPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [pesanBaru, setPesanBaru] = useState<PesanBaru[]>([]);
  const [kanbanTersimpan, setKanbanTersimpan] = useState(false);
  const bawahRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pesanBaru.length > 0) {
      bawahRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pesanBaru]);
  useEffect(() => {
    if (!kanbanTersimpan) return;
    const timer = setTimeout(() => setKanbanTersimpan(false), 2500);
    return () => clearTimeout(timer);
  }, [kanbanTersimpan]);

  const kirimPesan = (e?: FormEvent) => {
    e?.preventDefault();
    const teks = input.trim();
    if (!teks) return;
    // TODO: kirim ke backend / API AI, lalu tampilkan balasan AI
    setPesanBaru((prev) => [...prev, { id: Date.now(), teks }]);
    setInput('');
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,27,52,0.05)]">
        <div className="h-16 px-margin flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <img
              alt="Kelompok Adil Mascot Logo"
              className="h-8 w-auto object-contain"
              src={MASCOT_URL}
            />
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
                Group Workspace
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
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                src={PROFILE_URL}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-tertiary-container rounded-full ring-2 ring-surface" />
            </div>
          </div>
        </div>
      </header>
      {/* Konten */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
        <div className="flex flex-col w-full px-margin space-y-space-md">
          {/* Info ruang & transparansi */}
          <div className="relative overflow-hidden bg-surface-container-high rounded-xl p-space-md shadow-md mt-space-md">
            <div className="flex items-center justify-between gap-space-sm mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  🤖 AI Asisten Kelompok
                </span>
                <span className="font-label-sticker text-label-sticker bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full rotate-2">
                  Ruang 4B
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-full">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  Aktif Ramean
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-xs bg-surface-container-lowest/80 backdrop-blur-sm p-space-sm rounded-lg mb-space-md text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">campaign</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                📢 Obrolan ini transparan &amp; dapat dilihat oleh semua {ANGGOTA.length} anggota
                kelompok.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 overflow-x-auto gap-space-sm">
              {ANGGOTA.map((a) => (
                <div
                  key={a.nama}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-full shadow-sm shrink-0 ${
                    a.idle ? 'bg-surface-container-lowest/70' : 'bg-surface-container-lowest'
                  }`}
                >
                  <div className="relative">
                    <img
                      alt={a.nama}
                      className={`w-6 h-6 rounded-full object-cover ${a.idle ? 'opacity-80' : ''}`}
                      src={a.foto}
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-surface-container-lowest ${
                        a.idle ? 'bg-secondary-fixed-dim' : 'bg-tertiary-container'
                      }`}
                    />
                  </div>
                  <span
                    className={`font-label-md text-label-md ${
                      a.idle ? 'text-on-surface-variant font-medium' : 'text-on-surface font-semibold'
                    }`}
                  >
                    {a.nama}
                    {a.idle ? ' (idle)' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Aliran chat */}
          <div className="flex flex-col space-y-space-md">
            {/* Pesan 1: Dafano */}
            <div className="flex items-start gap-space-sm self-start max-w-[90%]">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-headline-sm shadow-sm shrink-0">
                DF
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-label-md text-label-md text-on-surface font-bold">Dafano</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">14:20</span>
                </div>
                <div className="bg-surface-container-lowest text-on-surface p-space-md rounded-2xl rounded-tl-sm shadow-sm">
                  <p className="font-body-md text-body-md">
                    Halo AI, kasih ide topik presentasi yang menarik tentang Kerajaan Singasari dong! 🏛️
                  </p>
                </div>
              </div>
            </div>

            {/* Pesan 2: AI - Ringkasan Adil */}
            <div className="flex items-start gap-space-sm self-start max-w-[96%]">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-sticker text-label-sticker bg-on-secondary-container text-secondary-container px-2 py-0.5 rounded -rotate-1">
                    ✦ Ringkasan Adil
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">14:21</span>
                </div>
                <div className="bg-secondary-container text-on-secondary-container p-space-md rounded-2xl rounded-tl-sm shadow-md w-full">
                  <div className="flex items-center gap-2 pb-space-sm mb-space-sm">
                    <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
                    <span className="font-title-md text-title-md font-bold">Hai Tim Majapahit!</span>
                  </div>
                  <p className="font-body-md text-body-md mb-2 font-medium">
                    Ini 3 sudut pandang unik yang jarang dibahas dan dinilai berbobot oleh guru:
                  </p>
                  <ol className="space-y-2 pl-1 font-body-md text-body-md font-semibold">
                    {IDE_SUDUT_PANDANG.map((ide, i) => (
                      <li
                        key={ide}
                        className="flex items-start gap-2 bg-surface-container-lowest/50 p-2 rounded-lg"
                      >
                        <span className="w-5 h-5 rounded-full bg-on-secondary-container text-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </span>
                        <span>{ide}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* Pesan 3: Nadya */}
            <div className="flex items-start gap-space-sm self-start max-w-[90%]">
              <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-headline-sm text-headline-sm shadow-sm shrink-0">
                ND
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-label-md text-label-md text-on-surface font-bold">Nadya</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">14:22</span>
                </div>
                <div className="bg-surface-container-lowest text-on-surface p-space-md rounded-2xl rounded-tl-sm shadow-sm">
                  <p className="font-body-md text-body-md">
                    Keren yang nomor 1! AI, tolong bantu bagi perannya dong biar adil. ⚖️✨
                  </p>
                </div>
              </div>
            </div>
            {/* Pesan 4: AI - Usulan pembagian peran */}
            <div className="flex items-start gap-space-sm self-start w-full">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">balance</span>
              </div>
              <div className="flex flex-col items-start w-full min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-sticker text-label-sticker bg-tertiary-container text-on-tertiary px-2 py-0.5 rounded rotate-1">
                    ✦ Gotong Royong
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">14:23</span>
                </div>
                <div className="bg-surface-container-lowest text-on-surface p-space-md rounded-2xl rounded-tl-sm shadow-lg w-full flex flex-col space-y-space-md">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        ⚖️ Usulan Pembagian Peran Adil
                      </h3>
                      <span className="font-label-sticker text-label-sticker bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full shrink-0">
                        Rata 25%
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Berdasarkan beban kerja 4 anggota dan jadwal pengerjaan:
                    </p>
                  </div>

                  <div className="w-full bg-surface-container-high rounded-full h-3 flex overflow-hidden p-0.5">
                    <div className="bg-tertiary-container h-full w-1/4 rounded-l-full" />
                    <div className="bg-secondary-container h-full w-1/4" />
                    <div className="bg-primary-container h-full w-1/4" />
                    <div className="bg-tertiary h-full w-1/4 rounded-r-full" />
                  </div>

                  <div className="space-y-2">
                    {PEMBAGIAN_PERAN.map((p) => (
                      <div
                        key={p.inisial}
                        className="p-space-sm bg-surface-container rounded-xl flex items-center justify-between gap-space-sm"
                      >
                        <div className="flex items-center gap-space-sm min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${p.badgeClass}`}
                          >
                            {p.inisial}
                          </span>
                          <div className="min-w-0">
                            <p className="font-label-lg text-label-lg text-on-surface truncate">
                              {p.judul}
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                              {p.deskripsi}
                            </p>
                          </div>
                        </div>
                        <span className="font-label-sticker text-label-sticker bg-surface-container-lowest px-2 py-1 rounded text-primary shrink-0">
                          {p.beban}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setKanbanTersimpan(true)}
                    className={`w-full py-3 px-4 text-on-primary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 hover:opacity-95 transition-all ${
                      kanbanTersimpan ? 'bg-tertiary-container' : 'bg-primary'
                    }`}
                  >
                    <span>
                      {kanbanTersimpan
                        ? 'Tersimpan di Papan Kanban! ✨'
                        : 'Terapkan ke Kanban Otomatis 🚀'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {/* Pesan yang baru diketik */}
            {pesanBaru.map((p) => (
              <div key={p.id} className="flex items-start gap-space-sm self-start max-w-[90%]">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-headline-sm text-headline-sm shadow-sm shrink-0">
                  KM
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-label-md text-label-md text-on-surface font-bold">Kamu</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Baru saja</span>
                  </div>
                  <div className="bg-surface-container-lowest text-on-surface p-space-md rounded-2xl rounded-tl-sm shadow-sm">
                    <p className="font-body-md text-body-md break-words">{p.teks}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={bawahRef} />
          </div>

          {/* Chip prompt cepat */}
          <div className="flex items-center gap-space-xs overflow-x-auto pt-space-xs">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="shrink-0 px-3 py-1.5 bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-full shadow-sm hover:bg-secondary-container hover:text-on-secondary-container transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input chat */}
          <form
            onSubmit={kirimPesan}
            className="sticky bottom-20 bg-surface/90 backdrop-blur-md pt-2 pb-1"
          >
            <div className="flex items-center gap-space-sm bg-surface-container-lowest p-2 rounded-2xl shadow-lg">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya AI untuk kelompokmu..."
                className="flex-1 min-w-0 bg-transparent px-3 py-2 text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 bg-primary text-on-primary px-4 py-2.5 rounded-xl font-label-lg text-label-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <span>Kirim</span>
                <span className="material-symbols-outlined text-[16px]">keyboard_return</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Navigasi bawah */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(15,27,52,0.06)]">
        <div className="flex items-center justify-around h-16 px-space-sm">
          {NAV_ITEMS.map((item) => {
            const aktif = item.path === '/workspace';
            return (
              <button
                key={item.path}
                type="button"
                aria-current={aktif ? 'page' : undefined}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-xl transition-all ${
                  aktif
                    ? 'bg-surface-container-high text-primary font-bold shadow-[2px_2px_0px_#0f1b34]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="font-label-md text-label-md mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}