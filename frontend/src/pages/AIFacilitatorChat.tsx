import { useState, type FormEvent } from "react";
import {
  chatWithAi,
  requestRoleSplit,
  applySuggestion,
  dismissSuggestion,
  type RoleSplitSuggestion,
} from "../lib/api";

interface Props {
  groupId?: string;
  onTasksUpdated?: () => void;
}

type Message = {
  id: number;
  sender: "student" | "ai";
  text: string;
  source?: "gemini" | "fallback";
};

export default function AIFacilitatorChat({ groupId, onTasksUpdated }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Halo! Aku AI Fasilitator kelompokmu. Mau brainstorming ide sudut pandang tugas atau pembagian peran adil?",
      source: "gemini",
    },
  ]);

  const [activeSuggestion, setActiveSuggestion] = useState<RoleSplitSuggestion | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !groupId) return;

    setErrorMsg(null);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "student", text },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await chatWithAi(groupId, text);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: res.reply,
          source: res.source,
        },
      ]);
    } catch (err: any) {
      const is503 = err?.status === 503;
      const is429 = err?.status === 429;
      const friendly = is503
        ? "Layanan AI sedang menyiapkan koneksi (cold start). Silakan kirim ulang pertanyaanmu sebentar lagi."
        : is429
        ? "AI sedang menerima banyak pertanyaan. Mohon tunggu beberapa detik."
        : err?.message || "Gagal menghubungi AI Fasilitator.";

      setErrorMsg(friendly);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: `⚠️ ${friendly}`,
          source: "fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMintaBagiPeran() {
    if (!groupId) return;
    setSplitLoading(true);
    setErrorMsg(null);

    try {
      const res = await requestRoleSplit(groupId);
      setActiveSuggestion(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal meminta usulan pembagian peran AI.");
    } finally {
      setSplitLoading(false);
    }
  }

  async function handleTerapkanPeran(id: string) {
    setErrorMsg(null);
    try {
      await applySuggestion(id);
      setActiveSuggestion(null);
      onTasksUpdated?.();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          text: "✅ Usulan pembagian peran telah berhasil diterapkan ke papan Kanban tugas kelompokmu!",
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menerapkan pembagian peran.");
    }
  }

  async function handleTolakPeran(id: string) {
    try {
      await dismissSuggestion(id);
      setActiveSuggestion(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal membatalkan usulan peran.");
    }
  }

  return (
    <div className="flex flex-col h-[580px] bg-white rounded-2xl border-2 border-[#0f1b34] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-2 border-[#0f1b34] bg-secondary-container/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center font-bold text-lg border border-[#0f1b34]">
            ✦
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-900 leading-tight">AI Fasilitator Kelompok</h2>
            <p className="text-[11px] text-gray-600">Didukung Google Gemini &amp; Panduan Gotong Royong</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMintaBagiPeran}
          disabled={splitLoading || !groupId}
          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs border border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-50 flex items-center gap-1"
        >
          <span>⚖️</span>
          <span>{splitLoading ? "Menganalisis..." : "Usul Bagi Peran Adil"}</span>
        </button>
      </div>

      {/* Usulan Pembagian Peran Card */}
      {activeSuggestion && (
        <div className="p-3 bg-secondary-container/40 border-b-2 border-[#0f1b34] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-on-secondary-fixed flex items-center gap-1">
              <span>🎯</span> Usulan Pembagian Peran Adil (Total 100%)
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#0f1b34]">
              {activeSuggestion.roles?.length || 0} Peran
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
            {activeSuggestion.roles?.map((r, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-white border border-[#0f1b34] text-xs">
                <div className="flex justify-between font-bold">
                  <span>{r.title}</span>
                  <span className="text-primary">{r.targetPercent}%</span>
                </div>
                <p className="text-[11px] text-gray-600">{r.description}</p>
                <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                  <span>PIC: <strong>{r.suggestedMemberName}</strong></span>
                  <span>Bukti: {r.deliverableFormat}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleTolakPeran(activeSuggestion.id)}
              className="px-3 py-1 rounded-lg bg-white text-xs font-bold border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34]"
            >
              Tolak
            </button>
            <button
              type="button"
              onClick={() => handleTerapkanPeran(activeSuggestion.id)}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold border border-[#0f1b34] shadow-[1px_1px_0px_#0f1b34]"
            >
              Terapkan ke Kanban ➔
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-surface">
        {messages.map((m) => {
          const isStudent = m.sender === "student";
          return (
            <div key={m.id} className={`flex flex-col ${isStudent ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-gray-500">
                  {isStudent ? "Kamu" : "✦ AI Fasilitator"}
                </span>
                {m.source === "fallback" && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    hasil otomatis, AI sedang tidak tersedia
                  </span>
                )}
              </div>
              <div
                className={`p-3 rounded-2xl border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] text-xs max-w-sm md:max-w-md whitespace-pre-wrap leading-relaxed ${
                  isStudent ? "bg-primary-container text-on-primary" : "bg-white text-gray-900"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 italic">
            <span className="animate-spin">✦</span> AI sedang merumuskan ide...
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-2 bg-red-50 text-red-700 text-xs border-t border-red-200 flex justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t-2 border-[#0f1b34] flex gap-2 bg-gray-50">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={groupId ? "Tanya sudut pandang materi atau ide tugas..." : "Pilih kelompok terlebih dahulu..."}
          disabled={loading || !groupId}
          className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-[#0f1b34] text-xs focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim() || !groupId}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs border-2 border-[#0f1b34] shadow-[2px_2px_0px_#0f1b34] disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
