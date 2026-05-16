import React, { useState, useRef, useEffect } from "react";
import { http } from "../lib/api";
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from "lucide-react";

const WELCOME = "Hallelujah! I'm the CPM Assistant — your guide to CelestialPeopleMeet and the Celestial Church of Christ. How can I help you today?";

function HymnBlock({ text }) {
  const [header, ...lyricBlocks] = text.split("\n\n");
  const headerLines = header.split("\n");
  const title = headerLines[0];
  const meta = headerLines.slice(1);
  const lyrics = lyricBlocks.join("\n\n");
  return (
    <div className="space-y-2.5">
      <div>
        <div className="font-semibold text-[var(--brand-primary)] text-sm leading-snug">{title}</div>
        {meta.map((l, i) => (
          <div key={i} className="text-xs text-[var(--text-tertiary)] leading-snug mt-0.5">{l}</div>
        ))}
      </div>
      {lyrics && (
        <div className="border-l-2 border-[var(--brand-accent)] pl-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-normal">
          {lyrics}
        </div>
      )}
    </div>
  );
}

function BotMessage({ text }) {
  const isHymn = text.startsWith("\u2726");
  return (
    <div className="flex items-start gap-2.5 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center shrink-0 mt-0.5">
        <Bot size={14} />
      </div>
      <div className="bg-white border border-[var(--border-default)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-[var(--text-primary)] leading-relaxed shadow-sm">
        {isHymn ? <HymnBlock text={text} /> : <span className="whitespace-pre-wrap">{text}</span>}
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end max-w-[85%] self-end">
      <div className="bg-[var(--brand-primary)] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed">
        {text}
      </div>
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    try {
      const history = newMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await http.post("/ai/chat", { message: text, history: history.slice(0, -1) });
      const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm temporarily unavailable. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const suggestions = [
    "How do I join a parish?",
    "What is the history of CCC?",
    "How do I post a prayer request?",
    "What is CPM Wave?",
  ];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="chatbot-toggle"
        className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-[var(--brand-primary)] text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform md:bottom-8 md:right-8"
        aria-label="Open CPM Assistant"
      >
        {open ? <ChevronDown size={22} /> : <Bot size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand-accent)] text-white text-[10px] font-bold grid place-items-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-[var(--border-default)] overflow-hidden md:bottom-28 md:right-8"
          style={{ maxHeight: "min(580px, calc(100vh - 10rem))" }}
          data-testid="chatbot-panel"
        >
          {/* Header */}
          <div className="bg-[var(--brand-primary)] text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center">
              <Bot size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm leading-tight">CPM Assistant</div>
              <div className="text-[10px] text-white/70 flex items-center gap-1">
                <Sparkles size={9} /> Powered by AI · CCC Knowledge Base
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-subtle)] p-3 space-y-3 flex flex-col">
            {messages.map((m, i) =>
              m.role === "assistant"
                ? <BotMessage key={i} text={m.content} />
                : <UserMessage key={i} text={m.content} />
            )}
            {busy && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-[var(--border-default)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-[var(--text-tertiary)]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only on first turn) */}
          {messages.length === 1 && (
            <div className="bg-[var(--bg-subtle)] px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(send, 0); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-[var(--brand-primary)] text-[var(--brand-primary)] bg-white hover:bg-[var(--brand-primary)] hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-[var(--border-default)] px-3 py-2.5 flex items-end gap-2 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask me anything about CPM or CCC…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] max-h-24 py-1"
              style={{ lineHeight: "1.5" }}
              data-testid="chatbot-input"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center shrink-0 disabled:opacity-40 hover:bg-[var(--brand-secondary)] transition-colors"
              data-testid="chatbot-send"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
