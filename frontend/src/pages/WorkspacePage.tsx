import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TambahTugasModal, type TugasBaru } from '../components/TambahTugasModal';
import { LaporRahasiaModal, type LaporanRahasia } from '../components/LaporanRahasiaModal';
import AIFacilitatorChat from './AIFacilitatorChat';
import { StudentLobbyGroupPicker } from '../components/StudentLobbyGroupPicker';
import {
  getSession,
  clearSession,
  getRoomDetail,
  fetchGroupTasks,
  createGroupTask,
  updateGroupTaskProgress,
  submitPeerReport,
  fetchGroupMessages,
  sendGroupMessage,
  type GroupTask,
  type RoomDetailStudent,
  type GroupMessage,
} from '../lib/api';

const TABS = [
  { key: 'kanban', label: 'Kanban Tugas', icon: 'view_kanban' },
  { key: 'chat', label: 'Chat Kelompok', icon: 'forum' },
  { key: 'ai', label: 'AI Fasilitator', icon: 'auto_awesome' },
] as const;

const REACTIONS = ['👏', '🔥', '💪', '🙌', '⭐'];

const AVATAR_COLORS = [
  'bg-tertiary text-on-tertiary',
  'bg-primary-container text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-inverse-surface text-inverse-on-surface',
  'bg-secondary-container text-on-secondary-fixed',
  'bg-surface-tint text-white',
];

export function WorkspacePage() {
  const { pin: routePin } = useParams();
  const navigate = useNavigate();

  const session = getSession();
  const pin = routePin || session?.pin || '';

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('kanban');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [roomData, setRoomData] = useState<RoomDetailStudent | null>(null);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [reaksi, setReaksi] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [laporOpen, setLaporOpen] = useState(false);

  // Ambil data room & tugas
  const loadData = async () => {
    if (!pin) {
      setErrorMessage('PIN kelas tidak ditemukan. Silakan login kembali.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const detail = (await getRoomDetail(pin)) as RoomDetailStudent;
      setRoomData(detail);

      const myGroup = detail.groups?.[0];
      if (myGroup) {
        const [taskList, msgList] = await Promise.all([
          fetchGroupTasks(myGroup.id).catch(() => []),
          fetchGroupMessages(myGroup.id).catch(() => []),
        ]);
        setTasks(taskList);
        setMessages(msgList);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat ruang kerja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pin]);

  const myGroup = roomData?.groups?.[0];
  const members = myGroup?.members || [];
  const currentParticipantId = roomData?.me?.id || session?.participant?.id || '';
  const currentParticipantName = (
    roomData?.me?.name ||
    session?.participant?.name ||
    ''
  ).trim();
  const myParticipantName = currentParticipantName.toLowerCase();

  // Hitung persentase kontribusi per anggota secara berbobot
  const memberProgressMap = useMemo(() => {
    const map: Record<string, { totalWeight: number; weightedDone: number }> = {};
    for (const m of members) {
      map[m.id] = { totalWeight: 0, weightedDone: 0 };
    }
    for (const t of tasks) {
      if (t.assigneeId && map[t.assigneeId]) {
        const w = t.weight || 1;
        map[t.assigneeId].totalWeight += w;
        map[t.assigneeId].weightedDone += (w * (t.progress || 0)) / 100;
      }
    }
    return map;
  }, [members, tasks]);

  // Rata-rata bobot grup
  const groupProgressPercent = useMemo(() => {
    const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0);
    if (!totalWeight) return 0;
    const totalDone = tasks.reduce((sum, t) => sum + (t.weight || 1) * (t.progress || 0), 0);
    return Math.round(totalDone / totalWeight);
  }, [tasks]);

  // Obrolan murni sesama rekan kelompok (tanpa bot / AI dan tanpa pertanyaan siswa ke AI)
  const peerMessages = useMemo(() => {
    return messages.filter(
      (m) =>
        !m.isAi &&
        m.senderName !== 'AI Asisten Rukun' &&
        m.senderName !== 'Asisten AI' &&
        !m.senderName?.toLowerCase().includes('ai') &&
        (!m.action || m.action === 'peer_chat')
    );
  }, [messages]);

  // Auto-scroll ke pesan terbaru saat tab chat dibuka atau ada pesan baru
  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tab, peerMessages.length]);

  // Polling chat otomatis tiap 3 detik saat tab chat sedang aktif
  useEffect(() => {
    if (tab !== 'chat' || !myGroup?.id) return;
    const interval = setInterval(() => {
      fetchGroupMessages(myGroup.id)
        .then((latest) => {
          setMessages(latest);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [tab, myGroup?.id]);

  const handleUpdateProgress = async (taskId: string, currentProgress: number, tambah: number) => {
    setErrorMessage(null);
    setActionSuccess(null);
    const newProgress = Math.min(100, Math.max(0, currentProgress + tambah));

    try {
      const updated = await updateGroupTaskProgress(taskId, newProgress);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setActionSuccess(`Progres berhasil diperbarui ke ${newProgress}%.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setErrorMessage(
        err?.status === 403
          ? 'Hanya siswa penanggung jawab tugas ini yang dapat memperbarui progres.'
          : err?.message || 'Gagal memperbarui progres.'
      );
    }
  };

  const handleSimpanTugas = async (data: TugasBaru) => {
    if (!myGroup) return;
    setErrorMessage(null);
    setActionSuccess(null);

    const weightNum = data.weight === 'ringan' ? 15 : data.weight === 'berat' ? 40 : 25;
    try {
      const created = await createGroupTask(myGroup.id, {
        title: data.title,
        description: data.desc || null,
        assigneeId: data.assignee || null,
        weight: weightNum,
      });
      setTasks((prev) => [created, ...prev]);
      setModalOpen(false);
      setActionSuccess('Tugas baru berhasil ditambahkan.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menambahkan tugas baru.');
    }
  };

  const handleKirimLaporanRahasia = async (laporan: LaporanRahasia) => {
    if (!myGroup) return;
    setErrorMessage(null);
    setActionSuccess(null);

    try {
      const rating = laporan.issue === 'freeriding' ? 1 : laporan.issue === 'absence' ? 2 : 3;
      const feedback = `[${laporan.issue}] ${laporan.chronology}`.slice(0, 300);
      await submitPeerReport(myGroup.id, {
        reportedId: laporan.reportedId,
        rating,
        feedback,
      });
      setLaporOpen(false);
      setActionSuccess('Laporan rahasia berhasil dikirim ke Guru. Identitasmu tetap anonim.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim laporan rahasia.');
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroup || !chatInput.trim()) return;
    setSendingChat(true);

    try {
      const msg = await sendGroupMessage(myGroup.id, chatInput.trim());
      setMessages((prev) => [...prev, msg]);
      setChatInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim pesan chat.');
    } finally {
      setSendingChat(false);
    }
  };

  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const doingTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface text-on-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm">Memuat ruang kerja kelompok...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-secondary-container">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-surface-container-lowest border-b-2 border-[#0f1b34] px-4 py-3 shadow-[0_2px_0px_#0f1b34]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-xl bg-surface-container-high border-2 border-[#0f1b34] flex items-center justify-center font-bold shadow-[2px_2px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
            >
              ←
            </button>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight flex items-center gap-2">
                <span>{roomData?.room.title || 'Ruang Kerja Siswa'}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary-container border border-[#0f1b34]">
                  PIN: {pin}
                </span>
              </h1>
              <p className="text-xs text-on-surface-variant">
                {roomData?.room.className || 'Kelas'} • {myGroup?.name || 'Belum Masuk Kelompok'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {myGroup && (
              <button
                type="button"
                onClick={() => setLaporOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-red-100 text-red-900 border-2 border-red-800 shadow-[2px_2px_0px_#991b1b] text-xs font-bold hover:-translate-y-0.5 active:translate-y-0.5 transition-transform flex items-center gap-1"
              >
                <span>🚨</span>
                <span>Lapor Rahasia</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                clearSession();
                navigate('/');
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] text-xs font-bold hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-100 text-red-900 border-2 border-red-700 shadow-[3px_3px_0px_#b91c1c] text-sm flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="font-bold px-2">
              ×
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border-2 border-emerald-700 shadow-[3px_3px_0px_#047857] text-sm flex items-center justify-between">
            <span>✅ {actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess(null)} className="font-bold px-2">
              ×
            </button>
          </div>
        )}

        {/* Jika belum masuk kelompok: Tampilkan Lobi Pemilihan Anggota Kelompok */}
        {!myGroup ? (
          <StudentLobbyGroupPicker pin={pin} onGroupJoined={loadData} />
        ) : (
          <>
            {/* Info Kelompok & Ringkasan Bobot */}
            <div className="rounded-2xl bg-surface-container-lowest p-5 border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-bold text-tertiary">
                  {myGroup?.name || 'Kelompok Belum Dibagi'}
                </span>
                {myGroup?.pin && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-900 border border-[#0f1b34] px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#0f1b34]">
                    <span>🔒 PIN:</span>
                    <span className="font-mono tracking-wider">{myGroup.pin}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(myGroup.pin!);
                        setActionSuccess(`PIN Kelompok (${myGroup.pin}) berhasil disalin! Bagikan ke teman satu tim.`);
                        setTimeout(() => setActionSuccess(null), 3000);
                      }}
                      title="Salin PIN Kelompok"
                      className="hover:scale-110 active:scale-95 transition-transform text-xs"
                    >
                      📋
                    </button>
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black">Papan Kolaborasi & Keadilan</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-secondary-container px-3 py-1 rounded-full border border-[#0f1b34]">
                Progres Grup: {groupProgressPercent}%
              </span>
            </div>
          </div>

          {/* Baris Anggota Kelompok */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {members.map((m, idx) => {
              const stat = memberProgressMap[m.id];
              const isMe = m.id === currentParticipantId;
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] flex flex-col gap-1.5 ${
                    isMe ? 'bg-secondary-container/30' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border border-[#0f1b34] ${colorClass}`}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold truncate flex-1">
                      {m.name} {isMe && '(Saya)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    Beban: <strong>{stat?.totalWeight || 0} bobot</strong>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden border border-[#0f1b34]/30">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${stat?.totalWeight ? Math.round((stat.weightedDone / stat.totalWeight) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigasi */}
        <div className="flex gap-2 border-b-2 border-[#0f1b34] pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] transition-all flex items-center gap-1.5 ${
                tab === t.key
                  ? 'bg-primary text-on-primary -translate-y-0.5'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
          {tab === 'kanban' && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ml-auto px-3 py-1.5 rounded-xl bg-primary-container text-on-primary font-bold text-xs border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform flex items-center gap-1"
            >
              <span>+</span>
              <span>Tambah Tugas</span>
            </button>
          )}
        </div>

        {/* Tab 1: KANBAN */}
        {tab === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* TODO */}
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-surface-container-low border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34]">
              <div className="flex items-center justify-between pb-1 border-b border-[#0f1b34]/30 font-bold text-sm">
                <span>📋 Belum Dikerjakan</span>
                <span className="bg-surface px-2 py-0.5 rounded text-xs border border-[#0f1b34]">
                  {todoTasks.length}
                </span>
              </div>
              {todoTasks.map((t) => {
                const isAssignee = t.assigneeId === currentParticipantId;
                const assigneeName = members.find((m) => m.id === t.assigneeId)?.name || 'Belum Ada';
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-surface-container-lowest border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-sm leading-tight">{t.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary-container border border-[#0f1b34]">
                        Beban {t.weight}%
                      </span>
                    </div>
                    {t.description && <p className="text-xs text-on-surface-variant line-clamp-2">{t.description}</p>}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-on-surface-variant truncate">PIC: <strong>{assigneeName}</strong></span>
                      {isAssignee ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateProgress(t.id, 0, 10)}
                          className="px-2 py-1 rounded-lg bg-primary-container text-on-primary font-bold shadow-[1px_1px_0px_#0f1b34] border border-[#0f1b34] text-[11px]"
                        >
                          Mulai (10%)
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic">Bukan PIC</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* IN_PROGRESS */}
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-secondary-container/20 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34]">
              <div className="flex items-center justify-between pb-1 border-b border-[#0f1b34]/30 font-bold text-sm">
                <span>⚡ Sedang Dikerjakan</span>
                <span className="bg-surface px-2 py-0.5 rounded text-xs border border-[#0f1b34]">
                  {doingTasks.length}
                </span>
              </div>
              {doingTasks.map((t) => {
                const isAssignee = t.assigneeId === currentParticipantId;
                const assigneeName = members.find((m) => m.id === t.assigneeId)?.name || 'Belum Ada';
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-surface-container-lowest border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-sm leading-tight">{t.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-tertiary text-on-tertiary border border-[#0f1b34]">
                        {t.progress}%
                      </span>
                    </div>
                    {t.description && <p className="text-xs text-on-surface-variant line-clamp-2">{t.description}</p>}
                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden border border-[#0f1b34]/20">
                      <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-on-surface-variant truncate">PIC: <strong>{assigneeName}</strong></span>
                      {isAssignee ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(t.id, t.progress, 15)}
                            className="px-2 py-0.5 rounded bg-surface border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34] font-bold text-[11px]"
                          >
                            +15%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(t.id, t.progress, 100 - t.progress)}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34] font-bold text-[11px]"
                          >
                            Kelar!
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic">Bukan PIC</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DONE */}
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-emerald-50 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34]">
              <div className="flex items-center justify-between pb-1 border-b border-[#0f1b34]/30 font-bold text-sm text-emerald-900">
                <span>✅ Rampung</span>
                <span className="bg-surface px-2 py-0.5 rounded text-xs border border-[#0f1b34]">
                  {doneTasks.length}
                </span>
              </div>
              {doneTasks.map((t) => {
                const assigneeName = members.find((m) => m.id === t.assigneeId)?.name || 'Belum Ada';
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-surface-container-lowest border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] flex flex-col gap-1.5 opacity-90"
                  >
                    <span className="font-bold text-sm line-through text-gray-600">{t.title}</span>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span>PIC: {assigneeName}</span>
                      <span className="text-emerald-700 font-bold">100% Selesai</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: CHAT KELOMPOK (WHATSAPP STYLE MURNI ANTAR SISWA) */}
        {tab === 'chat' && (
          <div className="rounded-2xl bg-surface-container-lowest border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] flex flex-col h-[540px] overflow-hidden">
            {/* Header Chat */}
            <div className="p-3 border-b-2 border-[#0f1b34] bg-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34]">
                  💬
                </div>
                <div>
                  <h3 className="font-black text-sm text-on-surface">Obrolan Rekan Kelompok</h3>
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{members.map((x) => x.name).join(', ') || 'Anggota Tim'}</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-secondary-container px-2.5 py-0.5 rounded-full border border-[#0f1b34]">
                {peerMessages.length} Pesan
              </span>
            </div>

            {/* Area Pesan Bubble WhatsApp */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5 bg-[#efeae2]/40 dark:bg-surface">
              {peerMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto text-center gap-2 p-6 bg-surface-container-lowest/80 rounded-2xl border border-dashed border-[#0f1b34] max-w-sm mx-auto">
                  <span className="text-3xl">👋</span>
                  <p className="font-bold text-xs text-on-surface">Belum ada obrolan di kelompok ini.</p>
                  <p className="text-[11px] text-on-surface-variant">
                    Ketik pesan di bawah untuk menyapa rekan sekelompokmu!
                  </p>
                </div>
              ) : (
                peerMessages.map((m) => {
                  const senderClean = (m.senderName || '').trim().toLowerCase();
                  const isMe = Boolean(myParticipantName && senderClean === myParticipantName);

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2 border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] text-xs ${
                          isMe
                            ? 'bg-[#dcf8c6] text-[#0f1b34] rounded-2xl rounded-tr-none'
                            : 'bg-surface-container-lowest text-on-surface rounded-2xl rounded-tl-none'
                        }`}
                      >
                        {/* Nama pengirim untuk pesan rekan (Orang Lain / Kiri) */}
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1 pb-0.5 border-b border-[#0f1b34]/15">
                            <span className="font-black text-[11px] text-primary tracking-wide">
                              {m.senderName}
                            </span>
                          </div>
                        )}

                        {/* Isi Chat */}
                        <div className="whitespace-pre-wrap break-words leading-relaxed font-medium text-xs md:text-sm pr-12 pb-1">
                          {m.content}
                        </div>

                        {/* Timestamp & Status Centang WA */}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 font-mono -mt-1 ml-auto select-none">
                          <span>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {isMe && <span className="text-[#34b7f1] font-bold text-[11px]">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Kirim Pesan */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-3 border-t-2 border-[#0f1b34] flex items-center gap-2 bg-surface-container-low"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ketik pesan untuk rekan kelompok..."
                className="flex-1 px-4 py-2.5 rounded-full bg-surface-container-lowest border-2 border-[#0f1b34] text-xs md:text-sm focus:outline-none shadow-[2px_2px_0px_#0f1b34]"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 shrink-0"
                title="Kirim Pesan"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: AI FASILITATOR */}
        {tab === 'ai' && (
          <div className="rounded-2xl border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] overflow-hidden">
            <AIFacilitatorChat groupId={myGroup?.id} onTasksUpdated={loadData} />
          </div>
        )}

        {/* Beri Semangat Rekan */}
        <div className="flex flex-col gap-1 bg-surface-container-lowest p-3 rounded-2xl border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1">✨ Reaksi Gotong Royong</span>
            <span className="text-[11px] text-on-surface-variant">Klik untuk semangatin kelompok</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {REACTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReaksi(r)}
                className={`w-9 h-9 rounded-full text-base flex items-center justify-center border-2 border-[#0f1b34] transition-all active:scale-90 ${
                  reaksi === r ? 'bg-secondary-container shadow-[2px_2px_0px_#0f1b34]' : 'bg-surface-container hover:bg-surface'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
          </>
        )}
      </main>

      {/* Modal Tambah Tugas */}
      <TambahTugasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSimpanTugas}
        members={members.map((m, idx) => ({
          id: m.id,
          name: m.name,
          beban: memberProgressMap[m.id]?.totalWeight || 0,
          avatar: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        }))}
      />

      {/* Modal Lapor Rahasia */}
      <LaporRahasiaModal
        open={laporOpen}
        onClose={() => setLaporOpen(false)}
        currentUserId={currentParticipantId}
        onSubmit={handleKirimLaporanRahasia}
        members={members.map((m, idx) => ({
          id: m.id,
          name: m.name,
          avatar: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        }))}
      />
    </div>
  );
}
