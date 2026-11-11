import { useState } from 'react';

export interface MemberOption {
  id: string;
  name: string;
  beban: number; // persen
  avatar: string; // kelas warna avatar
}

export interface TugasBaru {
  title: string;
  desc: string;
  assignee: string;
  weight: 'ringan' | 'sedang' | 'berat';
  deadline: string;
  evidence: string[];
}

interface Props {
  open: boolean;
  members: MemberOption[];
  onClose: () => void;
  onSubmit: (tugas: TugasBaru) => void;
}

const WEIGHTS = [
  { key: 'ringan', label: 'Ringan', range: '10 - 15%', contoh: 'Misal: Cari 2 sumber' },
  { key: 'sedang', label: 'Sedang ✨', range: '20 - 25%', contoh: 'Misal: Buat 5 slide' },
  { key: 'berat', label: 'Berat', range: '30% +', contoh: 'Misal: Laporan bab full' },
] as const;

const DEADLINES = ['⚡ Besok Sore (16:00)', '🎯 H-1 Presentasi (Jumat)', '🗓️ Pilih Tanggal'];

const EVIDENCES = [
  { key: 'docs', label: 'Dokumen Google Docs', hint: 'Teks rangkuman/analisis' },
  { key: 'slide', label: 'Slide Presentasi', hint: 'Canva / PowerPoint' },
  { key: 'foto', label: 'Foto Buku Catatan', hint: 'Tulisan tangan asli' },
  { key: 'link', label: 'Tautan Referensi Web', hint: 'Jurnal atau artikel' },
];

export function TambahTugasModal({ open, members, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState('');
  const [weight, setWeight] = useState<TugasBaru['weight']>('sedang');
  const [deadline, setDeadline] = useState(DEADLINES[1]);
  const [tanggal, setTanggal] = useState('');
  const [evidence, setEvidence] = useState<string[]>(['docs', 'slide']);

  if (!open) return null;

  // dua anggota dengan beban paling kecil
  const rekomendasi = [...members].sort((a, b) => a.beban - b.beban).slice(0, 2);
  const terpilih = assignee || rekomendasi[0]?.id || '';
  const maxBeban = Math.max(...members.map((m) => m.beban));

  const toggleEvidence = (key: string) =>
    setEvidence((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const reset = () => {
    setTitle('');
    setDesc('');
    setAssignee('');
    setWeight('sedang');
    setDeadline(DEADLINES[1]);
    setTanggal('');
    setEvidence(['docs', 'slide']);
  };

  const tutup = () => {
    reset();
    onClose();
  };

  const simpan = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      desc: desc.trim(),
      assignee: terpilih,
      weight,
      deadline: deadline.includes('Pilih Tanggal') && tanggal ? tanggal : deadline,
      evidence,
    });
    reset();
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
            <div className="inline-flex items-center gap-1.5 self-start bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full shadow-[2px_2px_0px_#1F2A44] -rotate-1">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span className="font-label-sticker text-label-sticker uppercase tracking-wider">
                Pembagian Adil
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-1">
              Tambah Tugas Baru
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Bagi beban kerja secara transparan agar semua dapat nilai adil.
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup form"
            onClick={tutup}
            className="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#1F2A44] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Isi form */}
        <div className="flex-1 overflow-y-auto px-space-md py-space-sm flex flex-col gap-space-md">
          {/* Judul */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="taskTitle" className="font-label-lg text-label-lg text-on-surface">
              Judul Bagian / Tugas <span className="text-primary">*</span>
            </label>
            <input
              id="taskTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Bab 3 - Analisis Tokoh Gajah Mada"
              className="w-full bg-surface-container-lowest rounded-xl px-3.5 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline shadow-[2px_2px_0px_#1F2A44] focus:outline-none focus:shadow-[3px_3px_0px_#1F2A44] transition-all"
            />
          </div>

          {/* Deskripsi */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="taskDesc"
              className="font-label-lg text-label-lg text-on-surface flex items-center justify-between"
            >
              <span>Deskripsi &amp; Target Luaran</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Opsional</span>
            </label>
            <textarea
              id="taskDesc"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan apa yang harus dikerjakan dan bentuk buktinya..."
              className="w-full bg-surface-container-lowest rounded-xl p-3 font-body-md text-body-md text-on-surface placeholder:text-outline shadow-[2px_2px_0px_#1F2A44] focus:outline-none focus:shadow-[3px_3px_0px_#1F2A44] resize-none transition-all"
            />
          </div>

          {/* Penanggung jawab */}
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3.5 rounded-2xl shadow-[3px_3px_0px_#1F2A44]">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-tertiary">group</span>
                Penanggung Jawab
              </span>
              <span className="font-label-md text-label-md bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full font-bold">
                1 Anggota Terpilih
              </span>
            </div>

            <div className="bg-secondary-container/30 rounded-xl p-2.5 flex items-start gap-2 shadow-[1px_1px_0px_#1F2A44]">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                smart_toy
              </span>
              <div className="flex flex-col">
                <span className="font-label-sticker text-label-sticker text-on-secondary-container">
                  Rekomendasi AI Rukun 🤖
                </span>
                <p className="font-body-sm text-body-sm text-on-surface leading-tight mt-0.5">
                  Rekomendasi tugas ini ke{' '}
                  {rekomendasi.map((m, i) => (
                    <span key={m.id}>
                      {i > 0 && ' atau '}
                      <strong>
                        {m.name} ({m.beban}%)
                      </strong>
                    </span>
                  ))}{' '}
                  agar beban tim seimbang merata!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {members.map((m) => {
                const aktif = terpilih === m.id;
                const rekom = rekomendasi.some((r) => r.id === m.id);
                const berat = m.beban === maxBeban && m.beban >= 35;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAssignee(m.id)}
                    className={`text-left p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                      aktif
                        ? 'bg-tertiary/10 shadow-[2px_2px_0px_#1F2A44]'
                        : 'bg-surface-container-low shadow-[1px_1px_0px_#1F2A44] hover:bg-surface-container'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md shadow-[1px_1px_0px_#1F2A44] ${m.avatar}`}
                      >
                        {m.id}
                      </div>
                      {rekom && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-tertiary text-on-tertiary rounded-full flex items-center justify-center text-[10px] font-bold">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">
                        {m.name}
                      </span>
                      <span
                        className={`font-body-sm text-body-sm font-bold ${
                          berat ? 'text-error' : rekom ? 'text-tertiary' : 'text-on-surface-variant'
                        }`}
                      >
                        Beban: {m.beban}%{berat ? ' ⚠️' : ''}
                      </span>
                    </div>
                    {aktif && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bobot */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">scale</span>
                Perkiraan Bobot Beban Kerja
              </span>
              <span className="font-label-sticker text-label-sticker text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded shadow-[1px_1px_0px_#1F2A44]">
                Gotong Royong
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WEIGHTS.map((w) => {
                const aktif = weight === w.key;
                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => setWeight(w.key)}
                    className={`p-2.5 rounded-xl text-center flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                      aktif
                        ? 'bg-secondary-container shadow-[3px_3px_0px_#1F2A44]'
                        : 'bg-surface-container-lowest shadow-[2px_2px_0px_#1F2A44]'
                    }`}
                  >
                    <span className="font-label-lg text-label-lg text-on-surface">{w.label}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {w.range}
                    </span>
                    <span className="text-[11px] font-bold text-tertiary mt-0.5">{w.contoh}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
            {/* Deadline */}
          <div className="flex flex-col gap-2">
            <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">
                event_upcoming
              </span>
              Tenggat Waktu (Deadline)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {DEADLINES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeadline(d)}
                  className={`px-3 py-1.5 rounded-full font-label-md text-label-md shadow-[2px_2px_0px_#1F2A44] whitespace-nowrap transition-all ${
                    deadline === d
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {deadline.includes('Pilih Tanggal') && (
              <input
                type="datetime-local"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-surface-container-lowest px-3 py-2.5 rounded-xl shadow-[2px_2px_0px_#1F2A44] font-body-md text-body-md text-on-surface focus:outline-none"
              />
            )}
          </div>

          {/* Bukti nyata */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  fact_check
                </span>
                Format Bukti Nyata Wajib
              </span>
              <span className="font-body-sm text-body-sm text-tertiary font-bold">
                Anti-Free Rider
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EVIDENCES.map((e) => (
                <label
                  key={e.key}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-lowest shadow-[2px_2px_0px_#1F2A44] cursor-pointer active:scale-[0.98] transition-all"
                >
                  <input
                    type="checkbox"
                    checked={evidence.includes(e.key)}
                    onChange={() => toggleEvidence(e.key)}
                    className="w-4 h-4 rounded accent-[#2FA39A]"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      {e.label}
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      {e.hint}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-space-md bg-[#FAF6EF] shadow-[0_-2px_10px_rgba(15,27,52,0.06)] flex flex-col gap-space-sm">
          <div className="flex items-center gap-2 bg-surface-container/60 px-3 py-2 rounded-xl">
            <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0">
              verified_user
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              Tugas yang dibuat akan langsung transparan di dasbor dan dapat dipantau oleh{' '}
              <strong>Bu Rina (Guru Sejarah)</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row-reverse gap-2">
            <button
              type="button"
              onClick={simpan}
              disabled={!title.trim()}
              className="w-full sm:flex-1 py-3.5 px-space-md bg-primary-container text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-[4px_4px_0px_#1F2A44] hover:shadow-[5px_5px_0px_#1F2A44] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>Simpan &amp; Masukkan ke Kanban</span>
              <span className="text-[18px]">🚀</span>
            </button>
            <button
              type="button"
              onClick={tutup}
              className="w-full sm:w-auto py-2.5 px-space-md text-on-surface-variant hover:text-on-surface font-label-lg text-label-lg rounded-xl transition-colors text-center"
            >
              Batal, kembali ke papan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}