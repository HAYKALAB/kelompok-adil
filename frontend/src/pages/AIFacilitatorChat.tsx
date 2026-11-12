import { useState, type FormEvent } from "react";

type Message = {
  id: number;
  sender: "student" | "ai";
  text: string;
};

export default function AIFacilitatorChat() {
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Halo! Aku AI Fasilitator. Ada materi atau tugas yang ingin kamu diskusikan?",
    },
  ]);

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = question.trim();
    if (!text) return;

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        sender: "student",
        text,
      },
      {
        id: Date.now() + 1,
        sender: "ai",
        text: "Terima kasih atas pertanyaanmu! Ini masih balasan demo. Nantinya aku akan terhubung dengan AI Gemini melalui backend.",
      },
    ]);

    setQuestion("");
  }

  return (
    <div className="flex flex-col h-[560px] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-2xl">
          ✦
        </div>

        <div>
          <h2 className="font-bold text-gray-800">AI Fasilitator</h2>
          <p className="text-xs text-gray-500">
            Teman diskusi dan belajar kelompok
          </p>
        </div>

        <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
          Mode demo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.sender === "student"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            {message.sender === "ai" && (
              <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
                ✦
              </div>
            )}

            <div className="max-w-[80%]">
              <p className="text-xs text-gray-500 mb-1">
                {message.sender === "ai" ? "AI Fasilitator" : "Kamu"}
              </p>

              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  message.sender === "student"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-white border text-gray-700 rounded-bl-sm"
                }`}
              >
                {message.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t bg-white flex gap-3"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Tulis pertanyaan atau materi yang ingin didiskusikan..."
          className="flex-1 min-w-0 border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />

        <button
          type="submit"
          disabled={!question.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-5 rounded-xl"
        >
          Kirim
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 pb-3">
        Jawaban masih berupa demo dan belum terhubung ke Gemini.
      </p>
    </div>
  );
}