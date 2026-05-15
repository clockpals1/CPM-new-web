import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MyParish() {
  const [memberships, setMemberships] = useState([]);
  const [active, setActive] = useState(null);
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    http.get("/me/memberships").then((r) => {
      setMemberships(r.data);
      if (r.data[0]) setActive(r.data[0].parish_id);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    http.get("/posts", { params: { scope: "parish", parish_id: active } }).then((r) => setPosts(r.data));
  }, [active]);

  const post = async () => {
    if (!text.trim() || !active) return;
    setBusy(true);
    try {
      const { data } = await http.post("/posts", { body: text, scope: "parish", parish_id: active });
      setPosts([data, ...posts]); setText("");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const react = async (pid) => {
    try { await http.post(`/posts/${pid}/react`, { reaction: "amen" }); setPosts(posts.map((p) => p.id === pid ? { ...p, reactions: { ...(p.reactions || {}), amen: ((p.reactions?.amen) || 0) + 1 } } : p)); } catch {}
  };

  if (memberships.length === 0) {
    return (
      <div className="max-w-3xl mx-auto card-surface p-8 text-center">
        <h2 className="font-display text-2xl text-[var(--brand-primary)]">You haven't joined a parish yet</h2>
        <p className="text-[var(--text-secondary)] mt-2">Browse parishes and submit a membership request.</p>
        <Link to="/app/parishes" className="btn-primary inline-block mt-5" data-testid="myparish-find">Find a parish</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm text-[var(--text-tertiary)]">Parish feed:</div>
        {memberships.map((m) => (
          <button key={m.parish_id} onClick={() => setActive(m.parish_id)} data-testid={`tab-parish-${m.parish_id}`} className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${active === m.parish_id ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--brand-primary)]"}`}>{m.parish?.name}</button>
        ))}
      </div>

      <div className="card-surface p-5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share with your parish..." className="input-clean min-h-[80px]" data-testid="post-input" />
        <div className="flex justify-end mt-3">
          <button onClick={post} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="post-submit">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Post</button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No posts yet. Be the first to share.</div> :
          posts.map((p) => (
            <div key={p.id} className="card-surface p-5" data-testid={`feed-post-${p.id}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-sm">{(p.user_name || "U").slice(0, 1)}</div>
                <div className="leading-tight"><div className="text-sm font-medium text-[var(--brand-primary)]">{p.user_name}</div><div className="text-xs text-[var(--text-tertiary)]">{p.user_rank} • {new Date(p.created_at).toLocaleString()}</div></div>
              </div>
              <div className="text-[var(--text-primary)] whitespace-pre-wrap">{p.body}</div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-tertiary)]">
                <button onClick={() => react(p.id)} className="inline-flex items-center gap-1 hover:text-[var(--brand-accent)]" data-testid={`react-${p.id}`}><Heart size={14} /> {p.reactions?.amen || 0} Amen</button>
                <span className="inline-flex items-center gap-1"><MessageCircle size={14} /> {p.comment_count || 0}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
