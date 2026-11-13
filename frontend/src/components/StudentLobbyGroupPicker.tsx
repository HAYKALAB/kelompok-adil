import { useState, useEffect } from 'react';
import {
  fetchRoomLobby,
  lockStudentGroup,
  joinStudentGroup,
  type RoomLobbyData,
} from '../lib/api';

interface StudentLobbyGroupPickerProps {
  pin: string;
  onGroupJoined: () => void;
}

const EMOJIS = ['🏆', '🚀', '⚡', '🦁', '🛡️', '✨'];
const AVATAR_COLORS = [
  'bg-amber-200 text-amber-900',
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-rose-200 text-rose-900',
  'bg-purple-200 text-purple-900',
];

export function StudentLobbyGroupPicker({ pin, onGroupJoined }: StudentLobbyGroupPickerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lobbyData, setLobbyData] = useState<RoomLobbyData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Pembentukan Kelompok
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🏆');
  const [groupName, setGroupName] = useState<string>('Kelompok Juara');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const loadLobby = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchRoomLobby(pin);
      setLobbyData(data);
      // Jika caller ternyata sudah punya kelompok (misal dibagikan oleh guru saat sedang buka lobi)
      if (data.caller.groupId) {
        onGroupJoined();
      }
    } catch (err: any) {
      console.error('Gagal memuat lobi kelas:', err);
      if (isInitial) {
        setErrorMsg(err?.message || 'Gagal memuat data lobi kelas.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadLobby(true);
    const interval = setInterval(() => loadLobby(false), 4000); // Polling otomatis tiap 4 detik
    return () => clearInterval(interval);
  }, [pin]);

  const toggleStudent = (studentId: string) => {
    setErrorMsg(null);
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    } else {
      // Maksimal 4 orang dalam tim (Caller + 3 orang lain)
      if (selectedStudentIds.length >= 3) {
        setErrorMsg('Maksimal 4 anggota per kelompok (termasuk kamu).');
        return;
      }
      setSelectedStudentIds((prev) => [...prev, studentId]);
    }
  };

  const handleLockGroup = async () => {
    if (!groupName.trim()) {
      setErrorMsg('Nama tim kelompok wajib diisi.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const fullGroupName = `${selectedEmoji} ${groupName.trim()}`;
      await lockStudentGroup(pin, {
        groupName: fullGroupName,
        memberIds: selectedStudentIds,
      });
      onGroupJoined();
    } catch (err: any) {
      console.error('Gagal mengunci kelompok:', err);
      setErrorMsg(err?.message || 'Gagal membentuk kelompok.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinExisting = async (groupId: string) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await joinStudentGroup(groupId);
      onGroupJoined();
    } catch (err: any) {
      console.error('Gagal gabung kelompok:', err);
      setErrorMsg(err?.message || 'Gagal bergabung ke kelompok ini.');
    } finally {
      setSubmitting(false);
    }
  };

  const students = lobbyData?.students || [];
  const caller = lobbyData?.caller;
  const existingGroups = lobbyData?.groups || [];

  // Hitung jumlah anggota tim yang sedang dibentuk
  const totalSelectedCount = 1 + selectedStudentIds.length;

  if (loading && !lobbyData) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] my-6">
        <span className="material-symbols-outlined text-[36px] animate-spin text-primary mb-2">
          hourglass_top
        </span>
        <p className="font-bold text-sm">Menghubungkan ke Lobi Kelas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
      {/* Top Title & Context Card */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-[#0f1b34] shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
            </span>
            <span className="text-xs font-bold text-on-surface">
              {students.length} siswa sudah masuk lobi
            </span>
          </div>
          <span className="font-label-sticker text-label-sticker bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-lg border border-[#0f1b34] -rotate-2">
            ✦ Lobi Pemilihan Kelompok
          </span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
            Lobi Kelas: {lobbyData?.room.title || 'Turnamen Kolaborasi'}
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Bentuk timmu sendiri dengan memilih anggota di lobi, atau bergabung langsung ke kelompok yang sudah ada!
          </p>
        </div>
      </section>

      {/* Mascot Encouragement Note Card */}
      <div className="bg-secondary-container/20 rounded-2xl p-4 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 border border-[#0f1b34] text-lg font-bold">
          💡
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded border border-[#0f1b34]">
              Tips Adil
            </span>
            <span className="text-xs font-bold text-on-surface">Bagi Peran Seimbang!</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ajak teman yang aktif berdiskusi dan pastikan semua anggota sepakat sebelum tim dikunci.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadLobby(true)}
          title="Segarkan daftar siswa"
          className="p-2 rounded-xl bg-surface-container-lowest border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34] hover:bg-surface-container active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      {/* Error Toast */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-100 text-red-900 border-2 border-red-700 shadow-[3px_3px_0px_#b91c1c] text-xs flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold px-2">
            ×
          </button>
        </div>
      )}

      {/* Kelompok yang Sudah Ada di Kelas (Jika ada) */}
      {existingGroups.length > 0 && (
        <div className="flex flex-col gap-2.5 bg-surface-container-lowest p-4 rounded-2xl border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34]">
          <span className="font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span>👥</span> Kelompok yang Sudah Dibentuk ({existingGroups.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {existingGroups.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-xl bg-surface-container-low border border-[#0f1b34] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-on-surface truncate">{g.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-[#0f1b34]">
                      {g.memberCount} Anggota
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1 line-clamp-1">
                    {g.members?.map((m) => m.name).join(', ') || 'Belum ada anggota'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleJoinExisting(g.id)}
                  className="w-full py-1.5 rounded-lg bg-primary-container text-on-primary font-bold text-xs border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34] hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
                >
                  Gabung Kelompok Ini ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Selection List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-on-surface">Daftar Siswa di Lobi</h2>
          <span className="text-xs bg-primary-container text-on-primary px-2.5 py-0.5 rounded-full font-bold border border-[#0f1b34]">
            {totalSelectedCount}/4 Terisi
          </span>
        </div>
        <span className="text-xs text-on-surface-variant font-medium">Kapasitas: Maksimal 4 Siswa</span>
      </div>

      {/* Student Roster List */}
      <div className="flex flex-col gap-2.5">
        {/* Row 1: Current User (Leader / Kamu) */}
        <div className="bg-surface-container-lowest rounded-xl p-3.5 border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 border border-[#0f1b34]">
              ✓
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm border border-[#0f1b34] shrink-0">
              {caller?.name?.slice(0, 2).toUpperCase() || 'KM'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-on-surface truncate">{caller?.name}</span>
                <span className="text-xs font-bold text-primary">(Kamu)</span>
              </div>
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield_person</span> Ketua Tim
              </span>
            </div>
          </div>
          <span className="text-xs font-bold bg-secondary-container px-2.5 py-1 rounded-lg border border-[#0f1b34] -rotate-1 shrink-0">
            Terkunci
          </span>
        </div>

        {/* Row Lain: Siswa-Siswa di Lobi */}
        {students
          .filter((s) => s.id !== caller?.id)
          .map((s, idx) => {
            const isAlreadyInGroup = s.inGroup;
            const isSelected = selectedStudentIds.includes(s.id);
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            if (isAlreadyInGroup) {
              return (
                <div
                  key={s.id}
                  className="bg-surface-container-low/70 rounded-xl p-3 border border-outline-variant/50 flex items-center justify-between gap-3 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 text-xs font-bold">
                      ✕
                    </div>
                    <div className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-xs shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface-variant line-through truncate">
                        {s.name}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">Sudah bergabung</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-surface-container px-2 py-0.5 rounded border border-outline-variant/60 shrink-0 truncate max-w-[150px]">
                    {s.groupName || 'Di kelompok lain'}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                onClick={() => toggleStudent(s.id)}
                className={`rounded-xl p-3.5 border-2 border-[#0f1b34] transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                  isSelected
                    ? 'bg-secondary-container/30 shadow-[3px_3px_0px_#0f1b34] -translate-y-0.5'
                    : 'bg-surface-container-lowest shadow-[2px_2px_0px_#0f1b34] hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-[#0f1b34] font-bold text-xs transition-colors ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-surface text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border border-[#0f1b34] shrink-0 ${avatarColor}`}
                  >
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-on-surface truncate">{s.name}</span>
                    <span className="text-[11px] text-emerald-700 font-medium">Tersedia • Belum ada tim</span>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border border-[#0f1b34] shrink-0 ${
                    isSelected ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {isSelected ? 'Terpilih' : '+ Pilih'}
                </span>
              </div>
            );
          })}

        {students.filter((s) => s.id !== caller?.id).length === 0 && (
          <div className="p-6 text-center bg-surface-container-lowest rounded-xl border border-dashed border-[#0f1b34] text-xs text-on-surface-variant">
            Belum ada teman sekelas lain yang masuk ke lobi. Kamu bisa mengunci tim sekarang atau tunggu temanmu masuk!
          </div>
        )}
      </div>

      {/* Bottom Panel: Group Customization & Confirmation */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 border-2 border-[#0f1b34] shadow-[4px_4px_0px_#0f1b34] flex flex-col gap-4 relative overflow-hidden">
        <div className="h-2 bg-primary absolute top-0 inset-x-0" />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedEmoji}</span>
            <h2 className="text-lg font-bold text-on-surface">Konfirmasi Kelompok Kamu</h2>
          </div>
          <span className="text-xs px-2.5 py-1 bg-secondary-container text-on-secondary-container rounded-full font-bold border border-[#0f1b34]">
            {totalSelectedCount}/4 Anggota
          </span>
        </div>

        {/* Group Name Input Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
            <span>Nama Tim Kelompok</span>
            <span className="material-symbols-outlined text-[15px] text-primary">edit</span>
          </label>
          <input
            type="text"
            maxLength={30}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Tulis nama kelompok kerenmu..."
            className="w-full bg-surface-container-low rounded-xl px-4 py-2.5 font-bold text-sm text-on-surface border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] focus:outline-none"
          />
        </div>

        {/* Emoji Badge Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-on-surface-variant">Pilih Ikon Tim:</span>
          <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-[#0f1b34]">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                  selectedEmoji === emoji
                    ? 'bg-surface-container-lowest border border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] scale-105'
                    : 'hover:bg-surface-container/50 opacity-70 hover:opacity-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Members Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-on-surface-variant font-bold">Anggota Tim Terdaftar:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-container text-on-primary rounded-lg text-xs font-bold border border-[#0f1b34]">
              ★ {caller?.name} (Ketua)
            </span>
            {selectedStudentIds.map((id) => {
              const student = students.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg text-xs font-bold border border-[#0f1b34]"
                >
                  ✓ {student?.name || id}
                </span>
              );
            })}
          </div>
        </div>

        {/* Big Action Button */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={submitting || !groupName.trim()}
            onClick={handleLockGroup}
            className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary font-bold text-base border-2 border-[#0f1b34] shadow-[3px_3px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Mengunci Kelompok...' : 'Kunci Kelompok & Mulai Kerja'}</span>
            <span className="text-xl">🚀</span>
          </button>
          <p className="text-[11px] text-on-surface-variant text-center flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-emerald-700">verified_user</span>
            <span>Setelah dikunci, kamu langsung mendapatkan Papan Kanban &amp; AI Asisten Pembagi Tugas.</span>
          </p>
        </div>
      </section>
    </div>
  );
}
