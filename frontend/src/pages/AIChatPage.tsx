import { useState } from "react";
import "./AIChatPage.css";

type Message = {
  id: number;
  sender: "student" | "ai";
  text: string;
};

export default function AIChatPage() {
  const [subject, setSubject] = useState("Matematika");
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Halo! Aku AI Tutor, teman belajarmu. Ada materi pelajaran yang ingin kamu pahami hari ini?",
    },
  ]);

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    const studentMessage: Message = {
      id: Date.now(),
      sender: "student",
      text: trimmedQuestion,
    };

    const demoReply: Message = {
      id: Date.now() + 1,
      sender: "ai",
      text: "Terima kasih atas pertanyaanmu! Ini masih tampilan demo. Setelah backend AI terhubung, aku akan bisa memberikan penjelasan materi secara langsung.",
    };

    setMessages((previous) => [
      ...previous,
      studentMessage,
      demoReply,
    ]);

    setQuestion("");
  }

  return (
    <main className="ai-page">
      <section className="chat-container">
        <header className="chat-header">
          <div className="ai-avatar">💡</div>

          <div className="chat-heading">
            <h1>AI Tutor</h1>
            <p>Teman belajar pintar kamu</p>
          </div>

          <span className="online-status">
            <span className="status-dot"></span>
            Demo
          </span>
        </header>

        <div className="demo-notice">
          Mode demo — jawaban AI belum terhubung ke backend.
        </div>

        <div className="chat-toolbar">
          <label htmlFor="subject">Mata pelajaran</label>

          <select
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option>Matematika</option>
            <option>Fisika</option>
            <option>Kimia</option>
            <option>Bahasa Indonesia</option>
            <option>Bahasa Inggris</option>
          </select>
        </div>

        <div className="chat-messages">
          <div className="date-divider">
            <span>Mulai percakapan</span>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${message.sender}`}
            >
              {message.sender === "ai" && (
                <div className="message-avatar">💡</div>
              )}

              <div className="message-content">
                <span className="sender-name">
                  {message.sender === "ai" ? "AI Tutor" : "Kamu"}
                </span>

                <div className="message-bubble">
                  {message.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="suggested-questions">
          <span>Coba tanyakan:</span>
          <button
            type="button"
            onClick={() =>
              setQuestion("Jelaskan materi dasar " + subject)
            }
          >
            Jelaskan materi dasar
          </button>
          <button
            type="button"
            onClick={() =>
              setQuestion("Berikan contoh soal " + subject)
            }
          >
            Contoh soal
          </button>
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Tulis pertanyaanmu di sini..."
            aria-label="Tulis pertanyaan"
          />

          <button
            type="submit"
            className="send-button"
            disabled={!question.trim()}
            aria-label="Kirim pesan"
          >
            ➤
          </button>
        </form>

        <p className="chat-footer">
          AI Tutor dapat membuat kesalahan. Tetap periksa informasi penting.
        </p>
      </section>
    </main>
  );
}