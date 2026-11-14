import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSession,
  clearSession,
  getRoomDetail,
  fetchRoomProgress,
  fetchRoomPeerReports,
  fetchRoomAlerts,
  analyzeRoomFairness,
  fetchTeacherSummary,
  splitRoomGroupsAuto,
  type RoomDetailTeacher,
  type RoomProgressData,
  type TeacherPeerReport,
  type GhostingAlertItem,
  type FairnessAnalysisResult,
  type TeacherAiSummary,
} from '../lib/api';

import mascotSvg from '../assets/mascot.svg';

const MASCOT_URL = mascotSvg;

function renderFeedbackText(feedback: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = feedback.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold underline hover:opacity-80 inline-flex items-center gap-0.5 break-all not-italic"
            >
              <span>{part}</span>
              <span className="material-symbols-outlined text-[13px] inline">open_in_new</span>
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const params = useParams<{ pin?: string }>();
  const session = getSession();

  const [currentPin, setCurrentPin] = useState<string>(params.pin || session?.pin || '123456');
  const [inputPin, setInputPin] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [slowServer, setSlowServer] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data utama Room & Monitoring
  const [roomData, setRoomData] = useState<RoomDetailTeacher | null>(null);
  const [progressData, setProgressData] = useState<RoomProgressData | null>(null);
  const [reports, setReports] = useState<TeacherPeerReport[]>([]);
  const [alerts, setAlerts] = useState<GhostingAlertItem[]>([]);

  // AI Insights
  const [fairnessAnalysis, setFairnessAnalysis] = useState<FairnessAnalysisResult | null>(null);
  const [loadingFairness, setLoadingFairness] = useState<boolean>(false);

  // Group Summary Modal
  const [selectedGroupSummary, setSelectedGroupSummary] = useState<{
    groupName: string;
    summary: TeacherAiSummary | null;
  } | null>(null);
  const [loadingGroupSummary, setLoadingGroupSummary] = useState<boolean>(false);

  // Modal Rekap & Laporan
  const [rekapOpen, setRekapOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [disalin, setDisalin] = useState<string | null>(null);
  const [disalinCode, setDisalinCode] = useState<string | null>(null);

  const activeTeacherCode =
    session?.teacherCode ||
    ((roomData?.room.pin || currentPin) === '123456' ? 'GURU-DEMO-2026' : null);

  const salinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setDisalinCode(code);
      setTimeout(() => setDisalinCode(null), 1500);
    } catch {
      /* ignore */
    }
  };

  // Auto Split State
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitting, setSplitting] = useState<boolean>(false);

  // Load Room Data
  const loadDashboard = async (pinToLoad: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSlowServer(false);

    const slowTimer = setTimeout(() => setSlowServer(true), 4000);

    try {
      const detailRes = await getRoomDetail(pinToLoad);
      clearTimeout(slowTimer);
      setSlowServer(false);

      if (!('participants' in detailRes)) {
        throw new Error('Hanya guru yang memiliki akses dashboard pemantauan kelas.');
      }

      setRoomData(detailRes);

      const roomId = detailRes.room.id;

      // Ambil progress, reports, alerts secara paralel
      const [progResult, repResult, alertResult] = await Promise.allSettled([
        fetchRoomProgress(roomId),
        fetchRoomPeerReports(roomId),
        fetchRoomAlerts(roomId),
      ]);

      if (progResult.status === 'fulfilled') {
        setProgressData(progResult.value);
      }
      if (repResult.status === 'fulfilled') {
        setReports(repResult.value);
      }
      if (alertResult.status === 'fulfilled') {
        setAlerts(alertResult.value.alerts || []);
      }
    } catch (err: any) {
      clearTimeout(slowTimer);
      setSlowServer(false);
      console.error('Gagal memuat dashboard guru:', err);
      setErrorMsg(err.message || 'Gagal memuat data kelas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPin) {
      loadDashboard(currentPin);
    } else {
      setLoading(false);
    }
  }, [currentPin]);

  // Request Analisis Keadilan AI
  const handleAnalyzeFairness = async () => {
    if (!roomData) return;
    setLoadingFairness(true);
    try {
      const res = await analyzeRoomFairness(roomData.room.id);
      setFairnessAnalysis(res);
      setRekapOpen(true);
    } catch (err: any) {
      console.error('Gagal menganalisis keadilan:', err);
      setErrorMsg(err.message || 'Gagal menjalankan analisis keadilan AI.');
    } finally {
      setLoadingFairness(false);
    }
  };

  // Inspect Group AI Summary
  const handleOpenGroupSummary = async (groupId: string, groupName: string) => {
    setSelectedGroupSummary({ groupName, summary: null });
    setLoadingGroupSummary(true);
    try {
      const summary = await fetchTeacherSummary(groupId);
      setSelectedGroupSummary({ groupName, summary });
    } catch (err: any) {
      console.error('Gagal memuat ringkasan kelompok:', err);
      setErrorMsg(err.message || 'Gagal memuat ringkasan AI untuk kelompok ini.');
    } finally {
      setLoadingGroupSummary(false);
    }
  };

  // Auto Split Groups
  const handleAutoSplit = async () => {
    if (!currentPin) return;
    setSplitting(true);
    setErrorMsg(null);
    try {
      await splitRoomGroupsAuto(currentPin, splitCount);
      setSuccessMsg(`Berhasil membagi kelompok secara adil (${splitCount} kelompok)!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadDashboard(currentPin);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membagi kelompok otomatis.');
    } finally {
      setSplitting(false);
    }
  };

  const salinPin = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setDisalin(pin);
      setTimeout(() => setDisalin(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  // Perhitungan statistik (hanya siswa, bukan guru)
  const studentParticipants = roomData?.participants?.filter((p) => p.role === 'STUDENT') || [];
  const totalSiswa = studentParticipants.length;
  const totalKelompok = roomData?.groups?.length || progressData?.groups?.length || 0;
  const totalLaporan = reports.length;

  // Rata-rata progres kelas
  const groupProgressList = progressData?.groups || [];
  const rataRataProgres =
    groupProgressList.length > 0
      ? Math.round(
          groupProgressList.reduce((acc, g) => acc + (g.progressPercent || 0), 0) /
            groupProgressList.length
        )
      : 0;

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,27,52,0.05)] border-b border-outline-variant/30">
        <div className="h-16 px-margin max-w-5xl mx-auto flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <img alt="Kelompok Adil Mascot Logo" className="h-8 w-auto object-contain" src={MASCOT_URL} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-none tracking-tight">
                  Kelompok Adil
                </span>
                <span className="font-label-sticker text-label-sticker bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded -rotate-2 leading-none">
                  Guru
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-medium leading-none mt-0.5">
                Teacher Dashboard &amp; Monitoring
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboard(currentPin)}
              title="Segarkan data kelas"
              className="p-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar akun"
              className="px-3 py-1.5 rounded-xl bg-error-container text-on-error-container font-label-md text-label-md font-bold hover:bg-error-container/80 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-20">
        <div className="flex flex-col w-full max-w-5xl mx-auto px-margin py-space-md gap-space-md">
          {/* Cold start alert */}
          {slowServer && (
            <div className="bg-secondary-container/80 border-2 border-secondary text-on-secondary-container p-3 rounded-xl flex items-center gap-2 text-body-sm animate-pulse">
              <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
              <span>Server sedang disiapkan dari mode cold start. Tunggu beberapa detik...</span>
            </div>
          )}

          {/* Error & Success Toasts */}
          {errorMsg && (
            <div className="bg-error-container border border-error text-on-error-container p-3 rounded-xl flex items-center justify-between text-body-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} className="font-bold">
                ✕
              </button>
            </div>
          )}
          {successMsg && (
            <div className="bg-tertiary-container border border-tertiary text-on-tertiary p-3 rounded-xl flex items-center justify-between text-body-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>{successMsg}</span>
              </div>
              <button type="button" onClick={() => setSuccessMsg(null)} className="font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Sapaan & Detail Kelas Aktif */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col min-w-0">
              <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 mb-1.5 rounded-full bg-secondary-container text-on-secondary-container">
                <span className="material-symbols-outlined text-[14px]">school</span>
                <span className="font-label-sticker text-label-sticker">
                  {roomData?.room.className || 'Kelas Belajar'}
                </span>
              </div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight">
                {roomData?.room.title || 'Panel Guru'}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Mata Pelajaran: <strong>{roomData?.room.subject || 'Umum'}</strong> • Status:{' '}
                <span className="font-bold uppercase text-tertiary">
                  {roomData?.room.status || 'Aktif'}
                </span>
              </p>
            </div>

            {/* PIN Card & Kode Guru Card */}
            <div className="flex flex-wrap items-center gap-2.5 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/40">
              {/* PIN KELAS */}
              <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">PIN KELAS (SISWA)</span>
                  <span className="font-mono text-title-md font-bold text-primary tracking-widest">
                    {roomData?.room.pin || currentPin}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => salinPin(roomData?.room.pin || currentPin)}
                  className="px-2 py-1 bg-surface-container text-on-surface rounded-md font-label-sticker text-label-sticker font-bold hover:bg-surface-container-high transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {disalin === (roomData?.room.pin || currentPin) ? 'check' : 'content_copy'}
                  </span>
                  <span>{disalin === (roomData?.room.pin || currentPin) ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              {/* KODE GURU (Jika ada) */}
              {activeTeacherCode && (
                <div className="flex items-center gap-2 bg-error-container/30 border border-error/40 px-3 py-1.5 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-error uppercase flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      <span>KODE GURU (SIMPAN)</span>
                    </span>
                    <span className="font-mono text-sm font-bold text-error tracking-wider">
                      {activeTeacherCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => salinCode(activeTeacherCode)}
                    className="px-2 py-1 bg-error-container text-on-error-container rounded-md font-label-sticker text-label-sticker font-bold hover:bg-error-container/80 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {disalinCode === activeTeacherCode ? 'check' : 'content_copy'}
                    </span>
                    <span>{disalinCode === activeTeacherCode ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              )}

              <div className="h-6 w-[1px] bg-outline-variant/60 mx-1 hidden sm:block" />

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={6}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN lain"
                  className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-outline-variant bg-surface"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputPin.length === 6) {
                      setCurrentPin(inputPin);
                      setInputPin('');
                    }
                  }}
                  className="px-2 py-1 bg-primary text-on-primary rounded-lg text-xs font-bold"
                >
                  Buka
                </button>
              </div>
            </div>
          </div>

          {/* Statistik Kelas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-on-surface-variant text-xs font-bold">TOTAL SISWA</span>
                <span className="material-symbols-outlined text-primary text-[18px]">person</span>
              </div>
              <span className="font-headline-md text-headline-md text-on-surface font-bold">
                {totalSiswa}
              </span>
              <span className="text-[11px] text-on-surface-variant mt-1">Terdaftar di kelas</span>
            </div>

            <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-on-surface-variant text-xs font-bold">KELOMPOK</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">diversity_3</span>
              </div>
              <span className="font-headline-md text-headline-md text-on-surface font-bold">
                {totalKelompok}
              </span>
              <span className="text-[11px] text-on-surface-variant mt-1">Kelompok aktif</span>
            </div>

            <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-on-surface-variant text-xs font-bold">PROGRES RATA-RATA</span>
                <span className="material-symbols-outlined text-tertiary text-[18px]">trending_up</span>
              </div>
              <span className="font-headline-md text-headline-md text-tertiary font-bold">
                {rataRataProgres}%
              </span>
              <span className="text-[11px] text-on-surface-variant mt-1">Penyelesaian tugas</span>
            </div>

            <div
              onClick={() => setLaporanOpen(true)}
              className="bg-error-container/30 hover:bg-error-container/50 cursor-pointer transition-colors p-3.5 rounded-xl shadow-sm border border-error/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-error font-bold text-xs">LAPORAN RAHASIA</span>
                <span className="material-symbols-outlined text-error text-[18px]">report</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md text-on-error-container font-bold">
                  {totalLaporan}
                </span>
                {totalLaporan > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-error text-on-error font-bold animate-pulse">
                    Baru
                  </span>
                )}
              </div>
              <span className="text-[11px] text-error font-medium mt-1">Klik untuk audit evaluasi</span>
            </div>
          </div>

          {/* AI Banner & Tindakan Cerdas */}
          <div className="bg-gradient-to-r from-secondary-container/40 via-surface-container-lowest to-tertiary-container/40 p-4 rounded-xl shadow-sm border-2 border-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">insights</span>
              </div>
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">
                  Audit Keadilan &amp; Telemetri Kelompok
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Deteksi ketimpangan beban kerja kelompok, potensi ghosting, dan analisis peer review secara anonim.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={loadingFairness}
              onClick={handleAnalyzeFairness}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5"
            >
              <span className={`material-symbols-outlined text-[18px] ${loadingFairness ? 'animate-spin' : ''}`}>
                {loadingFairness ? 'refresh' : 'psychology'}
              </span>
              <span>{loadingFairness ? 'Menganalisis...' : 'Analisis Keadilan AI'}</span>
            </button>
          </div>

          {/* Peringatan Keterlambatan / Ghosting dari AI */}
          {alerts.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border-l-4 border-error flex flex-col gap-2">
              <div className="flex items-center gap-2 text-error font-bold text-title-sm">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <span>Peringatan Tenggat &amp; Risiko Ghosting ({alerts.length} tugas)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {alerts.map((al, idx) => (
                  <div
                    key={`${al.taskId}-${idx}`}
                    className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col text-body-sm"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-on-surface">{al.groupName}</span>
                      <span className="text-error text-xs font-mono">
                        Terlambat {Math.round(al.hoursOverdue)} jam
                      </span>
                    </div>
                    <span className="text-on-surface-variant font-medium mt-0.5">{al.taskTitle}</span>
                    <span className="text-xs text-on-surface-variant mt-1">
                      PIC: <strong>{al.assigneeName || 'Belum ditentukan'}</strong> • Status: {al.status}
                    </span>
                    <p className="text-xs text-error mt-1 italic">{al.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pembagian Kelompok Otomatis (Jika belum ada kelompok atau ingin bagi ulang) */}
          {(!roomData?.groups || roomData.groups.length === 0) && (
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-md border-2 border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
                  <span>Belum Ada Kelompok Terbentuk</span>
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Ada {totalSiswa} siswa terdaftar di ruang lobi. Bagi siswa ke dalam kelompok secara merata dan otomatis.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant">Jumlah Kelompok:</label>
                <select
                  value={splitCount}
                  onChange={(e) => setSplitCount(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg border border-outline bg-surface font-bold text-sm"
                >
                  <option value={2}>2 Kelompok</option>
                  <option value={3}>3 Kelompok</option>
                  <option value={4}>4 Kelompok</option>
                  <option value={5}>5 Kelompok</option>
                </select>
                <button
                  type="button"
                  disabled={splitting || totalSiswa === 0}
                  onClick={handleAutoSplit}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                >
                  {splitting ? 'Membagi...' : 'Bagi Otomatis'}
                </button>
              </div>
            </div>
          )}

          {/* Monitor Progres Per Kelompok */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">monitoring</span>
                <span>Monitor Kelompok &amp; Transparansi Tugas</span>
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">
                (Guru memantau tugas murni tanpa membaca obrolan pribadi siswa)
              </span>
            </div>

            {groupProgressList.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant/50 mb-2">
                  group_off
                </span>
                <p className="font-bold">Belum ada kelompok yang terdata untuk dimonitor.</p>
                <p className="text-xs mt-1">Bagi kelompok di atas atau minta siswa bergabung ke kelas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {groupProgressList.map((grp) => {
                  const tasks = grp.statusCounts || { todo: 0, inProgress: 0, done: 0 };
                  const totalTasks = tasks.todo + tasks.inProgress + tasks.done;
                  const pct = Math.round(grp.progressPercent || 0);

                  return (
                    <div
                      key={grp.groupId}
                      className="bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant/40 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-title-md text-title-md text-on-surface font-bold">
                            {grp.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full font-label-sticker text-label-sticker font-bold bg-secondary-container text-on-secondary-container">
                            {pct}% Selesai
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden flex">
                          <div
                            className="h-full bg-tertiary transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Rincian Status Kanban */}
                        <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium pt-1">
                          <span>
                            Total: <strong>{totalTasks} tugas</strong>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-on-surface-variant">Todo: {tasks.todo}</span>
                            <span className="text-primary font-bold">Jalan: {tasks.inProgress}</span>
                            <span className="text-tertiary font-bold">Selesai: {tasks.done}</span>
                          </span>
                        </div>
                      </div>

                      {/* Anggota & Kontribusi Tugas */}
                      <div className="border-t border-outline-variant/30 pt-2 flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          Distribusi Tugas Anggota:
                        </span>
                        <div className="flex flex-col gap-1">
                          {grp.members?.map((m) => (
                            <div
                              key={m.participantId}
                              className="flex items-center justify-between text-xs bg-surface-container-low px-2 py-1 rounded"
                            >
                              <span className="font-medium text-on-surface truncate">{m.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-on-surface-variant text-[11px]">
                                  {m.taskCount} tugas
                                </span>
                                <span className="font-bold font-mono text-tertiary">
                                  {m.progressPercent !== null ? `${Math.round(m.progressPercent)}%` : '-'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tombol Ringkasan AI Kelompok */}
                      <div className="border-t border-outline-variant/30 pt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupSummary(grp.groupId, grp.name)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px] text-secondary">
                            summarize
                          </span>
                          <span>Ringkasan AI Kelompok</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Analisis Keadilan AI (Rekap Open) */}
      {rekapOpen && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRekapOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border-2 border-outline overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">psychology</span>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Analisis Keadilan Kelas
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Evaluasi laporan rahasia peer review tanpa membocorkan identitas siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRekapOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-body-sm">
              {fairnessAnalysis ? (
                <>
                  {/* Fallback source notice */}
                  {fairnessAnalysis.source === 'fallback' && (
                    <div className="p-2 rounded-lg bg-secondary-container/50 text-on-secondary-container text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>hasil otomatis, AI sedang tidak tersedia</span>
                    </div>
                  )}

                  {/* Skor Keadilan */}
                  <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-on-surface-variant">SKOR KEADILAN KELAS</span>
                      <h2 className="text-3xl font-extrabold text-primary">
                        {fairnessAnalysis.fairnessScore} / 100
                      </h2>
                    </div>
                    <div className="text-right text-xs text-on-surface-variant">
                      <span>Total Evaluasi Masuk:</span>
                      <p className="font-bold text-on-surface text-sm">
                        {fairnessAnalysis.totalReports} Laporan Rahasia
                      </p>
                    </div>
                  </div>

                  {/* Ringkasan AI */}
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-on-surface text-sm">Rangkuman Suasana Tim:</span>
                    <p className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant text-on-surface leading-relaxed">
                      {fairnessAnalysis.summary}
                    </p>
                  </div>

                  {/* Saran untuk Guru */}
                  {fairnessAnalysis.teacherAdvice && (
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-tertiary text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                        <span>Saran Fasilitasi untuk Guru:</span>
                      </span>
                      <p className="bg-tertiary-container/30 p-3 rounded-xl border border-tertiary/40 text-on-surface leading-relaxed">
                        {fairnessAnalysis.teacherAdvice}
                      </p>
                    </div>
                  )}

                  {/* Alerts */}
                  {fairnessAnalysis.alerts && fairnessAnalysis.alerts.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-error text-sm">Catatan Khusus yang Perlu Diperhatikan:</span>
                      <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant bg-error-container/20 p-3 rounded-xl border border-error/30">
                        {fairnessAnalysis.alerts.map((al, i) => (
                          <li key={i}>{al}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-secondary mb-2">
                    psychology
                  </span>
                  <p>Sedang menjalankan analisis keadilan kelas...</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button
                type="button"
                onClick={() => setRekapOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Laporan Rahasia Siswa (Audit Khusus Guru) */}
      {laporanOpen && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLaporanOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border-2 border-outline overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[24px]">lock</span>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Audit Laporan Rahasia Siswa ({reports.length})
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Hanya dapat diakses oleh Guru. Identitas pelapor dirahasiakan dari sesama siswa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLaporanOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] text-tertiary mb-2">
                    verified_user
                  </span>
                  <p className="font-bold text-on-surface">Belum ada laporan rahasia yang masuk.</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Hubungan kerja antarsiswa terindikasi kondusif.
                  </p>
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col gap-1.5 text-body-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">
                          {rep.reporterName} ➔ {rep.reportedName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                          Rating: {rep.rating}/5 ⭐
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        {new Date(rep.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="text-xs bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/40 text-on-surface leading-relaxed">
                      {renderFeedbackText(rep.feedback)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button
                type="button"
                onClick={() => setLaporanOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ringkasan AI Kelompok Tertentu */}
      {selectedGroupSummary && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedGroupSummary(null)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border-2 border-outline overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant">
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Ringkasan AI: {selectedGroupSummary.groupName}
                </h4>
                <p className="text-xs text-on-surface-variant">Dihasilkan murni dari data tugas Kanban</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroupSummary(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-body-sm">
              {loadingGroupSummary ? (
                <div className="py-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] animate-spin text-primary mb-2">
                    sync
                  </span>
                  <p>Memuat telemetri ringkasan tugas kelompok...</p>
                </div>
              ) : selectedGroupSummary.summary ? (
                <>
                  {selectedGroupSummary.summary.source === 'fallback' && (
                    <div className="p-2 rounded-lg bg-secondary-container/50 text-on-secondary-container text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>hasil otomatis, AI sedang tidak tersedia</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-on-surface-variant uppercase">
                      Ringkasan Aktivitas:
                    </span>
                    <p className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface leading-relaxed text-xs">
                      {selectedGroupSummary.summary.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-surface-container-low p-2 rounded-lg">
                      <span className="text-on-surface-variant block">Total</span>
                      <strong className="text-sm">{selectedGroupSummary.summary.totalTasks}</strong>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg">
                      <span className="text-tertiary block">Selesai</span>
                      <strong className="text-sm text-tertiary">
                        {selectedGroupSummary.summary.completedTasks}
                      </strong>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg">
                      <span className="text-primary block">Tunda</span>
                      <strong className="text-sm text-primary">
                        {selectedGroupSummary.summary.pendingTasks}
                      </strong>
                    </div>
                  </div>

                  {selectedGroupSummary.summary.highlights &&
                    selectedGroupSummary.summary.highlights.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-on-surface-variant uppercase">
                          Sorotan Utama:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-xs text-on-surface bg-surface-container-low p-2.5 rounded-lg border border-outline-variant">
                          {selectedGroupSummary.summary.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </>
              ) : (
                <p className="text-center text-on-surface-variant py-4">Data tidak tersedia.</p>
              )}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGroupSummary(null)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
