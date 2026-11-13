import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  joinAsStudent,
  loginAsTeacher,
  createRoom,
  registerTeacher,
  saveSession,
  getSession,
  clearSession,
} from '../lib/api';

import mascotSvg from '../assets/mascot.svg';

const MASCOT_URL = mascotSvg;

export function HomePage() {
  const navigate = useNavigate();

  // Mode Murid
  const [studentPin, setStudentPin] = useState('');
  const [studentName, setStudentName] = useState('');

  // Mode Guru - Tab (Masuk vs Buat)
  const [teacherTab, setTeacherTab] = useState<'LOGIN' | 'CREATE'>('LOGIN');
  const [teacherPin, setTeacherPin] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');

  // Form Buat Kelas
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newTargetGroups, setNewTargetGroups] = useState(4);

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sesi aktif jika ada
  const [activeSession, setActiveSession] = useState(getSession());

  useEffect(() => {
    setActiveSession(getSession());
  }, []);

  const handleStudentJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanPin = studentPin.trim().toUpperCase();
    const cleanName = studentName.trim();

    if (cleanPin.length !== 6) {
      setErrorMessage('PIN harus 6 digit.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Silakan isi nama lengkapmu.');
      return;
    }

    setLoading(true);
    setIsSlow(false);
    const slowTimer = setTimeout(() => setIsSlow(true), 2500);

    try {
      const res = await joinAsStudent(cleanPin, cleanName);
      clearTimeout(slowTimer);
      setIsSlow(false);
      saveSession({
        token: res.token,
        role: 'STUDENT',
        participant: res.participant,
        pin: cleanPin,
      });
      navigate(`/workspace/${cleanPin}`);
    } catch (err: any) {
      clearTimeout(slowTimer);
      setIsSlow(false);
      setErrorMessage(err?.message || 'Gagal masuk ke kelas.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanPin = teacherPin.trim().toUpperCase();
    const cleanName = teacherName.trim();
    const cleanCode = teacherCode.trim();

    if (cleanPin.length !== 6) {
      setErrorMessage('PIN kelas harus 6 digit.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Silakan isi nama pengajar/guru.');
      return;
    }
    if (!cleanCode) {
      setErrorMessage('Silakan masukkan Kode Guru.');
      return;
    }

    setLoading(true);
    setIsSlow(false);
    const slowTimer = setTimeout(() => setIsSlow(true), 2500);

    try {
      const res = await loginAsTeacher(cleanPin, cleanName, cleanCode);
      clearTimeout(slowTimer);
      setIsSlow(false);
      saveSession({
        token: res.token,
        role: 'TEACHER',
        participant: res.participant,
        pin: cleanPin,
        teacherCode: cleanCode,
      });
      navigate(`/guru/${cleanPin}`);
    } catch (err: any) {
      clearTimeout(slowTimer);
      setIsSlow(false);
      setErrorMessage(err?.message || 'Gagal login guru. Periksa kembali PIN dan Kode Guru.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanTitle = newTitle.trim();
    const cleanTeacherName = teacherName.trim() || 'Guru Pengampu';

    if (cleanTitle.length < 3) {
      setErrorMessage('Judul tugas minimal 3 karakter.');
      return;
    }

    setLoading(true);
    setIsSlow(false);
    const slowTimer = setTimeout(() => setIsSlow(true), 2500);

    try {
      // 1. Pastikan punya token akun guru via registerTeacher
      const reg = await registerTeacher(cleanTeacherName);
      // Simpan token sementara di session agar createRoom mengirim Bearer
      saveSession({
        token: reg.token,
        role: 'TEACHER',
        participant: {
          id: reg.user.id,
          roomId: '',
          name: reg.user.name,
          role: 'TEACHER',
        },
      });

      // 2. Buat room
      const res = await createRoom({
        title: cleanTitle,
        subject: newSubject.trim() || undefined,
        className: newClassName.trim() || undefined,
        targetGroups: Number(newTargetGroups) || 4,
      });

      // 3. Login otomatis sebagai RoomParticipant guru di room baru
      const loginRes = await loginAsTeacher(res.pin, cleanTeacherName, res.teacherCode);
      clearTimeout(slowTimer);
      setIsSlow(false);

      saveSession({
        token: loginRes.token,
        role: 'TEACHER',
        participant: loginRes.participant,
        pin: res.pin,
        teacherCode: res.teacherCode,
        isCreator: true,
      });

      navigate(`/guru/${res.pin}`);
    } catch (err: any) {
      clearTimeout(slowTimer);
      setIsSlow(false);
      setErrorMessage(err?.message || 'Gagal membuat kelas baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col relative w-full bg-surface min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
      <div className="flex flex-col w-full max-w-md md:max-w-5xl mx-auto px-4 md:px-6 pb-12 pt-4 md:pt-8 select-none">
        {/* Banner Sesi Aktif */}
        {activeSession && (
          <div className="mb-4 p-3 rounded-xl bg-surface-container-high border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span>Sesi aktif: </span>
              <strong>{activeSession.participant.name}</strong> ({activeSession.role === 'TEACHER' ? 'Guru' : 'Siswa'})
              {activeSession.pin && <span className="ml-2 font-mono bg-surface px-2 py-0.5 rounded border border-[#0f1b34]">PIN: {activeSession.pin}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    activeSession.role === 'TEACHER'
                      ? `/guru/${activeSession.pin || ''}`
                      : `/workspace/${activeSession.pin || ''}`
                  )
                }
                className="px-3 py-1 bg-tertiary text-on-tertiary rounded-lg font-bold shadow-[2px_2px_0px_#0f1b34] text-xs hover:-translate-y-0.5 transition-transform"
              >
                Lanjutkan
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setActiveSession(null);
                }}
                className="px-3 py-1 bg-surface-container-lowest text-on-surface rounded-lg font-bold shadow-[2px_2px_0px_#0f1b34] text-xs hover:-translate-y-0.5 transition-transform"
              >
                Keluar
              </button>
            </div>
          </div>
        )}

        {/* Cold Start Banner */}
        {isSlow && (
          <div className="mb-4 p-3 rounded-xl bg-secondary-container text-on-secondary-fixed border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] text-sm flex items-center gap-2 animate-pulse">
            <span className="text-xl">⏳</span>
            <span>Server sedang disiapkan, tunggu sebentar (cold start server)...</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-900 border-2 border-red-700 shadow-[3px_3px_0px_#b91c1c] text-sm flex items-center justify-between gap-2">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="font-bold px-2 py-0.5 rounded hover:bg-red-200"
            >
              ×
            </button>
          </div>
        )}

        {/* Sticker atas */}
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-fixed shadow-[3px_3px_0px_#0f1b34] -rotate-2 hover:rotate-0 transition-transform">
            <span className="text-[16px]">✨</span>
            <span className="font-label-sticker text-label-sticker tracking-wide">
              Belajar kelompok adil, bebas beban numpang nama!
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-6 md:mb-8 relative">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-surface-container-lowest shadow-[4px_4px_0px_#0f1b34] p-1 flex items-center justify-center rotate-2">
              <img
                alt="Kelompok Adil Mascot Logo"
                className="w-full h-full object-contain rounded-xl"
                src={MASCOT_URL}
              />
            </div>
            <div className="absolute -bottom-2 -right-3 px-2 py-0.5 rounded-lg bg-tertiary text-on-tertiary font-label-md text-xs shadow-[2px_2px_0px_#0f1b34] -rotate-6">
              v2.0 Asik!
            </div>
          </div>

          <h1 className="font-display-hero-mobile text-3xl md:text-5xl font-extrabold text-on-surface leading-tight tracking-tight max-w-xs md:max-w-2xl">
            Kerja kelompok, <span className="text-primary underline decoration-[#f26b3a] decoration-4">nilai adil.</span>
          </h1>

          <p className="font-body-md text-body-md md:text-body-lg text-on-surface-variant max-w-xs md:max-w-xl mt-3">
            Bagi kelompok berimbang otomatis, pantau progres transparan, dan dapatkan pendampingan AI Fasilitator cerdas.
          </p>
        </div>

        {/* Dua Kartu Peran */}
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto mb-6 md:max-w-4xl md:grid md:grid-cols-2">
          {/* KARTU GURU */}
          <div className="relative rounded-2xl bg-primary-container p-5 text-on-secondary shadow-[5px_5px_0px_#0f1b34] flex flex-col border-2 border-[#0f1b34]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍🏫</span>
                <h2 className="font-headline-md text-xl md:text-2xl font-bold text-surface-container-lowest tracking-tight">
                  Area Pengajar / Guru
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-primary font-bold text-xs shadow-[2px_2px_0px_#0f1b34] rotate-3">
                Ruang Guru
              </span>
            </div>

            {/* Tab Guru: Masuk vs Buat */}
            <div className="flex gap-2 mb-4 bg-primary p-1 rounded-xl border border-[#0f1b34]">
              <button
                type="button"
                onClick={() => {
                  setTeacherTab('LOGIN');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teacherTab === 'LOGIN'
                    ? 'bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#0f1b34]'
                    : 'text-primary-fixed hover:text-white'
                }`}
              >
                Masuk Kelas Ada
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherTab('CREATE');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teacherTab === 'CREATE'
                    ? 'bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#0f1b34]'
                    : 'text-primary-fixed hover:text-white'
                }`}
              >
                Buat Kelas Baru
              </button>
            </div>

            {teacherTab === 'LOGIN' ? (
              <form onSubmit={handleTeacherLogin} className="flex flex-col gap-2.5 mt-auto">
                <div>
                  <label className="text-xs font-bold text-primary-fixed block mb-1">Nama Guru / Pengajar</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Contoh: Ibu Ratna, M.Pd."
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-primary-fixed block mb-1">6 Digit PIN</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={teacherPin}
                      onChange={(e) => setTeacherPin(e.target.value.toUpperCase())}
                      placeholder="123456"
                      className="w-full uppercase font-mono tracking-widest text-center px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-primary-fixed block mb-1">Kode Guru</label>
                    <input
                      type="text"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value)}
                      placeholder="GURU-DEMO-2026"
                      className="w-full font-mono text-center px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-surface-container-lowest text-on-surface font-bold text-sm flex items-center justify-center gap-2 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  <span>{loading ? 'Menghubungkan...' : 'Masuk Dashboard Guru'}</span>
                  <span>➔</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-2.5 mt-auto">
                <div>
                  <label className="text-xs font-bold text-primary-fixed block mb-1">Nama Guru</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Nama Pengajar"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-primary-fixed block mb-1">Judul Tugas / Proyek</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Proyek Penelitian Ekosistem"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-primary-fixed block mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Biologi"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-primary-fixed block mb-1">Kelas</label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="XI MIPA 1"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-primary-fixed block mb-1">Target Jumlah Kelompok</label>
                  <select
                    value={newTargetGroups}
                    onChange={(e) => setNewTargetGroups(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                  >
                    {[2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Kelompok
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-surface-container-lowest text-on-surface font-bold text-sm flex items-center justify-center gap-2 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  <span>{loading ? 'Membuat Kelas...' : 'Buat Kelas & Terbitkan PIN'}</span>
                  <span>➔</span>
                </button>
              </form>
            )}
          </div>

          {/* KARTU MURID */}
          <div className="relative rounded-2xl bg-secondary-container p-5 text-on-secondary-fixed shadow-[5px_5px_0px_#0f1b34] flex flex-col border-2 border-[#0f1b34]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎒</span>
                <h2 className="font-headline-md text-xl md:text-2xl font-bold text-on-secondary-fixed tracking-tight">
                  Aku Murid / Siswa
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-on-tertiary font-bold text-xs shadow-[2px_2px_0px_#0f1b34] -rotate-2">
                Masuk Tim
              </span>
            </div>
            <p className="font-body-md text-sm text-on-secondary-fixed-variant mb-4 leading-snug">
              Masukkan PIN 6 digit dari gurumu dan namamu. Langsung gabung tanpa ribet buat akun!
            </p>

            <form onSubmit={handleStudentJoin} className="flex flex-col gap-2.5 mt-auto">
              <div>
                <label className="text-xs font-bold text-on-secondary-fixed block mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Dafano"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-secondary-fixed block mb-1">6 Digit PIN Kelas</label>
                <input
                  type="text"
                  maxLength={6}
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value.toUpperCase())}
                  placeholder="123456"
                  className="w-full uppercase font-mono tracking-widest text-center px-3 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface text-sm border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 px-4 rounded-xl bg-on-surface text-surface font-bold text-sm flex items-center justify-center gap-2 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#f26b3a] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50"
              >
                <span>{loading ? 'Memeriksa PIN...' : 'Gabung Ruang Kerja'}</span>
                <span>➔</span>
              </button>
            </form>

            <div className="mt-4 p-2.5 rounded-xl bg-surface-container-lowest/80 border border-[#0f1b34] text-xs">
              <span className="font-bold">Tips Demo Cepat:</span> Pakai PIN <code className="font-mono font-bold bg-secondary-container px-1 rounded">123456</code> untuk mencoba kelas demo bawaan.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
