import React, { useEffect, useRef, useState } from "react";
import { http, formatErr, API } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Send, Bell, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registerPush } from "../lib/push";

export default function Messages() {
  const { user } = useAuth();
  const [conv, setConv] = useState([]);
  const [active, setActive] = useState(null); // conversation_id
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const load = () => http.get("/messages/inbox").then((r) => {
    setConv(r.data);
    if (!active && r.data[0]) setActive(r.data[0].conversation_id);
  }).catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Connect WS
  useEffect(() => {
    if (!user) return;
    const wsBase = API.replace(/^http/, "ws");
    // we need a token — backend ws expects ?token=...; we read from cookie via /auth/refresh which returns access_token
    http.post("/auth/refresh").then(({ data }) => {
      const ws = new WebSocket(`${wsBase}/ws/chat?token=${encodeURIComponent(data.access_token)}`);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          setConv((prev) => {
            const idx = prev.findIndex((c) => c.conversation_id === m.conversation_id);
            if (idx === -1) {
              const other_id = m.to_user_id === user.id ? m.from_user_id : m.to_user_id;
              return [{ conversation_id: m.conversation_id, other_user_id: other_id, last: m, messages: [m] }, ...prev];
            }
            const copy = [...prev];
            copy[idx] = { ...copy[idx], last: m, messages: [m, ...copy[idx].messages] };
            return copy;
          });
        } catch (_) { /* ignore */ }
      };
      ws.onerror = () => { /* silent */ };
    }).catch(() => {});
    return () => { try { wsRef.current && wsRef.current.close(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active, conv]);

  const send = () => {
    if (!text.trim() || !active) return;
    const c = conv.find((x) => x.conversation_id === active);
    if (!c) return;
    setBusy(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ to_user_id: c.other_user_id, body: text }));
      setText(""); setBusy(false);
    } else {
      // fallback REST
      http.post("/messages", { to_user_id: c.other_user_id, body: text }).then(() => { setText(""); load(); }).catch((e) => toast.error(formatErr(e))).finally(() => setBusy(false));
    }
  };

  const enablePush = async () => {
    const ok = await registerPush();
    if (ok) toast.success("Push notifications enabled");
    else toast.error("Push not available or permission denied");
  };

  const active_conv = conv.find((c) => c.conversation_id === active);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Messages</h1>
        <button onClick={enablePush} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]" data-testid="push-enable"><Bell size={14} /> Enable push</button>
      </div>
      {conv.length === 0 ? (
        <div className="card-surface p-6 text-sm text-[var(--text-secondary)]">No conversations yet. Visit <span className="text-[var(--brand-accent)]">Meet People</span> to start one.</div>
      ) : (
        <div className="card-surface flex h-[70vh] overflow-hidden">
          <aside className="w-64 border-r border-[var(--border-default)] overflow-y-auto">
            {conv.map((c) => (
              <button key={c.conversation_id} onClick={() => setActive(c.conversation_id)} data-testid={`conv-${c.conversation_id}`} className={`w-full text-left p-3 border-b border-[var(--border-default)] hover:bg-[var(--bg-subtle)] ${active === c.conversation_id ? "bg-[var(--bg-subtle)]" : ""}`}>
                <div className="text-sm font-medium text-[var(--brand-primary)] flex items-center gap-1"><Users size={12} /> {c.last?.from_name === user?.name ? "You" : c.last?.from_name}</div>
                <div className="text-xs text-[var(--text-tertiary)] truncate mt-1">{c.last?.body}</div>
              </button>
            ))}
          </aside>
          <section className="flex-1 flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg-paper)]">
              {active_conv && [...active_conv.messages].reverse().map((m) => (
                <div key={m.id} className={`flex ${m.from_user_id === user?.id ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.from_user_id === user?.id ? "bg-[var(--brand-primary)] text-white" : "bg-white border border-[var(--border-default)] text-[var(--text-primary)]"}`}>{m.body}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border-default)] p-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="input-clean" data-testid="chat-input" />
              <button onClick={send} disabled={busy} className="btn-primary inline-flex items-center gap-1" data-testid="chat-send">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
