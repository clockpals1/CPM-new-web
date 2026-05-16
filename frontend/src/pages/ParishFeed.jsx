import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import {
  Church, MapPin, Clock, Users, Calendar, Navigation, Heart, Send, Flag,
  MessageCircle, ChevronDown, Video, Star, CheckCircle2, ArrowRight,
  AlertCircle, Pin, Pencil, Trash2, X, Loader2, Megaphone, Music,
  HandHelping, BookOpen, Zap, ExternalLink, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import MediaUploader from "../components/MediaUploader";

// ─── Post type catalogue ──────────────────────────────────────────────────────
const POST_TYPES = [
  { id: "member_post",       label: "Post",                color: "text-[var(--brand-primary)]",   bg: "bg-[var(--bg-subtle)]",  adminOnly: false },
  { id: "testimony_preview", label: "Testimony / Praise",  color: "text-emerald-700",              bg: "bg-emerald-50",          adminOnly: false },
  { id: "prayer_highlight",  label: "Prayer Highlight",    color: "text-rose-700",                 bg: "bg-rose-50",             adminOnly: false },
  { id: "announcement",      label: "Announcement",        color: "text-[var(--brand-accent)] font-semibold", bg: "bg-amber-50", adminOnly: true },
  { id: "worship_reminder",  label: "Worship Reminder",    color: "text-blue-700",                 bg: "bg-blue-50",             adminOnly: true },
  { id: "event_promo",       label: "Event",               color: "text-purple-700",               bg: "bg-purple-50",           adminOnly: true },
  { id: "choir_update",      label: "Choir Update",        color: "text-teal-700",                 bg: "bg-teal-50",             adminOnly: true },
  { id: "service_notice",    label: "Service Notice",      color: "text-indigo-700",               bg: "bg-indigo-50",           adminOnly: true },
];
const typeInfo = (id) => POST_TYPES.find((t) => t.id === id) || POST_TYPES[0];
const isAdmin = (user) => user?.role === "super_admin" || user?.role === "parish_admin";
const WELCOME_KEY = (pid) => `cpm_welcome_dismissed_${pid}`;

// ─── No parish guard ──────────────────────────────────────────────────────────
function NoParishGuard() {
  return (
    <div className="max-w-xl mx-auto card-surface p-12 text-center space-y-5" data-testid="no-parish-feed-guard">
      <Church size={36} className="mx-auto text-[var(--brand-accent)]" />
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Alleluia</div>
      <h2 className="font-display text-2xl text-[var(--brand-primary)]">Join a parish to access the feed</h2>
      <p className="text-sm text-[var(--text-secondary)]">The parish feed is a private community space for approved members only.</p>
      <Link to="/app/parishes" className="btn-primary inline-flex items-center gap-2 px-7 py-3 text-sm">
        <Navigation size={14} /> Find a Parish <ArrowRight size={13} />
      </Link>
    </div>
  );
}

// ─── Welcome panel ────────────────────────────────────────────────────────────
function WelcomePanel({ membership, onDismiss }) {
  const p = membership.parish;
  return (
    <div className="card-surface border-l-4 border-[var(--brand-accent)] p-5 sm:p-6 space-y-4 relative" data-testid="welcome-panel">
      <button onClick={onDismiss} className="absolute top-3 right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" data-testid="dismiss-welcome"><X size={16} /></button>
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-1">Alleluia — Welcome!</div>
        <h3 className="font-display text-xl text-[var(--brand-primary)]">You have joined {p.name}</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">We're glad you're here. Get started with your new parish community.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        {p.shepherd_name && <div className="flex items-center gap-2"><Star size={13} className="text-[var(--brand-accent)]" /><span>Shepherd: <strong>{p.shepherd_name}</strong></span></div>}
        {p.service_times && <div className="flex items-center gap-2"><Clock size={13} className="text-[var(--brand-accent)]" /><span>{p.service_times}</span></div>}
        {p.city && <div className="flex items-center gap-2"><MapPin size={13} className="text-[var(--brand-accent)]" /><span>{[p.city, p.country].filter(Boolean).join(", ")}</span></div>}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-default)]">
        <Link to={`/app/parishes/${p.id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90"><Navigation size={11} /> Directions</Link>
        <Link to="/app/prayer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-accent)]"><Heart size={11} /> Prayer Wall</Link>
        <Link to="/app/events" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-accent)]"><Calendar size={11} /> Events</Link>
        {p.choir_enabled && <Link to="/app/choir" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-accent)]"><Music size={11} /> Choir</Link>}
        {p.ministries_enabled && <Link to="/app/service" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-accent)]"><HandHelping size={11} /> Service</Link>}
        <Link to="/app/profile" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-accent)]"><CheckCircle2 size={11} /> Complete Profile</Link>
      </div>
    </div>
  );
}

// ─── Parish pulse ─────────────────────────────────────────────────────────────
function ParishPulse({ membership }) {
  const { member_count, recent_posts, recent_prayers, next_event, parish: p } = membership;
  return (
    <div className="card-surface p-4 sm:p-5" data-testid="parish-pulse">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-accent)] font-semibold mb-3 flex items-center gap-1.5"><Zap size={11} /> Parish Pulse</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
        {[
          { label: "Members",          value: member_count ?? "—",  sub: "in parish" },
          { label: "Posts",            value: recent_posts ?? 0,    sub: "this week" },
          { label: "Prayers",          value: recent_prayers ?? 0,  sub: "this week" },
          { label: "Events",           value: next_event ? "1+" : "0", sub: "upcoming" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[var(--bg-subtle)] rounded-lg p-3">
            <div className="font-display text-xl text-[var(--brand-primary)]">{value}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{label}</div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{sub}</div>
          </div>
        ))}
      </div>
      {/* Worship Companion */}
      <div className="border-t border-[var(--border-default)] pt-4 grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Next Worship</div>
          {p.service_times ? (
            <div className="text-sm flex items-center gap-2"><Clock size={13} className="text-[var(--brand-accent)]" />{p.service_times}</div>
          ) : <div className="text-xs text-[var(--text-tertiary)]">No schedule set</div>}
          {next_event && (
            <div className="text-sm flex items-start gap-2 mt-1">
              <Calendar size={13} className="text-[var(--brand-accent)] flex-shrink-0 mt-0.5" />
              <span className="leading-snug"><span className="font-medium">{next_event.title}</span> <span className="text-[var(--text-tertiary)] text-xs">· {new Date(next_event.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span></span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-start content-start">
          <Link to={`/app/parishes/${p.id}`} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-primary)]"><Navigation size={11} /> Directions</Link>
          <Link to="/app/prayer" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-primary)]"><Heart size={11} /> Pray</Link>
          {p.livestream_url && <a href={p.livestream_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent)] hover:text-white transition-colors"><Video size={11} /> Watch</a>}
        </div>
      </div>
    </div>
  );
}

// ─── Feed composer ────────────────────────────────────────────────────────────
function FeedComposer({ user, parishId, onPosted }) {
  const [text, setText] = useState("");
  const [postType, setPostType] = useState("member_post");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [busy, setBusy] = useState(false);
  const availableTypes = POST_TYPES.filter((t) => !t.adminOnly || isAdmin(user));

  const submit = async () => {
    if (!text.trim() && !mediaUrls.length) return;
    setBusy(true);
    try {
      const { data } = await http.post("/posts", {
        body: text,
        scope: "parish",
        parish_id: parishId,
        post_type: postType,
        media_urls: mediaUrls.map((m) => m.url),
      });
      data.media_urls = mediaUrls;
      onPosted(data);
      setText(""); setPostType("member_post"); setMediaUrls([]);
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const ti = typeInfo(postType);
  return (
    <div className="card-surface p-4 sm:p-5 space-y-3" data-testid="feed-composer">
      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTypes.map((t) => (
            <button key={t.id} onClick={() => setPostType(t.id)} data-testid={`type-btn-${t.id}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${postType === t.id ? `${t.bg} ${t.color} border-current font-medium` : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {postType !== "member_post" && (
        <div className={`text-xs px-3 py-1.5 rounded-md ${ti.bg} ${ti.color} font-medium`}>
          Posting as: {ti.label}
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && submit()}
        placeholder={postType === "announcement" ? "Write a parish announcement…" : postType === "worship_reminder" ? "Share a worship or service reminder…" : "Share with your parish… Alleluia!"}
        className="input-clean min-h-[80px] w-full text-sm" data-testid="feed-composer-input" />
      <MediaUploader mediaUrls={mediaUrls} onChange={setMediaUrls} />
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[var(--text-tertiary)]">Ctrl+Enter to post</span>
        <button onClick={submit} disabled={busy || (!text.trim() && !mediaUrls.length)} className="btn-primary text-sm inline-flex items-center gap-2" data-testid="feed-composer-submit">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />} Post
        </button>
      </div>
    </div>
  );
}

// ─── Comment thread ───────────────────────────────────────────────────────────
function CommentThread({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  useEffect(() => { http.get(`/posts/${postId}/comments`).then((r) => setComments(r.data)).catch(() => {}); }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    try { const { data } = await http.post(`/posts/${postId}/comments`, { body: text }); setComments([...comments, data]); setText(""); } catch (e) { toast.error(formatErr(e)); }
  };
  const del = async (cid) => {
    try { await http.delete(`/posts/${postId}/comments/${cid}`); setComments(comments.filter((c) => c.id !== cid)); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="mt-3 border-t border-[var(--border-default)] pt-3 space-y-2" data-testid={`comments-${postId}`}>
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm group">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-xs flex-shrink-0 overflow-hidden">
            {c.user_avatar ? <img src={c.user_avatar} alt="" className="w-full h-full object-cover" /> : (c.user_name || "U").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0 bg-[var(--bg-subtle)] rounded-lg px-3 py-2">
            <span className="font-medium text-[var(--brand-primary)] text-xs">{c.user_name}</span>{" "}
            <span className="text-[var(--text-secondary)]">{c.body}</span>
          </div>
          {(c.user_id === user?.id || isAdmin(user)) && (
            <button onClick={() => del(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-red-600 flex-shrink-0 mt-1" title="Delete comment"><Trash2 size={12} /></button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Write a comment…" className="input-clean text-sm flex-1" data-testid={`comment-input-${postId}`} />
        <button onClick={submit} className="btn-primary text-xs px-3" data-testid={`comment-submit-${postId}`}>Send</button>
      </div>
    </div>
  );
}

// ─── Feed post card ───────────────────────────────────────────────────────────
function FeedPostCard({ post, user, onDelete, onPin, onEdit }) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const ti = typeInfo(post.post_type || "member_post");
  const canModify = post.user_id === user?.id || isAdmin(user);

  const saveEdit = async () => {
    setBusy(true);
    try { await http.patch(`/posts/${post.id}`, { body: editBody }); onEdit(post.id, editBody); setEditing(false); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  const react = async () => {
    try { await http.post(`/posts/${post.id}/react`, { reaction: "amen" }); } catch {}
  };
  const report = async () => {
    try { await http.post("/reports", { target_type: "post", target_id: post.id, reason: "Inappropriate Content" }); toast.success("Reported to moderators."); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className={`card-surface overflow-hidden ${post.pinned ? "ring-1 ring-[var(--brand-accent)] ring-opacity-40" : ""}`} data-testid={`feed-post-${post.id}`}>
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-[var(--brand-accent)] font-semibold">
          <Pin size={11} /> Pinned by parish admin
        </div>
      )}
      {post.post_type && post.post_type !== "member_post" && (
        <div className={`px-5 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${ti.bg} ${ti.color} border-b border-opacity-20`}>
          <Megaphone size={11} /> {ti.label}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-sm font-medium flex-shrink-0 overflow-hidden">
            {post.user_avatar ? <img src={post.user_avatar} alt="" className="w-full h-full object-cover rounded-full" /> : (post.user_name || "U").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-medium text-[var(--brand-primary)]">{post.user_name}</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              {[post.user_rank, new Date(post.created_at).toLocaleString()].filter(Boolean).join(" · ")}
              {post.edited_at && <span className="ml-1 italic">(edited)</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin(user) && (
              <button onClick={() => onPin(post.id, !post.pinned)} title={post.pinned ? "Unpin" : "Pin"} className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--brand-accent)]" data-testid={`pin-${post.id}`}><Pin size={13} /></button>
            )}
            {canModify && (
              <button onClick={() => { setEditing(!editing); setEditBody(post.body); }} title="Edit" className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)]" data-testid={`edit-${post.id}`}><Pencil size={13} /></button>
            )}
            {canModify && (
              <button onClick={() => onDelete(post.id)} title="Delete" className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-red-500" data-testid={`delete-${post.id}`}><Trash2 size={13} /></button>
            )}
            <button onClick={report} title="Report" className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-red-600" data-testid={`report-${post.id}`}><Flag size={13} /></button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-2 mb-3">
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="input-clean text-sm w-full min-h-[60px]" data-testid={`edit-input-${post.id}`} />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={busy} className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1">{busy && <Loader2 size={12} className="animate-spin" />} Save</button>
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 border border-[var(--border-default)] rounded-md">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-primary)] whitespace-pre-wrap text-sm leading-relaxed mb-3">{post.body}</p>
        )}

        {post.image_url && <img src={post.image_url} alt="" className="rounded-lg w-full max-h-80 object-cover mb-3" />}

        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <button onClick={react} className="inline-flex items-center gap-1.5 hover:text-[var(--brand-accent)] transition-colors" data-testid={`react-${post.id}`}>
            <Heart size={13} /> {post.reactions?.amen || 0} Amen
          </button>
          <button onClick={() => setShowComments(!showComments)} className="inline-flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors" data-testid={`toggle-comments-${post.id}`}>
            <MessageCircle size={13} /> {post.comment_count || 0}
            <ChevronDown size={11} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showComments && <CommentThread postId={post.id} user={user} />}
      </div>
    </div>
  );
}

// ─── Main parish feed page ────────────────────────────────────────────────────
export default function ParishFeed() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePid, setActivePid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // Sync welcomeDismissed from localStorage whenever the active parish changes
  useEffect(() => {
    if (activePid) setWelcomeDismissed(Boolean(localStorage.getItem(WELCOME_KEY(activePid))));
  }, [activePid]);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    http.get("/me/parish-dashboard").then(({ data }) => {
      setDashboard(data);
      const ids = data.memberships.map((m) => m.parish_id);
      const pref = data.active_parish_id;
      setActivePid(pref && ids.includes(pref) ? pref : ids[0] || null);
    }).catch(() => toast.error("Could not load parish data.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDashboard(); }, []); // eslint-disable-line

  const loadPosts = useCallback((pid) => {
    if (!pid) return;
    setLoadingPosts(true);
    http.get("/posts", { params: { scope: "parish", parish_id: pid } })
      .then((r) => setPosts(r.data)).catch(() => {}).finally(() => setLoadingPosts(false));
  }, []);

  useEffect(() => { if (activePid) loadPosts(activePid); }, [activePid, loadPosts]);

  const switchParish = async (pid) => {
    setActivePid(pid);
    setPosts([]);
    try { await http.post("/me/active-parish", { parish_id: pid }); } catch {}
  };

  const handlePosted = (newPost) => setPosts([newPost, ...posts]);
  const handleDelete = async (pid) => {
    if (!window.confirm("Delete this post?")) return;
    try { await http.delete(`/posts/${pid}`); setPosts(posts.filter((p) => p.id !== pid)); } catch (e) { toast.error(formatErr(e)); }
  };
  const handlePin = async (pid, pinned) => {
    try { await http.patch(`/posts/${pid}/pin`, { pinned }); setPosts(posts.map((p) => p.id === pid ? { ...p, pinned } : p).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))); toast.success(pinned ? "Post pinned" : "Post unpinned"); } catch (e) { toast.error(formatErr(e)); }
  };
  const handleEdit = (pid, body) => setPosts(posts.map((p) => p.id === pid ? { ...p, body, edited_at: new Date().toISOString() } : p));

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-[var(--bg-subtle)] rounded w-1/3" />
        <div className="card-surface h-40 rounded-xl" />
        <div className="card-surface h-28 rounded-xl" />
        <div className="card-surface h-20 rounded-xl" />
        {[1, 2, 3].map((n) => <div key={n} className="card-surface h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!dashboard) return null;
  const { memberships, pending } = dashboard;
  if (memberships.length === 0) return <NoParishGuard />;

  const activeMembership = memberships.find((m) => m.parish_id === activePid) || memberships[0];
  const activeParish = activeMembership?.parish;
  const isNewMember = activeMembership?.approved_at && (Date.now() - new Date(activeMembership.approved_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const welcomeKey = WELCOME_KEY(activeMembership?.parish_id || "");
  const dismissWelcome = () => { localStorage.setItem(welcomeKey, "1"); setWelcomeDismissed(true); };

  const pinnedPosts = posts.filter((p) => p.pinned);
  const regularPosts = posts.filter((p) => !p.pinned);

  return (
    <div className="max-w-3xl mx-auto space-y-5" data-testid="parish-feed-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Parish Feed</div>
          <h1 className="font-display text-3xl text-[var(--brand-primary)] mt-0.5">{activeParish?.name || "My Parish"}</h1>
          {activeParish && <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5"><MapPin size={10} />{[activeParish.city, activeParish.country].filter(Boolean).join(", ")}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => loadPosts(activePid)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-accent)] inline-flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
          <Link to="/app/my-parish" className="text-xs text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"><ExternalLink size={12} /> Parish Home</Link>
        </div>
      </div>

      {/* Parish switcher */}
      {memberships.length > 1 && (
        <div className="card-surface p-3 flex items-center gap-2 flex-wrap" data-testid="feed-parish-switcher">
          <span className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Parish:</span>
          {memberships.map((m) => (
            <button key={m.parish_id} onClick={() => switchParish(m.parish_id)} data-testid={`switch-${m.parish_id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${activePid === m.parish_id ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]"}`}>
              {m.parish?.name || m.parish_id}
            </button>
          ))}
        </div>
      )}

      {/* Welcome panel */}
      {isNewMember && !welcomeDismissed && activeMembership && (
        <WelcomePanel membership={activeMembership} onDismiss={dismissWelcome} />
      )}

      {/* Parish pulse + worship companion */}
      {activeMembership && <ParishPulse membership={activeMembership} />}

      {/* Parish inactive warning */}
      {activeParish?.status !== "active" && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3" data-testid="parish-inactive-warning">
          <AlertCircle size={15} className="flex-shrink-0" /> This parish is currently inactive. Posts are read-only.
        </div>
      )}

      {/* Pinned announcements */}
      {pinnedPosts.length > 0 && (
        <div className="space-y-2" data-testid="pinned-section">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-accent)] font-semibold flex items-center gap-1.5"><Pin size={10} /> Pinned</div>
          {pinnedPosts.map((p) => <FeedCard key={p.id} post={p} user={user} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />)}
        </div>
      )}

      {/* Composer */}
      {activeParish?.status === "active" && (
        <FeedComposer user={user} parishId={activeMembership.parish_id} onPosted={handlePosted} />
      )}

      {/* Feed */}
      <div className="space-y-4" data-testid="feed-list">
        {loadingPosts && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card-surface p-5 space-y-3">
                <div className="flex gap-3"><div className="w-9 h-9 rounded-full bg-[var(--bg-subtle)]" /><div className="flex-1 space-y-2"><div className="h-3 bg-[var(--bg-subtle)] rounded w-1/3" /><div className="h-3 bg-[var(--bg-subtle)] rounded w-1/2" /></div></div>
                <div className="h-3 bg-[var(--bg-subtle)] rounded" /><div className="h-3 bg-[var(--bg-subtle)] rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
        {!loadingPosts && regularPosts.length === 0 && (
          <div className="card-surface p-10 text-center space-y-3" data-testid="feed-empty">
            <BookOpen size={24} className="mx-auto text-[var(--text-tertiary)]" />
            <div className="font-display text-lg text-[var(--brand-primary)]">No posts yet</div>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">Be the first to share something with your parish community. Alleluia!</p>
          </div>
        )}
        {regularPosts.map((p) => <FeedCard key={p.id} post={p} user={user} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />)}
      </div>

      {/* Pending notice */}
      {pending.length > 0 && (
        <div className="text-xs text-[var(--text-tertiary)] text-center pt-2">
          {pending.length} pending membership request{pending.length > 1 ? "s" : ""} awaiting approval in other parishes.
        </div>
      )}
    </div>
  );
}
