import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles, Loader2, Star, MessageCircle, ChevronDown, ChevronUp, Plus,
  ShieldCheck, X,
} from "lucide-react";
import { toast } from "sonner";

const REACTIONS = [
  { key: "amen", emoji: "", label: "Amen" },
  { key: "hallelujah", emoji: "", label: "Hallelujah" },
  { key: "fire", emoji: "", label: "Fire" },
];

function TestimonyCard({ t, user, onModerate }) {
  const [reactions, setReactions] = useState(t.reactions || {});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const isAdmin = user?.role && ["super_admin", "parish_admin", "moderator"].includes(user.role);

  const react = async (key) => {
    try {
      await http.post(`/testimonies/${t.id}/react`, { reaction: key });
      setReactions((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    } catch (ex) { toast.error(formatErr(ex)); }
  };

  const loadComments = async () => {
    try { const { data } = await http.get(`/testimonies/${t.id}/comments`); setComments(data); } catch {}
  };

  const toggleComments = () => {
    if (!commentsOpen) loadComments();
    setCommentsOpen((s) => !s);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setCommentBusy(true);
    try {
      const { data } = await http.post(`/testimonies/${t.id}/comments`, { body: commentText });
      setComments((prev) => [...prev, data]);
      setCommentText("");
    } catch (ex) { toast.error(formatErr(ex)); } finally { setCommentBusy(false); }
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <div className={`card-surface p-5 ${t.featured ? "ring-1 ring-[var(--brand-accent)]" : ""}`} data-testid={`testimony-${t.id}`}>
      {t.featured && (
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-accent)] bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-3">
          <Star size={10} fill="currentColor" /> Featured Testimony
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-medium shrink-0">
          {(t.user_name || "U").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">{t.user_name}</div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {t.category && `${t.category} · `}{new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {t.scope === "parish" && " · Parish"}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onModerate(t.id, t.featured ? "unfeature" : "feature")} className={`text-xs px-2 py-1 rounded border ${t.featured ? "text-amber-700 border-amber-200 bg-amber-50" : "border-[var(--border-default)] text-[var(--text-tertiary)]"}`}>
              {t.featured ? "Unfeature" : "Feature"}
            </button>
            <button onClick={() => onModerate(t.id, "reject")} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 bg-red-50">Remove</button>
          </div>
        )}
      </div>

      <div className="font-display text-xl text-[var(--brand-primary)]">{t.title}</div>
      <p className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap leading-relaxed">{t.body}</p>

      {/* Reactions */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => react(r.key)}
            className="text-sm px-2.5 py-1 rounded-full border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-1"
            data-testid={`react-${r.key}-${t.id}`}
          >
            <span>{r.emoji}</span>
            {reactions[r.key] > 0 && <span className="text-xs text-[var(--text-secondary)]">{reactions[r.key]}</span>}
          </button>
        ))}
        <button onClick={toggleComments} className="text-xs text-[var(--text-tertiary)] ml-auto flex items-center gap-1 hover:text-[var(--brand-primary)]" data-testid={`comments-toggle-${t.id}`}>
          <MessageCircle size={12} /> {t.comment_count || 0} {commentsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="mt-3 border-t border-[var(--border-default)] pt-3 space-y-2" data-testid={`comments-panel-${t.id}`}>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center text-[10px] shrink-0">{(c.user_name || "U").slice(0, 1)}</div>
              <div className="flex-1 bg-[var(--bg-subtle)] rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-[var(--brand-primary)] text-xs">{c.user_name} </span>
                {c.body}
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-xs text-[var(--text-tertiary)]">No comments yet. Be the first.</div>}
          <div className="flex gap-2 pt-1">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment()} placeholder="Add a comment…" className="input-clean flex-1 text-sm" />
            <button onClick={submitComment} disabled={commentBusy} className="btn-primary text-sm px-3" data-testid={`comment-submit-${t.id}`}>
              {commentBusy ? <Loader2 size={13} className="animate-spin" /> : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Testimonies() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [scope, setScope] = useState("global");
  const [parishes, setParishes] = useState([]);
  const [parishId, setParishId] = useState("");
  const [form, setForm] = useState({ title: "", body: "", scope: "global", parish_id: "", category: "general" });
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { scope };
    if (scope === "parish" && parishId) params.parish_id = parishId;
    http.get("/testimonies", { params }).then((r) => {
      const all = r.data;
      setFeatured(all.filter((t) => t.featured));
      setItems(all.filter((t) => !t.featured));
    }).catch(() => {});
  }, [scope, parishId]);

  useEffect(() => {
    load();
    http.get("/settings/testimony_categories").then((r) => { setCats(r.data); if (r.data[0]) setForm((f) => ({ ...f, category: r.data[0].label })); }).catch(() => {});
    http.get("/me/memberships").then((r) => setParishes(r.data.memberships || [])).catch(() => {});
  }, [load]);

  const create = async () => {
    if (!form.title || !form.body) return toast.error("Title and body required");
    setBusy(true);
    try { await http.post("/testimonies", form); toast.success("Testimony shared — Hallelujah! "); setOpen(false); load(); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const moderate = async (tid, action) => {
    try { await http.patch(`/testimonies/${tid}`, { action }); toast.success("Done"); load(); } catch (ex) { toast.error(formatErr(ex)); }
  };

  const cardProps = { user, onModerate: moderate };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">God's faithfulness</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Testimonies & Harvest</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Share what God has done. Encourage the brethren.</p>
        </div>
        <button onClick={() => setOpen((s) => !s)} className="btn-accent inline-flex items-center gap-1.5" data-testid="testimony-new-btn">
          <Plus size={15} /> {open ? "Close" : "Share testimony"}
        </button>
      </div>

      {/* Scope filter */}
      <div className="flex gap-2 flex-wrap items-center">
        {["global", "parish"].map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`px-4 py-1.5 rounded-md border text-sm ${scope === s ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
            {s === "global" ? "Global" : "My Parish"}
          </button>
        ))}
        {scope === "parish" && (
          <select value={parishId} onChange={(e) => setParishId(e.target.value)} className="input-clean">
            <option value="">All my parishes</option>
            {parishes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Post form */}
      {open && (
        <div className="card-surface p-5 space-y-3">
          <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">New Testimony</div>
          <input className="input-clean" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="testimony-title" />
          <textarea className="input-clean min-h-[130px] resize-none" placeholder="Write your testimony — what has God done for you? *" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="testimony-body" />
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex gap-1.5">
              {["global", "parish"].map((s) => (
                <button key={s} onClick={() => setForm({ ...form, scope: s })} className={`text-sm px-3 py-1 rounded-md border ${form.scope === s ? "bg-[var(--brand-primary)] text-white" : "border-[var(--border-default)]"}`}>{s}</button>
              ))}
            </div>
            {form.scope === "parish" && (
              <select value={form.parish_id} onChange={(e) => setForm({ ...form, parish_id: e.target.value })} className="input-clean">
                <option value="">Select parish</option>
                {parishes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select className="input-clean" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button onClick={create} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="testimony-submit">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={15} />} Share
            </button>
          </div>
        </div>
      )}

      {/* Featured spotlight */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-[var(--brand-accent)]" fill="currentColor" />
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--brand-accent)]">Featured Testimonies</span>
          </div>
          <div className="space-y-4">
            {featured.map((t) => <TestimonyCard key={t.id} t={t} {...cardProps} />)}
          </div>
          <div className="border-t border-[var(--border-default)] my-5" />
        </div>
      )}

      {/* All testimonies */}
      <div className="space-y-4">
        {items.map((t) => <TestimonyCard key={t.id} t={t} {...cardProps} />)}
        {items.length === 0 && featured.length === 0 && (
          <div className="card-surface p-10 text-center">
            <Sparkles size={32} className="mx-auto text-[var(--text-tertiary)] mb-3" />
            <p className="font-display text-xl text-[var(--brand-primary)]">No testimonies yet</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Be the first to share what God has done!</p>
          </div>
        )}
      </div>
    </div>
  );
}
