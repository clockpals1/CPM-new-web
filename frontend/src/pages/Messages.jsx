import React, { useEffect, useRef, useState, useCallback } from "react";
import { http, formatErr, API } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Send, Bell, MessageSquare, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { registerPush } from "../lib/push";

function ConvAvatar({ other }) {
  const name = other?.name || "?";
  if (other?.avatar) return <img src={other.avatar} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-medium shrink-0">{name.slice(0, 1).toUpperCase()}</div>;
}

export default function Messages() {
  const { user } = useAuth();
  const [conv, setConv] = useState([]);
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const load = useCallback(() => {
    http.get("/messages/inbox").then((r) => {
      setConv(r.data);
      if (!active && r.data[0]) setActive(r.data[0].conversation_id);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    const wsBase = API.replace(/^http/, "ws");
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
              return [{ conversation_id: m.conversation_id, other_user_id: other_id, other_user: { name: m.from_name }, last: m, unread: 1, messages: [m] }, ...prev];
            }
            const copy = [...prev];
            const isActive = copy[idx].conversation_id === active;
            copy[idx] = { ...copy[idx], last: m, unread: isActive ? 0 : (copy[idx].unread || 0) + 1, messages: [m, ...(copy[idx].messages || [])] };
            return copy;
          });
        } catch (_) {}
      };
      ws.onerror = () => {};
    }).catch(() => {});
    return () => { try { wsRef.current?.close(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Mark read when switching conversation
  useEffect(() => {
    if (!active) return;
    http.patch(`/messages/conversations/${active}/read`).catch(() => {});
    setConv((prev) => prev.map((c) => c.conversation_id === active ? { ...c, unread: 0 } : c));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conv]);

  const send = () => {
    if (!text.trim() || !active) return;
    const c = conv.find((x) => x.conversation_id === active);
    if (!c) return;
    setBusy(true);
    const optimistic = { id: `tmp-${Date.now()}`, conversation_id: active, from_user_id: user.id, from_name: user.name, to_user_id: c.other_user_id, body: text, created_at: new Date().toISOString() };
    setConv((prev) => prev.map((x) => x.conversation_id === active ? { ...x, last: optimistic, messages: [optimistic, ...(x.messages || [])] } : x));
    const sent = text; setText("");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ to_user_id: c.other_user_id, body: sent }));
      setBusy(false);
    } else {
      http.post("/messages", { to_user_id: c.other_user_id, body: sent })
        .then(() => load())
        .catch((e) => toast.error(formatErr(e)))
        .finally(() => setBusy(false));
    }
  };

  const enablePush = async () => {
    const ok = await registerPush();
    if (ok) toast.success("Push notifications enabled"); else toast.error("Push not available");
  };

  const active_conv = conv.find((c) => c.conversation_id === active);
  const filtered = search ? conv.filter((c) => (c.other_user?.name || "").toLowerCase().includes(search.toLowerCase())) : conv;
  const totalUnread = conv.reduce((n, c) => n + (c.unread || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Direct Messages</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">
            Messages {totalUnread > 0 && <span className="text-sm bg-red-500 text-white rounded-full px-2 py-0.5 ml-1">{totalUnread}</span>}
          </h1>
        </div>
        <button onClick={enablePush} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]" data-testid="push-enable">
          <Bell size={14} /> Enable push
        </button>
      </div>

      {conv.length === 0 ? (
        <div className="card-surface p-10 text-center space-y-3">
          <MessageSquare size={36} className="mx-auto text-[var(--text-tertiary)]" />
          <p className="font-display text-xl text-[var(--brand-primary)]">No conversations yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Visit <strong>Meet People</strong> to find brethren and start a conversation.</p>
        </div>
      ) : (
        <div className="card-surface flex h-[76vh] overflow-hidden rounded-xl">
          {/* Sidebar */}
          <aside className="w-72 border-r border-[var(--border-default)] flex flex-col shrink-0">
            <div className="p-3 border-b border-[var(--border-default)]">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="input-clean pl-8 text-sm w-full" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((c) => {
                const other = c.other_user || {};
                const isActive = active === c.conversation_id;
                return (
                  <button
                    key={c.conversation_id}
                    onClick={() => setActive(c.conversation_id)}
                    data-testid={`conv-${c.conversation_id}`}
                    className={`w-full text-left p-3 border-b border-[var(--border-default)] hover:bg-[var(--bg-subtle)] flex items-center gap-2.5 transition-colors ${isActive ? "bg-[var(--bg-subtle)]" : ""}`}
                  >
                    <ConvAvatar other={other} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm truncate ${c.unread ? "font-semibold text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>{other.name || "Unknown"}</span>
                        {c.unread > 0 && <span className="text-[10px] bg-[var(--brand-accent)] text-white rounded-full px-1.5 py-0.5 shrink-0">{c.unread}</span>}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                        {c.last?.from_user_id === user?.id ? "You: " : ""}{c.last?.body}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex-1 flex flex-col min-w-0">
            {active_conv ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-[var(--border-default)] flex items-center gap-3 bg-[var(--bg-paper)]">
                  <ConvAvatar other={active_conv.other_user || {}} />
                  <div>
                    <div className="text-sm font-medium text-[var(--brand-primary)]">{active_conv.other_user?.name || "Unknown"}</div>
                    {active_conv.other_user?.ccc_rank && <div className="text-xs text-[var(--text-tertiary)]">{active_conv.other_user.ccc_rank}</div>}
                  </div>
                </div>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg-paper)]">
                  {[...(active_conv.messages || [])].reverse().map((m) => (
                    <div key={m.id} className={`flex ${m.from_user_id === user?.id ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${m.from_user_id === user?.id ? "bg-[var(--brand-primary)] text-white rounded-br-sm" : "bg-white border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-sm"}`}>
                        {m.body}
                        <div className={`text-[10px] mt-0.5 ${m.from_user_id === user?.id ? "text-white/60" : "text-[var(--text-tertiary)]"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Input */}
                <div className="border-t border-[var(--border-default)] p-3 flex gap-2 bg-[var(--bg-paper)]">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Type a message…"
                    className="input-clean flex-1"
                    data-testid="chat-input"
                  />
                  <button onClick={send} disabled={busy || !text.trim()} className="btn-primary inline-flex items-center gap-1" data-testid="chat-send">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-[var(--text-tertiary)]">
                <div className="text-center"><MessageSquare size={28} className="mx-auto mb-2" /><p className="text-sm">Select a conversation</p></div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
