import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Heart, MessageCircle, Send, Loader2, Flag, ChevronDown } from "lucide-react";
import { toast } from "sonner";

function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  useEffect(() => { http.get(`/posts/${postId}/comments`).then((r) => setComments(r.data)); }, [postId]);
  const submit = async () => {
    if (!text.trim()) return;
    try { const { data } = await http.post(`/posts/${postId}/comments`, { body: text }); setComments([...comments, data]); setText(""); } catch (e) { toast.error(formatErr(e)); }
  };
  return (
    <div className="mt-3 border-t border-[var(--border-default)] pt-3 space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="text-sm" data-testid={`comment-${c.id}`}>
          <span className="font-medium text-[var(--brand-primary)]">{c.user_name}</span>{" "}
          <span className="text-[var(--text-secondary)]">{c.body}</span>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="input-clean text-sm" onKeyDown={(e) => e.key === "Enter" && submit()} data-testid={`comment-input-${postId}`} />
        <button onClick={submit} className="btn-primary text-sm" data-testid={`comment-submit-${postId}`}>Send</button>
      </div>
    </div>
  );
}

export default function GlobalFeed() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [openComments, setOpenComments] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => http.get("/posts", { params: { scope: "global" } }).then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { const { data } = await http.post("/posts", { body: text, scope: "global" }); setPosts([data, ...posts]); setText(""); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  const react = async (id) => {
    try { await http.post(`/posts/${id}/react`, { reaction: "amen" }); setPosts(posts.map((p) => p.id === id ? { ...p, reactions: { ...(p.reactions || {}), amen: (p.reactions?.amen || 0) + 1 } } : p)); } catch {}
  };
  const report = async (id) => {
    try { await http.post("/reports", { target_type: "post", target_id: id, reason: "Inappropriate Content" }); toast.success("Reported. Moderators will review."); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Community</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Global feed</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Voices from the worldwide Celestial family.</p>
      </div>

      <div className="card-surface p-5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share with the worldwide family..." className="input-clean min-h-[80px]" data-testid="gpost-input" />
        <div className="flex justify-end mt-3">
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="gpost-submit">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Share</button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">Be the first to share.</div> :
          posts.map((p) => (
            <div key={p.id} className="card-surface p-5" data-testid={`gpost-${p.id}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-sm">{(p.user_name || "U").slice(0, 1)}</div>
                <div className="leading-tight flex-1"><div className="text-sm font-medium text-[var(--brand-primary)]">{p.user_name}</div><div className="text-xs text-[var(--text-tertiary)]">{p.user_rank} • {new Date(p.created_at).toLocaleString()}</div></div>
                <button onClick={() => report(p.id)} className="text-xs text-[var(--text-tertiary)] hover:text-red-700" title="Report" data-testid={`report-${p.id}`}><Flag size={14} /></button>
              </div>
              <div className="text-[var(--text-primary)] whitespace-pre-wrap">{p.body}</div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-tertiary)]">
                <button onClick={() => react(p.id)} className="inline-flex items-center gap-1 hover:text-[var(--brand-accent)]" data-testid={`greact-${p.id}`}><Heart size={14} /> {p.reactions?.amen || 0} Amen</button>
                <button onClick={() => setOpenComments({ ...openComments, [p.id]: !openComments[p.id] })} className="inline-flex items-center gap-1 hover:text-[var(--brand-primary)]" data-testid={`gcomments-toggle-${p.id}`}>
                  <MessageCircle size={14} /> {p.comment_count || 0} <ChevronDown size={12} className={openComments[p.id] ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
              </div>
              {openComments[p.id] && <CommentSection postId={p.id} />}
            </div>
          ))}
      </div>
    </div>
  );
}
