import { useRef, useState } from 'react';

export interface MemberLaporOption {
  id: string;
  name: string;
  avatar: string; // kelas warna avatar
}

export type JenisKendala = 'freeriding' | 'absence' | 'name_only' | 'communication' | 'other';

export interface LaporanRahasia {
  reportedId: string;
  issue: JenisKendala;
  chronology: string;
  file: File | null;
}

interface Props {
  open: boolean;
  members: MemberLaporOption[];
  currentUserId?: string; // anggota ini tidak ditampilkan sebagai pilihan
  guruName?: string;
  onClose: () => void;
  onSubmit: (laporan: LaporanRahasia) => void | Promise<void>;
}

const ISSUES: { key: JenisKendala; label: string; hint: string; badge?: string }[] = [
  {
    key: 'freeriding',
    label: 'Tidak mengerjakan tugas sama sekali',
    hint: 'Free-riding / ghosting tanpa kepastian',
    badge: 'Paling Sering',
  },
  {
    key: 'absence',
    label: 'Tidak hadir diskusi kelompok tanpa kabar',
    hint: 'Sering mangkir saat janji temu online/offline',
  },
  {
    key: 'name_only',
    label: 'Hanya titip nama saat upload tugas',
    hint: 'Minta namanya dicantumkan tanpa andil materi',
  },
  {
    key: 'communication',
    label: 'Komunikasi tidak sopan / menghambat tim',
    hint: 'Membuat suasana kerja kelompok tegang atau toxic',
  },
  { key: 'other', label: 'Lainnya', hint: 'Kendala khusus di luar daftar di atas' },
];

const MAX_WORDS = 500;
const MAX_FILE_MB = 5;

const hitungKata = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function LaporRahasiaModal({
  open,
  members,
  currentUserId,
  guruName = 'Bu Rina',
  onClose,
  onSubmit,
}: Props) {
  const [reportedId, setReportedId] = useState('');
  const [issue, setIssue] = useState<JenisKendala>('freeriding');
  const [chronology, setChronology] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const pilihan = members.filter((m) => m.id !== currentUserId);
  const kata = hitungKata(chronology);
  const kebanyakan = kata > MAX_WORDS;
  const bisaKirim = !!reportedId && !kebanyakan && status === 'idle';

  const reset = () => {
    setReportedId('');
    setIssue('freeriding');
    setChronology('');
    setFile(null);
    setFileError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const tutup = () => {
    reset();
    onClose();
  };

  const pilihFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      setFileError(`Ukuran file maksimal ${MAX_FILE_MB}MB`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFileError('');
    setFile(f);
  };

  const kirim = async () => {
    if (!bisaKirim) return;
    setStatus('sending');
    try {
      // TODO: POST laporan rahasia ke backend (hanya bisa dibaca guru, jangan simpan identitas pelapor di endpoint kelompok)
      await onSubmit({ reportedId, issue, chronology: chronology.trim(), file });
      setStatus('sent');
    } catch {
      setStatus('idle');
      setFileError('Laporan gagal terkirim. Coba lagi ya.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto"
      onClick={tutup}
    >
      <div
        className="relative w-full max-w-lg bg-[#FAF6EF] rounded-t-[28px] sm:rounded-[24px] shadow-[0_-8px_30px_rgba(15,27,52,0.2)] sm:shadow-[5px_5px_0px_#1F2A44] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
        </div>

        {/* Header */}
        <div className="px-space-md pt-space-sm sm:pt-space-md pb-space-sm flex items-start justify-between gap-space-sm">
          <div className="flex flex-col gap-1 pr-2">
            <div className="inline-flex items-center gap-1.5 self-start bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full shadow-[2px_2px_0px_#1F2A44] rotate-1">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="font-label-sticker text-label-sticker uppercase tracking-wider">
                Ruang Aman Siswa
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-1">
              Lapor ke Guru (Rahasia)
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Bimbingan Konseling &amp; Evaluasi Adil
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup form laporan"
            onClick={tutup}
            className="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#1F2A44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Isi form */}
        <div className="flex-1 overflow-y-auto px-space-md py-space-sm flex flex-col gap-space-md">
          {/* Banner kerahasiaan */}
          <div className="bg-tertiary-container/25 rounded-xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#1F2A44]">
            <div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-lg text-label-lg text-primary leading-snug">
                Identitasmu 100% Dirahasiakan!
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                Laporan ini <strong className="text-on-surface">HANYA dikirim ke {guruName}</strong>{' '}
                dan tidak akan pernah terlihat oleh anggota kelompok lain di dasbor maupun
                workspace.
              </p>
            </div>
          </div>

          {/* Pilih anggota */}
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3.5 rounded-2xl shadow-[3px_3px_0px_#1F2A44]">
            <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">
                person_search
              </span>
              Siapa anggota yang ingin kamu laporkan? <span className="text-primary">*</span>
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant -mt-1">
              Pilih teman yang mengalami kendala kontribusi:
            </span>
            <div
              role="radiogroup"
              aria-label="Pilih anggota yang dilaporkan"
              className="grid grid-cols-2 gap-2 mt-1"
            >
              {pilihan.map((m) => {
                const aktif = reportedId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setReportedId(m.id)}
                    className={`text-left p-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-[0.98] ${
                      aktif
                        ? 'bg-primary/10 shadow-[2px_2px_0px_#1F2A44]'
                        : 'bg-surface-container-low shadow-[1px_1px_0px_#1F2A44] hover:bg-surface-container'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-[1px_1px_0px_#1F2A44] shrink-0 ${m.avatar}`}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-label-lg text-label-lg truncate ${
                          aktif ? 'text-primary' : 'text-on-surface'
                        }`}
                      >
                        {m.name}
                      </span>
                      {aktif && (
                        <span className="font-body-sm text-[11px] text-primary font-bold leading-tight">
                          Terpilih
                        </span>
                      )}
                    </div>
                    {aktif && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kendala utama */}
          <div className="flex flex-col gap-2">
            <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">flag</span>
              Apa kendala utama yang terjadi?
            </span>
            <div role="radiogroup" aria-label="Jenis kendala kelompok" className="flex flex-col gap-2">
              {ISSUES.map((i) => {
                const aktif = issue === i.key;
                return (
                  <button
                    key={i.key}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setIssue(i.key)}
                    className={`text-left p-3 rounded-xl flex items-start gap-3 transition-all active:scale-[0.98] ${
                      aktif
                        ? 'bg-secondary-container/60 shadow-[3px_3px_0px_#1F2A44]'
                        : 'bg-surface-container-lowest shadow-[2px_2px_0px_#1F2A44]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        aktif ? 'bg-primary' : 'bg-surface-container'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full bg-surface-container-lowest transition-transform ${
                          aktif ? 'scale-100' : 'scale-0'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-label-md text-label-md text-on-surface">{i.label}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {i.hint}
                      </span>
                    </div>
                    {i.badge && (
                      <span className="font-label-sticker text-[11px] bg-error-container text-on-error-container px-2 py-0.5 rounded shadow-[1px_1px_0px_#1F2A44] -rotate-1 shrink-0">
                        {i.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kronologi */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="chronology-input"
              className="font-label-lg text-label-lg text-on-surface flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  history_edu
                </span>
                Ceritakan kronologinya
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Opsional</span>
            </label>
            <textarea
              id="chronology-input"
              rows={3}
              value={chronology}
              onChange={(e) => setChronology(e.target.value)}
              placeholder="Sudah di-chat di grup WhatsApp dari hari Selasa tapi tidak ada respon sama sekali..."
              className="w-full bg-surface-container-lowest rounded-xl p-3 font-body-md text-body-md text-on-surface placeholder:text-outline shadow-[2px_2px_0px_#1F2A44] focus:outline-none focus:shadow-[3px_3px_0px_#1F2A44] resize-none transition-all"
            />
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-tertiary font-bold">
                Membantu {guruName}
              </span>
              <span
                className={`font-body-sm text-[11px] ${
                  kebanyakan ? 'text-error font-bold' : 'text-outline'
                }`}
              >
                {kata}/{MAX_WORDS} kata
              </span>
            </div>
          </div>

          {/* Bukti tambahan */}
          <div className="flex flex-col gap-1.5">
            <span className="font-label-lg text-label-lg text-on-surface flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  attachment
                </span>
                Bukti Tambahan
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Opsional</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(e) => pilihFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full bg-surface-container-lowest rounded-xl p-4 flex flex-col items-center gap-2 text-center shadow-[2px_2px_0px_#1F2A44] hover:shadow-[3px_3px_0px_#1F2A44] active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-label-md text-label-md text-on-surface">
                  Unggah Bukti Chat / Tangkapan Layar Tugas
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Format PNG, JPG, atau PDF (Maks. {MAX_FILE_MB}MB)
                </span>
              </div>
              {file && (
                <div className="flex items-center gap-1.5 bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full font-body-sm text-body-sm font-semibold shadow-[1px_1px_0px_#1F2A44]">
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
              )}
            </button>
            {fileError && (
              <span className="font-body-sm text-body-sm text-error font-bold">{fileError}</span>
            )}
          </div>

          {/* Banner sukses */}
          {status === 'sent' && (
            <div className="bg-tertiary-container text-on-tertiary-container p-4 rounded-xl shadow-[3px_3px_0px_#1F2A44] flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="font-headline-sm text-[16px] font-bold">
                  Laporan Rahasia Terkirim!
                </span>
              </div>
              <p className="font-body-sm text-body-sm">
                {guruName} sudah menerima catatanmu. Beliau akan melakukan pendekatan secara bijak
                tanpa membuka identitas pelapor. Tetap fokus pada tugasmu ya!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-space-md bg-[#FAF6EF] shadow-[0_-2px_10px_rgba(15,27,52,0.06)] flex flex-col gap-space-sm">
          <div className="flex flex-col sm:flex-row-reverse gap-2">
            {status !== 'sent' && (
              <button
                type="button"
                onClick={kirim}
                disabled={!bisaKirim}
                className="w-full sm:flex-1 py-3.5 px-space-md bg-primary-container text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-[4px_4px_0px_#1F2A44] hover:shadow-[5px_5px_0px_#1F2A44] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {status === 'sending' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    <span>Mengirim aman ke {guruName}...</span>
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      shield
                    </span>
                    <span>Kirim Laporan Rahasia</span>
                    <span className="font-label-sticker text-[12px] bg-on-primary-container text-primary-container px-1.5 py-0.5 rounded">
                      AMAN
                    </span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={tutup}
              className={`w-full sm:w-auto py-2.5 px-space-md font-label-lg text-label-lg rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                status === 'sent'
                  ? 'bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#1F2A44] sm:flex-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">handshake</span>
              <span>
                {status === 'sent' ? 'Kembali ke Ruang Kelompok' : 'Batal, selesaikan secara internal'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-tertiary">
              sentiment_satisfied
            </span>
            <span className="font-body-sm text-body-sm">
              "Kerja kelompok bukan ajang saling menjatuhkan, melainkan belajar rukun dan adil."
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}