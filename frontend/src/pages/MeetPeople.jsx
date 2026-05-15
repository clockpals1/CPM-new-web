import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { MapPin, MessageSquare, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MeetPeople() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [country, setCountry] = useState(user?.country || "");
  const [q, setQ] = useState("");
  const [msgFor, setMsgFor] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => http.get("/members", { params: { country: country || undefined, q: q || undefined } }).then((r) => setMembers(r.data.filter((m) => m.id !== user?.id)));
  useEffect(() => { load(); }, [country]);

  const follow = async (id) => { try { await http.post(`/members/${id}/follow`); toast.success("Following"); } catch (e) { toast.error(formatErr(e)); } };
  const send = async () => {
    if (!msgText.trim() || !msgFor) return;
    setBusy(true);
    try { await http.post("/messages", { to_user_id: msgFor.id, body: msgText }); toast.success("Message sent"); setMsgFor(null); setMsgText(""); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Meet Celestial People</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Connect with brethren near you</h1>
      </div>
      <div className="card-surface p-4 grid sm:grid-cols-4 gap-3 items-center">
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="input-clean" data-testid="meet-country" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, or rank" className="input-clean sm:col-span-2" data-testid="meet-q" />
        <button onClick={load} className="btn-primary" data-testid="meet-search">Search</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div key={m.id} className="card-surface p-5" data-testid={`member-card-${m.id}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-lg">{(m.name || "U").slice(0, 1)}</div>
              <div className="min-w-0">
                <div className="font-medium text-[var(--brand-primary)] truncate">{m.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.ccc_rank}</div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-3 flex items-center gap-1"><MapPin size={12} /> {m.city || "—"}, {m.country || "—"}</div>
            <p className="text-sm mt-2 text-[var(--text-secondary)] line-clamp-3 min-h-[40px]">{m.profile_summary}</p>
            {m.badges?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {m.badges.map((b) => (<span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)]">{b}</span>))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => follow(m.id)} className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]" data-testid={`follow-${m.id}`}><UserPlus size={14} /> Follow</button>
              <button onClick={() => setMsgFor(m)} className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]" data-testid={`message-${m.id}`}><MessageSquare size={14} /> Message</button>
            </div>
          </div>
        ))}
        {members.length === 0 && <div className="card-surface p-5 col-span-full text-sm text-[var(--text-secondary)]">No members found.</div>}
      </div>

      {msgFor && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={() => setMsgFor(null)}>
          <div className="card-surface p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-xl text-[var(--brand-primary)]">Message {msgFor.name}</div>
            <textarea className="input-clean mt-3 min-h-[100px]" value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type your message…" data-testid="msg-text" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setMsgFor(null)} className="px-4 py-2 text-sm">Cancel</button>
              <button onClick={send} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="msg-send">{busy && <Loader2 size={16} className="animate-spin" />} Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
