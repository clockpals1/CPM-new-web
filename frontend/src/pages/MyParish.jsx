import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { Link } from "react-router-dom";
import {
  Church, MapPin, Phone, Clock, Users, Calendar, Music, BookOpen,
  MessageSquare, Navigation, Info, Heart, Send,
  ChevronRight, Globe, Video, Star, CheckCircle2,
  ArrowRight, AlertCircle, ExternalLink, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

// HandHeart may not exist in installed lucide version — use HeartHandshake or Heart fallback
let HandHeart;
try { HandHeart = require("lucide-react").HeartHandshake || require("lucide-react").Heart; } catch { HandHeart = Heart; }

const QUICK_ACTIONS = [
  { id: "feed",        label: "Parish Feed",   icon: MessageSquare, kind: "internal", path: "/app/parish-feed" },
  { id: "prayer",      label: "Prayer Wall",   icon: HandHeart,     kind: "internal", path: "/app/prayer" },
  { id: "events",      label: "Events",        icon: Calendar,      kind: "internal", path: "/app/events" },
  { id: "choir",       label: "Choir",         icon: Music,         kind: "internal", path: "/app/choir",       enabledField: "choir_enabled" },
  { id: "service",     label: "Service",       icon: Users,         kind: "internal", path: "/app/service",     enabledField: "ministries_enabled" },
  { id: "testimonies", label: "Testimonies",   icon: BookOpen,      kind: "internal", path: "/app/testimonies" },
  { id: "directions",  label: "Directions",    icon: Navigation,    kind: "parish_detail" },
  { id: "livestream",  label: "Livestream",    icon: Video,         kind: "livestream" },
];

// ─── No parish state ──────────────────────────────────────────────────────────
function NoParishState() {
  return (
    <div className="max-w-2xl mx-auto" data-testid="no-parish-state">
      <div className="card-surface p-10 sm:p-16 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] grid place-items-center mx-auto">
          <Church size={36} className="text-[var(--brand-accent)]" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-2">Alleluia</div>
          <h2 className="font-display text-3xl text-[var(--brand-primary)]">Welcome, beloved</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-md mx-auto leading-relaxed">
            You have not joined a parish yet. Find a Celestial Church of Christ parish near you to worship, connect, and grow in your faith community.
          </p>
        </div>
        <Link to="/app/parishes" className="btn-primary inline-flex items-center gap-2 px-7 py-3 text-sm" data-testid="myparish-find">
          <Navigation size={15} /> Find a Parish <ArrowRight size={14} />
        </Link>
        <p className="text-xs text-[var(--text-tertiary)]">You may belong to up to 2 parishes at once.</p>
      </div>
    </div>
  );
}

// ─── Pending-only state ───────────────────────────────────────────────────────
function PendingOnlyState({ pending, onRefresh }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4" data-testid="pending-only-state">
      <div className="card-surface p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mx-auto">
          <Clock size={26} className="text-amber-600" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-amber-600 mb-2">Pending approval</div>
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">Your request is under review</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm mx-auto">
            The parish shepherd or admin will review your membership request. You will receive a notification once approved.
          </p>
        </div>
        <button onClick={onRefresh} className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
          <RefreshCw size={13} /> Refresh status
        </button>
      </div>
      {pending.map((m) => (
        <div key={m.id} className="card-surface p-5 flex items-start gap-3" data-testid={`pending-card-${m.id}`}>
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] grid place-items-center flex-shrink-0">
            <Church size={18} className="text-[var(--brand-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg text-[var(--brand-primary)]">{m.parish?.name || "Parish"}</div>
            <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {[m.parish?.city, m.parish?.country].filter(Boolean).join(", ")}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
              <Info size={11} /> Request submitted {new Date(m.created_at).toLocaleDateString()}
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-semibold uppercase tracking-widest flex-shrink-0">Pending</span>
        </div>
      ))}
      <div className="text-center pt-1">
        <Link to="/app/parishes" className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
          <Navigation size={13} /> Browse other parishes
        </Link>
      </div>
    </div>
  );
}

// ─── Parish hero card ─────────────────────────────────────────────────────────
function ParishHeroCard({ membership }) {
  const { parish: p } = membership;
  const isActive = p.status === "active";
  return (
    <div className="card-surface overflow-hidden" data-testid="parish-hero-card">
      {p.image_url && (
        <div className="h-32 sm:h-44 overflow-hidden bg-[var(--bg-subtle)]">
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">{p.country}</div>
            <h2 className="font-display text-2xl sm:text-3xl text-[var(--brand-primary)] mt-0.5 leading-tight">{p.name}</h2>
            <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
              <MapPin size={11} /> {[p.city, p.state, p.country].filter(Boolean).join(", ")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-semibold ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{p.status}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Member</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-y-2.5 gap-x-5 text-sm mb-4">
          {p.shepherd_name && <div className="flex items-center gap-2"><Star size={13} className="text-[var(--brand-accent)] flex-shrink-0" /><span className="text-[var(--text-secondary)]">Shepherd: <span className="font-medium text-[var(--text-primary)]">{p.shepherd_name}</span></span></div>}
          {p.service_times && <div className="flex items-center gap-2"><Clock size={13} className="text-[var(--brand-accent)] flex-shrink-0" /><span className="text-[var(--text-secondary)]">{p.service_times}</span></div>}
          {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-2 hover:text-[var(--brand-primary)]"><Phone size={13} className="text-[var(--brand-accent)] flex-shrink-0" /><span className="text-[var(--text-secondary)]">{p.phone}</span></a>}
          {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[var(--brand-primary)]"><Globe size={13} className="text-[var(--brand-accent)] flex-shrink-0" /><span className="text-[var(--text-secondary)] truncate">Visit website</span></a>}
        </div>
        {!isActive && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4">
            <AlertCircle size={14} className="flex-shrink-0" /> This parish is currently inactive. Contact your shepherd for updates.
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border-default)]">
          <Link to={`/app/parishes/${p.id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors"><ExternalLink size={12} /> Full Profile</Link>
          {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors"><Phone size={12} /> Call Parish</a>}
          {p.livestream_url && <a href={p.livestream_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent)] hover:text-white transition-colors"><Video size={12} /> Watch Livestream</a>}
        </div>
      </div>
    </div>
  );
}

// ─── Highlights row ───────────────────────────────────────────────────────────
function HighlightsRow({ membership }) {
  const { next_event, recent_posts, recent_prayers, member_count, parish: p } = membership;
  const pills = [
    { icon: Users,          label: "Members",          value: member_count ?? "—", ring: "bg-blue-50 text-blue-600" },
    { icon: MessageSquare,  label: "Posts this week",  value: recent_posts ?? 0,   ring: "bg-indigo-50 text-indigo-600" },
    { icon: Heart,          label: "Prayers this week",value: recent_prayers ?? 0, ring: "bg-rose-50 text-rose-600" },
  ];
  return (
    <div className="space-y-3" data-testid="highlights-row">
      <div className="grid grid-cols-3 gap-3">
        {pills.map(({ icon: Icon, label, value, ring }) => (
          <div key={label} className="card-surface p-4 flex flex-col items-center gap-1.5 text-center">
            <div className={`w-8 h-8 rounded-full ${ring} grid place-items-center`}><Icon size={14} /></div>
            <div className="font-display text-2xl text-[var(--brand-primary)]">{value}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider leading-tight">{label}</div>
          </div>
        ))}
      </div>
      {next_event ? (
        <div className="card-surface p-4 flex items-start gap-3" data-testid="next-event-highlight">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] grid place-items-center flex-shrink-0"><Calendar size={18} className="text-[var(--brand-accent)]" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--brand-accent)] font-semibold">Next Event</div>
            <div className="font-medium text-[var(--brand-primary)] mt-0.5 truncate">{next_event.title}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {next_event.starts_at ? new Date(next_event.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
              {next_event.location && ` · ${next_event.location}`}
            </div>
          </div>
          <Link to="/app/events" className="text-xs text-[var(--brand-accent)] flex-shrink-0 hover:underline flex items-center gap-0.5">All events <ChevronRight size={12} /></Link>
        </div>
      ) : (
        <div className="card-surface p-4 flex items-center gap-3 border-dashed text-sm text-[var(--text-tertiary)]" data-testid="no-events-highlight">
          <Calendar size={14} className="flex-shrink-0" /> No upcoming events scheduled for this parish yet.
        </div>
      )}
    </div>
  );
}

// ─── Quick actions grid ───────────────────────────────────────────────────────
function QuickActionsGrid({ parish, parishId }) {
  const scrollToFeed = () => {};
  return (
    <div data-testid="quick-actions-grid">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-semibold mb-3">Quick access</div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const enabled = action.enabledField ? Boolean(parish?.[action.enabledField]) : (action.kind !== "livestream" || Boolean(parish?.livestream_url));
          let href = action.path || null;
          let external = false;
          if (action.kind === "parish_detail") href = `/app/parishes/${parishId}`;
          if (action.kind === "livestream") { href = parish?.livestream_url || null; external = true; }

          const cls = `flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border text-center transition-all duration-150 ${
            enabled ? "bg-[var(--bg-paper)] border-[var(--border-default)] hover:border-[var(--brand-accent)] hover:shadow-sm cursor-pointer" : "bg-[var(--bg-subtle)] border-[var(--border-default)] opacity-40 cursor-not-allowed"
          }`;
          const inner = (
            <>
              <div className={`w-9 h-9 rounded-lg grid place-items-center ${enabled ? "bg-[var(--bg-subtle)]" : ""}`}>
                <Icon size={18} className={enabled ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)]"} />
              </div>
              <span className="text-xs font-medium leading-tight text-[var(--text-primary)]">{action.label}</span>
              {!enabled && <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Not enabled</span>}
            </>
          );
          if (!enabled) return <div key={action.id} className={cls}>{inner}</div>;
          if (action.kind === "anchor") return <button key={action.id} onClick={() => {}} className={cls} data-testid={`qa-${action.id}`}>{inner}</button>;
          if (external) return <a key={action.id} href={href} target="_blank" rel="noreferrer" className={cls} data-testid={`qa-${action.id}`}>{inner}</a>;
          return <Link key={action.id} to={href} className={cls} data-testid={`qa-${action.id}`}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}

// ─── Comment section ──────────────────────────────────────────────────────────
function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  useEffect(() => { http.get(`/posts/${postId}/comments`).then((r) => setComments(r.data)).catch(() => {}); }, [postId]);
  const submit = async () => {
    if (!text.trim()) return;
    try { const { data } = await http.post(`/posts/${postId}/comments`, { body: text }); setComments([...comments, data]); setText(""); } catch (e) { toast.error(formatErr(e)); }
  };
  return (
    <div className="mt-3 border-t border-[var(--border-default)] pt-3 space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="text-sm" data-testid={`comment-${c.id}`}>
          <span className="font-medium text-[var(--brand-primary)]">{c.user_name}</span>{" "}<span className="text-[var(--text-secondary)]">{c.body}</span>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add a comment…" className="input-clean text-sm flex-1" data-testid={`comment-input-${postId}`} />
        <button onClick={submit} className="btn-primary text-sm px-3" data-testid={`comment-submit-${postId}`}>Send</button>
      </div>
    </div>
  );
}

// ─── Parish feed preview (3 recent posts + CTA) ───────────────────────────────
function ParishFeedPreview({ parishId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!parishId) return;
    setLoading(true);
    http.get("/posts", { params: { scope: "parish", parish_id: parishId } })
      .then((r) => setPosts(r.data.slice(0, 3))).catch(() => {}).finally(() => setLoading(false));
  }, [parishId]);

  return (
    <div className="space-y-3" data-testid="parish-feed-preview">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-semibold">Recent Activity</div>
        <Link to="/app/parish-feed" className="text-xs text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1" data-testid="view-full-feed">
          View Full Feed <ChevronRight size={12} />
        </Link>
      </div>
      {loading && <div className="card-surface h-24 rounded-xl animate-pulse" />}
      {!loading && posts.length === 0 && (
        <div className="card-surface p-5 text-center space-y-2" data-testid="preview-empty">
          <MessageSquare size={18} className="mx-auto text-[var(--text-tertiary)]" />
          <div className="text-sm text-[var(--text-secondary)]">No posts yet. Be the first to share.</div>
          <Link to="/app/parish-feed" className="btn-primary text-sm inline-flex items-center gap-2 px-5 py-2" data-testid="go-to-feed-empty"><Send size={13} /> Open Parish Feed</Link>
        </div>
      )}
      {posts.map((p) => (
        <div key={p.id} className="card-surface p-4 flex items-start gap-3" data-testid={`preview-post-${p.id}`}>
          <div className="w-8 h-8 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-xs font-medium flex-shrink-0 overflow-hidden">
            {p.user_avatar ? <img src={p.user_avatar} alt="" className="w-full h-full object-cover" /> : (p.user_name || "U").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--brand-primary)]">{p.user_name} <span className="text-[var(--text-tertiary)] font-normal">· {new Date(p.created_at).toLocaleDateString()}</span></div>
            <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">{p.body}</p>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 flex-shrink-0"><Heart size={11} /> {p.reactions?.amen || 0}</div>
        </div>
      ))}
      {posts.length > 0 && (
        <Link to="/app/parish-feed" className="card-surface p-3 text-center text-sm text-[var(--brand-accent)] hover:text-[var(--brand-primary)] flex items-center justify-center gap-2 transition-colors" data-testid="go-to-feed-cta">
          <MessageSquare size={14} /> Open Parish Feed
        </Link>
      )}
    </div>
  );
}

// ─── Main dashboard export ────────────────────────────────────────────────────
export default function MyParish() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePid, setActivePid] = useState(null);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    http.get("/me/parish-dashboard")
      .then(({ data }) => {
        setDashboard(data);
        const ids = data.memberships.map((m) => m.parish_id);
        const pref = data.active_parish_id;
        setActivePid(pref && ids.includes(pref) ? pref : ids[0] || null);
      })
      .catch(() => toast.error("Could not load your parish dashboard."))
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDashboard(); }, []);

  const switchParish = async (pid) => {
    setActivePid(pid);
    try { await http.post("/me/active-parish", { parish_id: pid }); } catch {}
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-[var(--bg-subtle)] rounded w-1/3" />
        <div className="card-surface h-48 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((n) => <div key={n} className="card-surface h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <div key={n} className="card-surface h-20 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { memberships, pending, max_memberships } = dashboard;

  // ── State machine ──
  if (memberships.length === 0 && pending.length === 0) return <NoParishState />;
  if (memberships.length === 0) return <PendingOnlyState pending={pending} onRefresh={loadDashboard} />;

  const activeMembership = memberships.find((m) => m.parish_id === activePid) || memberships[0];
  const activeParish = activeMembership?.parish;
  const canJoinMore = memberships.length < max_memberships && (memberships.length + pending.length) < max_memberships;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="my-parish-dashboard">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Parish Home</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)] mt-1">My Parish</h1>
          {user?.name && <p className="text-sm text-[var(--text-secondary)] mt-1">Alleluia, {user.name.split(" ")[0]}. Welcome home.</p>}
        </div>
        {canJoinMore && (
          <Link to="/app/parishes" className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 flex-shrink-0 mt-1">
            <Navigation size={13} /> Join another parish
          </Link>
        )}
      </div>

      {/* Parish Switcher — only when 2 parishes */}
      {memberships.length > 1 && (
        <div className="card-surface p-3 flex items-center gap-3 flex-wrap" data-testid="parish-switcher">
          <span className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Viewing:</span>
          {memberships.map((m) => (
            <button key={m.parish_id} onClick={() => switchParish(m.parish_id)} data-testid={`switch-parish-${m.parish_id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activePid === m.parish_id ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]"}`}>
              {m.parish?.name || m.parish_id}
            </button>
          ))}
          <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">Switch to change parish context</span>
        </div>
      )}

      {/* Hero */}
      {activeParish && <ParishHeroCard membership={activeMembership} />}

      {/* Highlights */}
      {activeMembership && <HighlightsRow membership={activeMembership} />}

      {/* Quick actions */}
      {activeParish && <QuickActionsGrid parish={activeParish} parishId={activeMembership.parish_id} />}

      {/* Parish feed preview → links to /app/parish-feed */}
      {activeMembership?.parish_id && <ParishFeedPreview parishId={activeMembership.parish_id} key={activeMembership.parish_id} />}

      {/* Pending notice (for users with both approved and pending) */}
      {pending.length > 0 && (
        <div className="card-surface p-4 flex items-start gap-3 bg-amber-50 border-amber-200 text-sm text-amber-800" data-testid="pending-notice">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          <span>You also have {pending.length} pending membership request{pending.length > 1 ? "s" : ""} awaiting shepherd approval.</span>
        </div>
      )}
    </div>
  );
}
