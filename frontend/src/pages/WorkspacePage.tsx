import { useState } from 'react';
import { TambahTugasModal, type TugasBaru } from '../components/TambahTugasModal';


const MASCOT_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W5eZPrRliobZqL7wjMSsv9q12K9-2ZiW7u3Vggyi3NHg1EiT2-_FIyJFaiy7GVBpetGWXcV91c2HzchqV-9RucCrkr4Atyps34eet5RVzN_pDDGpsYtm3tF78FON0KtYUyftgwSVYa5r9yLYnw8-wjWY9jUJ4magzvYQhjlvzq7w-SyC0yUcdugwx-dcuLYo7kV4hrTUVcM3VWZVbaIiTL4iFe0rFglynUz9Uen5hZWA';

type Status = 'todo' | 'doing' | 'done';
type MemberId = 'DF' | 'ND' | 'BM' | 'SL';

interface Task {
  id: number;
  title: string;
  desc: string;
  status: Status;
  assignee: MemberId;
  progress: number; // 0-100
  deadline?: string;
  docs?: number;
  aiValid?: boolean;
}

const MEMBERS: Record<
  MemberId,
  { name: string; avatar: string; text: string; online: boolean; share: number; role: string }
> = {
  DF: { name: 'Dafano', avatar: 'bg-tertiary text-on-tertiary', text: 'text-tertiary', online: true, share: 28, role: 'Riset' },
  ND: { name: 'Nadya', avatar: 'bg-primary-container text-on-primary', text: 'text-primary', online: true, share: 26, role: 'Analisis' },
  BM: { name: 'Bima', avatar: 'bg-secondary text-on-secondary', text: 'text-secondary', online: true, share: 24, role: 'Visual' },
  SL: { name: 'Salsa', avatar: 'bg-inverse-surface text-inverse-on-surface', text: 'text-inverse-surface', online: false, share: 22, role: 'Slide' },
};

const BAR_COLORS: Record<MemberId, string> = {
  DF: 'bg-tertiary',
  ND: 'bg-primary-container',
  BM: 'bg-secondary',
  SL: 'bg-inverse-surface',
};

// TODO: ganti dengan data dari backend (GET tugas per kelompok)
const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: 'Desain Slide Presentasi Canva',
    desc: 'Siapkan template bernuansa Majapahit & infografis singkat',
    status: 'todo',
    assignee: 'SL',
    progress: 0,
    deadline: 'Tenggat Besok',
  },
  {
    id: 2,
    title: 'Bab 2: Analisis Runtuhnya Singasari',
    desc: 'Menghubungkan kudeta Jayakatwang dengan ekspedisi Pamalayu',
    status: 'doing',
    assignee: 'ND',
    progress: 70,
    docs: 2,
  },
  {
    id: 3,
    title: 'Bab 1: Pendahuluan & Kronologi',
    desc: 'Garis waktu Raden Wijaya mendirikan desa Tarik hingga penobatan',
    status: 'doing',
    assignee: 'DF',
    progress: 100,
    aiValid: true,
  },
  {
    id: 4,
    title: 'Struktur Organisasi & Peta Wilayah',
    desc: 'Diagram Dharmaputra dan wilayah taklukan Hayam Wuruk',
    status: 'done',
    assignee: 'BM',
    progress: 100,
  },
];

const TABS = [
  { key: 'kanban', label: 'Kanban Tugas', icon: 'view_kanban' },
  { key: 'aktivitas', label: 'Aktivitas Tim', icon: 'history' },
  { key: 'ai', label: 'AI Fasilitator', icon: 'auto_awesome' },
] as const;

const REACTIONS = ['👏', '🔥', '💪', '🙌', '⭐'];

export function WorkspacePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('kanban');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [reaksi, setReaksi] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const mulaiKerjakan = (id: number) => {
    // TODO: PATCH status tugas ke backend
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'doing', progress: 0 } : t,
      ),
    );
  };

  const tambahPersen = (id: number, tambah = 10) => {
    // TODO: PATCH progress tugas ke backend (fitur: siswa menambah persen kerja)
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const progress = Math.min(100, t.progress + tambah);
        return { ...t, progress, status: progress >= 100 ? 'done' : t.status };
      }),
    );
  };

  const bukaModalTugas = () => setModalOpen(true);

const simpanTugas = (data: TugasBaru) => {
  // TODO: POST tugas baru ke backend
  setTasks((prev) => [
    ...prev,
    {
      id: Date.now(),
      title: data.title,
      desc: data.desc || 'Belum ada deskripsi',
      status: 'todo',
      assignee: data.assignee as MemberId,
      progress: 0,
      deadline: data.deadline.replace(/^\S+\s/, ''),
    },
  ]);
  setModalOpen(false);
};

  const todo = tasks.filter((t) => t.status === 'todo');
  const doing = tasks.filter((t) => t.status === 'doing');
  const done = tasks.filter((t) => t.status === 'done');

  const Avatar = ({ id, size = 'w-6 h-6' }: { id: MemberId; size?: string }) => (
    <div
      className={`${size} rounded-full flex items-center justify-center font-label-md text-label-md ${MEMBERS[id].avatar}`}
    >
      {id}
    </div>
  );

  const TaskCard = ({ t }: { t: Task }) => {
    const isDone = t.status === 'done';
    return (
      <div
        className={`flex flex-col gap-space-sm p-space-md rounded-xl shadow-md ${
          isDone ? 'bg-surface-container-low' : 'bg-surface-container-lowest'
        }`}
      >
        <div className="flex items-start justify-between gap-space-xs">
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className={`font-title-md text-title-md text-on-surface ${
                isDone ? 'line-through decoration-on-surface-variant/40' : ''
              }`}
            >
              {t.title}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{t.desc}</span>
          </div>
          {t.deadline && (
            <span className="shrink-0 font-label-sticker text-label-sticker bg-error-container text-on-error-container px-2 py-0.5 rounded -rotate-2">
              {t.deadline}
            </span>
          )}
          {t.aiValid && (
            <span className="shrink-0 font-label-sticker text-label-sticker bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded rotate-1">
              ✦ AI Valid
            </span>
          )}
          {isDone && (
            <span className="shrink-0 font-label-sticker text-label-sticker bg-surface-container-high text-on-surface px-2 py-0.5 rounded">
              Rampung
            </span>
          )}
        </div>

        {t.status === 'doing' && (
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container transition-all"
              style={{ width: `${t.progress}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-space-xs gap-2">
          <div className="flex items-center gap-2">
            <Avatar id={t.assignee} />
            <span className="font-body-sm text-body-sm text-on-surface">
              {MEMBERS[t.assignee].name}
            </span>
          </div>

          {t.status === 'todo' && (
            <button
              type="button"
              onClick={() => mulaiKerjakan(t.id)}
              className="bg-primary-container text-on-primary font-label-lg text-label-lg px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Mulai Kerjakan
            </button>
          )}
          {t.status === 'doing' && (
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md text-primary font-bold">
                {t.progress >= 100 ? 'Selesai?' : `Draft ${t.progress}%`}
              </span>
              {t.docs ? (
                <span className="flex items-center gap-0.5 text-on-surface-variant font-label-md text-label-md bg-surface-container px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[14px]">attachment</span>
                  {t.docs} Dokumen
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => tambahPersen(t.id, 10)}
                className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md border-2 border-on-surface shadow-[2px_2px_0px_#0f1b34] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                +10%
              </button>
            </div>
          )}

          {isDone && (
            <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                check_circle
              </span>
              Terverifikasi Tim
            </span>
          )}
        </div>
      </div>
    );
  };

  const ColumnHeader = ({
    dot,
    label,
    count,
    action,
  }: {
    dot: string;
    label: string;
    count: number;
    action?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="font-headline-sm text-headline-sm text-on-surface">{label}</span>
        <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded font-label-md text-label-md">
          {count}
        </span>
      </div>
      {action}
    </div>
  );

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,27,52,0.05)]">
        <div className="h-16 px-margin max-w-5xl mx-auto flex items-center justify-between gap-space-sm">
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
              <div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-md text-label-md">
                DF
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-tertiary-container rounded-full ring-2 ring-surface" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-5xl mx-auto px-margin pt-space-md pb-12 gap-space-lg">
          {/* Info kelompok */}
          <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-md">
            <div className="flex items-center justify-between gap-space-xs flex-wrap">
              <div className="flex items-center gap-space-xs bg-secondary-container px-2.5 py-1 rounded shadow-sm -rotate-1">
                <span className="text-[16px]">🏆</span>
                <span className="font-headline-sm text-headline-sm text-on-secondary-container">
                  Kelompok 1: Majapahit Juara
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                <span className="font-label-sticker text-label-sticker font-bold">
                  Sisa 2 Hari 14 Jam
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-space-xs">
              <div className="flex items-center -space-x-2">
                {(Object.keys(MEMBERS) as MemberId[]).map((id) => (
                  <div
                    key={id}
                    className="relative"
                    title={`${MEMBERS[id].name} (${MEMBERS[id].online ? 'Online' : 'Baru Saja Aktif'})`}
                  >
                    <Avatar id={id} size="w-9 h-9" />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${
                        MEMBERS[id].online ? 'bg-tertiary-container' : 'bg-secondary-fixed-dim'
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded">
                <span className="material-symbols-outlined text-[16px] text-tertiary">group</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  4 Anggota Siaga
                </span>
              </div>
            </div>
          </div>

          {/* Tab */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
            {TABS.map((t) => {
              const aktif = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-title-md text-body-md shadow-sm whitespace-nowrap ${
                    aktif
                      ? 'bg-surface-container-high text-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={bukaModalTugas}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-title-md text-body-md shadow-[2px_2px_0px_#0f1b34] active:scale-95 transition-all whitespace-nowrap ml-auto"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Tugas Baru</span>
            </button>
          </div>

          {/* Rasio kontribusi */}
          <div className="bg-secondary-container text-on-secondary-container p-space-md rounded-xl shadow-md relative">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px]">balance</span>
                <span className="font-headline-sm text-headline-sm">Rasio Kontribusi Adil</span>
              </div>
              <span className="font-label-sticker text-label-sticker bg-surface-container-lowest text-on-surface px-2 py-0.5 rounded rotate-1">
                ⚖️ Seimbang
              </span>
            </div>
            <div className="w-full bg-surface-container-lowest/40 h-3 rounded-full overflow-hidden flex mb-2 shadow-inner">
              {(Object.keys(MEMBERS) as MemberId[]).map((id) => (
                <div
                  key={id}
                  className={`h-full ${BAR_COLORS[id]}`}
                  style={{ width: `${MEMBERS[id].share}%` }}
                  title={`${MEMBERS[id].name}: ${MEMBERS[id].share}%`}
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1 text-center font-label-md text-label-md">
              {(Object.keys(MEMBERS) as MemberId[]).map((id) => (
                <div key={id} className="flex flex-col items-center">
                  <span className={`${MEMBERS[id].text} font-bold`}>
                    {id} {MEMBERS[id].share}%
                  </span>
                  <span className="text-[10px] opacity-80">{MEMBERS[id].role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Isi tab */}
          {tab === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg items-start">
              {/* Belum dikerjakan */}
              <div className="flex flex-col gap-space-sm">
                <ColumnHeader
                  dot="bg-error"
                  label="Belum Dikerjakan"
                  count={todo.length}
                  action={
                    <button
                      type="button"
                      onClick={bukaModalTugas}
                      aria-label="Tambah tugas"
                      className="flex items-center gap-1 bg-surface-container-lowest text-primary px-2.5 py-1 rounded-lg border-2 border-on-surface shadow-[2px_2px_0px_#0f1b34] hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  }
                />
                {todo.map((t) => (
                  <TaskCard key={t.id} t={t} />
                ))}
                <button
                  type="button"
                  onClick={bukaModalTugas}
                  className="w-full flex items-center justify-center gap-2 p-space-md rounded-xl bg-surface-container-lowest border-2 border-dashed border-on-surface shadow-[2px_2px_0px_#0f1b34] text-on-surface hover:bg-secondary-container/30 hover:border-primary transition-all active:scale-95 group text-left"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm border border-on-surface">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors leading-none">
                      Tambah Tugas Baru
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Bagi peran baru secara adil bersama teman kelompok
                    </span>
                  </div>
                </button>
              </div>

              {/* Sedang dikerjakan */}
              <div className="flex flex-col gap-space-sm">
                <ColumnHeader dot="bg-secondary-fixed-dim" label="Sedang Dikerjakan" count={doing.length} />
                {doing.map((t) => (
                  <TaskCard key={t.id} t={t} />
                ))}
              </div>

              {/* Selesai */}
              <div className="flex flex-col gap-space-sm">
                <ColumnHeader dot="bg-tertiary-container" label="Selesai" count={done.length} />
                {done.map((t) => (
                  <TaskCard key={t.id} t={t} />
                ))}
              </div>
            </div>
          )}

          {tab === 'aktivitas' && (
            <div className="bg-surface-container-low p-space-lg rounded-xl text-center text-on-surface-variant">
              {/* TODO: riwayat aktivitas tim dari backend */}
              Riwayat aktivitas tim akan tampil di sini.
            </div>
          )}

          {tab === 'ai' && (
            <div className="bg-surface-container-low p-space-lg rounded-xl text-center text-on-surface-variant">
              {/* TODO: layar "AI Fasilitator Bersama" (API Gemini) */}
              AI Fasilitator (Gemini) akan tampil di sini.
            </div>
          )}

          {/* Beri semangat */}
          <div className="flex flex-col gap-space-xs bg-surface-container-lowest p-space-md rounded-xl shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
                <span className="text-[16px]">✨</span> Beri Semangat Rekan
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Ketuk untuk reaksi
              </span>
            </div>
            <div className="flex items-center gap-space-sm pt-1">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReaksi(r)}
                  className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all active:scale-90 ${
                    reaksi === r
                      ? 'bg-secondary-container shadow-[2px_2px_0px_#0f1b34]'
                      : 'bg-surface-container hover:bg-surface-container-high'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <TambahTugasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={simpanTugas}
        members={(Object.keys(MEMBERS) as MemberId[]).map((id) => ({
          id,
          name: MEMBERS[id].name,
          beban: MEMBERS[id].share,
          avatar: MEMBERS[id].avatar,
        }))}
      />
    </div>
  );
}