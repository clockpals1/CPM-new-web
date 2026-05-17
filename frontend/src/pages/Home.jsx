import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Church, Heart, Users, Calendar, MapPin, ArrowRight,
  Sparkles, Globe, Music, HandHelping, CheckCircle, ChevronRight, MessageCircle,
  Play, Radio, CalendarClock, X, Check, UserPlus, Crown, Trophy, Star,
} from "lucide-react";

// ── Skeleton loader ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-52 rounded-2xl bg-[var(--bg-subtle)]" />
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-[var(--bg-subtle)]" />)}
      </div>
    </div>
  );
}

// ── Getting Started Checklist ─────────────────────────────────────────────
function GettingStartedCard({ user, memberships }) {
  const KEY = "cpm_onboarding_v1";
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(KEY) === "done");

  const steps = [
    {
      id: "parish",
      label: "Join your parish",
      sub: "Connect with your local Celestial family",
      done: memberships.length > 0,
      to: "/app/parishes",
      cta: "Find parish",
    },
    {
      id: "avatar",
      label: "Add a profile photo",
      sub: "Help brethren recognise you",
      done: !!user?.avatar,
      to: "/app/profile",
      cta: "Add photo",
    },
    {
      id: "prayer",
      label: "Post a prayer request",
      sub: "Let the community pray with you",
      done: !!localStorage.getItem("cpm_prayed_v1"),
      to: "/app/prayer",
      cta: "Prayer wall",
    },
    {
      id: "post",
      label: "Share in your parish feed",
      sub: "Say hello or share a thought",
      done: !!localStorage.getItem("cpm_posted_v1"),
      to: "/app/parish-feed",
      cta: "Parish feed",
    },
    {
      id: "testimony",
      label: "Share a testimony",
      sub: "Encourage brethren with your story",
      done: !!localStorage.getItem("cpm_testified_v1"),
      to: "/app/testimonies",
      cta: "Testimonies",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (dismissed || doneCount === steps.length) return null;

  return (
    <div className="card-surface overflow-hidden" data-testid="getting-started-card">
      <div className="h-1.5 bg-[var(--border-default)]">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))" }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl text-[var(--brand-primary)]">Getting started</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {doneCount}/{steps.length} steps &middot;{" "}
              <span className="text-[var(--brand-accent)] font-semibold">{pct}% complete</span>
            </p>
          </div>
          <button
            onClick={() => { localStorage.setItem(KEY, "done"); setDismissed(true); }}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-1">
          {steps.map((s) => (
            <Link
              key={s.id}
              to={s.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                s.done ? "opacity-50" : "hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-subtle)]"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  s.done ? "bg-emerald-500 border-emerald-500" : "border-[var(--border-default)]"
                }`}
              >
                {s.done && <Check size={12} className="text-white" strokeWidth={2.5} />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium leading-tight ${
                    s.done ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {s.label}
                </div>
                {!s.done && (
                  <div className="text-xs text-[var(--text-tertiary)] leading-tight mt-0.5">{s.sub}</div>
                )}
              </div>
              {!s.done && (
                <span className="text-xs font-semibold text-[var(--brand-accent)] shrink-0 whitespace-nowrap">
                  {s.cta} →
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Meet Your Brethren Strip ──────────────────────────────────────────────
function MeetBrethrenStrip({ parish, currentUserId }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!parish?.country) return;
    http
      .get("/members", { params: { country: parish.country, limit: 20 } })
      .then((r) => setMembers(r.data.filter((m) => m.id !== currentUserId).slice(0, 12)))
      .catch(() => {});
  }, [parish, currentUserId]);

  if (members.length === 0) return null;

  return (
    <section data-testid="meet-brethren-strip">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-xl text-[var(--brand-primary)]">Brethren in your region</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Members from {parish.country}</p>
        </div>
        <Link
          to="/app/meet"
          className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0"
        >
          See all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {members.map((m) => (
          <Link
            key={m.id}
            to="/app/meet"
            className="flex flex-col items-center gap-1.5 shrink-0 snap-start w-[72px] group"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-xl font-display ring-2 ring-[var(--bg-paper)] group-hover:ring-[var(--brand-accent)] transition-all shadow-sm">
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(m.name || "?")[0].toUpperCase()}</span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] text-center leading-tight line-clamp-1 font-medium w-full truncate">
              {m.name?.split(" ")[0]}
            </span>
            {m.ccc_rank && (
              <span className="text-[9px] text-[var(--text-tertiary)] text-center leading-tight truncate w-full">
                {m.ccc_rank}
              </span>
            )}
          </Link>
        ))}
        <Link
          to="/app/meet"
          className="flex flex-col items-center justify-center gap-1.5 shrink-0 snap-start w-[72px]"
        >
          <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-[var(--border-default)] grid place-items-center bg-[var(--bg-subtle)] hover:border-[var(--brand-accent)] transition-colors">
            <UserPlus size={20} className="text-[var(--text-tertiary)]" />
          </div>
          <span className="text-[11px] text-[var(--brand-accent)] font-semibold text-center leading-tight">More →</span>
        </Link>
      </div>
    </section>
  );
}

// ── Introduce Yourself Banner ─────────────────────────────────────────────
function IntroduceYourselfBanner({ parish }) {
  const KEY = "cpm_intro_v1";
  const [show, setShow] = useState(() => !localStorage.getItem(KEY));
  const dismiss = () => { localStorage.setItem(KEY, "1"); setShow(false); };
  if (!show || !parish?.name) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--brand-accent)]/30 p-5"
      style={{ background: "linear-gradient(135deg, rgba(197,160,40,0.08) 0%, rgba(197,160,40,0.03) 100%)" }}
      data-testid="introduce-yourself-banner"
    >
      <div
        className="absolute -top-5 -right-5 w-28 h-28 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--brand-accent), transparent)" }}
      />
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-11 h-11 rounded-xl bg-[var(--brand-accent)]/15 grid place-items-center shrink-0 mt-0.5">
          <Sparkles size={20} className="text-[var(--brand-accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--brand-primary)] leading-snug">
            Say hello to{" "}
            <span className="text-[var(--brand-accent)]">{parish.name}</span>!
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Your brethren would love to know you. Post a quick introduction in the parish feed — it only takes a moment.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              to="/app/parish-feed"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold hover:bg-[var(--brand-primary)]/90 transition-colors"
            >
              <MessageCircle size={12} /> Say Hello 👋
            </Link>
            <button
              onClick={dismiss}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CPM Stars Widget ──────────────────────────────────────────────────────
function CpmStarsWidget() {
  const [stars, setStars] = useState([]);
  useEffect(() => {
    http.get("/cpm-stars").then((r) => setStars(r.data)).catch(() => {});
  }, []);
  if (stars.length === 0) return null;
  return (
    <section data-testid="cpm-stars-widget">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <Crown size={15} className="text-[var(--brand-accent)]" />
          <h2 className="font-display text-xl text-[var(--brand-primary)]">CPM Stars</h2>
        </div>
        {stars[0]?.period_label && (
          <span className="text-xs text-[var(--text-tertiary)]">{stars[0].period_label}</span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {stars.map((s) => (
          <div
            key={s.id}
            className="shrink-0 snap-start w-44 relative overflow-hidden rounded-2xl"
            style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
          >
            <div
              className="absolute -top-6 -right-6 w-28 h-28 opacity-15 pointer-events-none rounded-full"
              style={{ background: "radial-gradient(circle, #C5A028, transparent)" }}
            />
            <div className="relative p-4 flex flex-col items-center text-center gap-2.5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 grid place-items-center ring-2 ring-[var(--brand-accent)]/60 shadow-lg">
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.member_name} className="w-full h-full object-cover" />
                  : <span className="text-3xl font-display text-white">{(s.member_name || "?")[0]}</span>}
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-[var(--brand-accent)] font-bold mb-0.5">
                  {s.period === "week" ? "⭐ Star of the Week" : "🌟 Star of the Month"}
                </div>
                <div className="text-sm font-semibold text-white leading-tight">{s.member_name}</div>
                <div className="text-[11px] text-white/70 mt-0.5 leading-tight line-clamp-2">{s.award}</div>
              </div>
              {s.description && (
                <div className="text-[10px] text-white/50 leading-tight line-clamp-2">{s.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Active Contests Widget ────────────────────────────────────────────────
function ActiveContestsWidget() {
  const [contests, setContests] = useState([]);
  useEffect(() => {
    http.get("/contests", { params: { status: "active" } })
      .then((r) => setContests(r.data.slice(0, 3)))
      .catch(() => {});
  }, []);
  if (contests.length === 0) return null;
  const ICON = { photo: "📸", video: "🎬", verse: "📖", testimony: "✨" };
  const diff = (endAt) => {
    const d = new Date(endAt) - Date.now();
    if (d <= 0) return "Ended";
    const days = Math.floor(d / 86400000);
    const hrs = Math.floor((d % 86400000) / 3600000);
    return days > 0 ? `${days}d left` : `${hrs}h left`;
  };
  return (
    <section data-testid="active-contests-widget">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <Trophy size={15} className="text-[var(--brand-accent)]" />
          <h2 className="font-display text-xl text-[var(--brand-primary)]">Active Contests</h2>
        </div>
        <Link to="/app/contests" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="space-y-2">
        {contests.map((c) => (
          <Link
            key={c.id}
            to="/app/contests"
            className="card-surface p-4 flex items-center gap-3 group hover:border-[var(--brand-accent)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-accent)]/10 grid place-items-center shrink-0 text-xl">
              {ICON[c.type] || "🏆"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--brand-primary)] truncate leading-tight">{c.title}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {c.prize && <span className="text-xs text-[var(--brand-accent)] truncate font-medium">🏆 {c.prize}</span>}
                <span className="text-xs text-[var(--text-tertiary)]">{diff(c.end_at)}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--brand-accent)] shrink-0 group-hover:translate-x-0.5 transition-transform">
              Enter →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Live Parish Feed Preview ──────────────────────────────────────────────
function LiveParishFeedPreview({ parishId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!parishId) return;
    http.get("/posts", { params: { scope: "parish", parish_id: parishId } })
      .then((r) => setPosts(r.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [parishId]);
  return (
    <section data-testid="live-feed-preview">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <h2 className="font-display text-xl text-[var(--brand-primary)]">Parish Feed</h2>
        </div>
        <Link to="/app/parish-feed" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0">
          Open feed <ArrowRight size={13} />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => <div key={n} className="card-surface h-[72px]" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card-surface p-6 text-center space-y-2">
          <MessageCircle size={20} className="mx-auto text-[var(--text-tertiary)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">The feed is quiet — be the first to post!</p>
          <Link to="/app/parish-feed" className="text-xs text-[var(--brand-accent)] font-semibold hover:underline">
            Open Parish Feed →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              to="/app/parish-feed"
              className="card-surface p-4 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-display shrink-0">
                {post.user_avatar
                  ? <img src={post.user_avatar} alt="" className="w-full h-full object-cover" />
                  : (post.user_name || "?")?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--brand-primary)] truncate">{post.user_name}</span>
                  <span className="text-xs text-[var(--text-tertiary)] shrink-0">
                    {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {post.body && (
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">{post.body}</p>
                )}
                {post.media_urls?.length > 0 && (
                  <span className="text-xs text-[var(--text-tertiary)] mt-0.5 inline-block">
                    📎 {post.media_urls.length} attachment{post.media_urls.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <ChevronRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-accent)] shrink-0 mt-1 transition-colors" />
            </Link>
          ))}
          <Link
            to="/app/parish-feed"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[var(--border-default)] text-sm text-[var(--brand-accent)] font-semibold hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5 transition-colors"
          >
            <MessageCircle size={14} /> See all parish posts
          </Link>
        </div>
      )}
    </section>
  );
}

// ── No-parish Discovery State ─────────────────────────────────────────────
function DiscoveryState({ user, prayers, stats }) {
  return (
    <div className="max-w-6xl mx-auto space-y-7" data-testid="home-discovery">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
      >
        <div
          className="absolute top-0 right-0 w-72 h-72 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #C5A028 0%, transparent 70%)", transform: "translate(25%,-25%)" }}
        />
        <div className="relative px-7 py-10 md:px-12 md:py-14">
          <div className="inline-block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)] bg-white/10 px-3 py-1 rounded-full mb-5">
            Alleluia — Peace be with you
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white leading-snug">
            Welcome, {user?.name?.split(" ")[0] || "beloved"}.<br />
            <span className="text-[var(--brand-accent)]">Find your parish home.</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-lg text-base leading-relaxed">
            You're part of the worldwide Celestial family. Start by joining your parish —
            it's free, instant, and opens up your parish feed, prayer wall, events, and more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/app/parishes"
              className="btn-accent inline-flex items-center gap-2"
              data-testid="discovery-find-parish"
            >
              Find My Parish <ArrowRight size={16} />
            </Link>
            <Link
              to="/app/feed"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-white/20 text-white text-sm hover:bg-white/10 transition-colors"
            >
              Explore Community
            </Link>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            n: "01", icon: MapPin, title: "Find your parish",
            desc: "Search thousands of CCC parishes worldwide by country or city.",
            link: "/app/parishes", cta: "Search parishes",
          },
          {
            n: "02", icon: Church, title: "Join instantly",
            desc: "Open parishes have instant membership — no waiting, no approval needed.",
            link: "/app/parishes", cta: "Join a parish",
          },
          {
            n: "03", icon: Sparkles, title: "Connect & serve",
            desc: "Access parish feed, prayer wall, events, choir, and service teams.",
            link: "/app/feed", cta: "Explore",
          },
        ].map(({ n, icon: Icon, title, desc, link, cta }) => (
          <div key={n} className="card-surface p-6" data-testid={`step-${n}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-accent)]/10 grid place-items-center">
                <Icon size={18} className="text-[var(--brand-accent)]" />
              </div>
              <span className="font-display text-3xl text-[var(--border-default)] select-none">{n}</span>
            </div>
            <h3 className="font-display text-xl text-[var(--brand-primary)] mb-2">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{desc}</p>
            <Link
              to={link}
              className="text-xs font-semibold text-[var(--brand-accent)] inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              {cta} <ChevronRight size={13} />
            </Link>
          </div>
        ))}
      </div>

      {/* Community stats */}
      {Object.keys(stats).length > 0 && (
        <div className="card-surface p-6">
          <h2 className="font-display text-xl text-[var(--brand-primary)] mb-5">Your community, worldwide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Parishes", v: stats.parishes ?? "–", icon: Church },
              { label: "Members", v: stats.members ?? "–", icon: Users },
              { label: "Prayers", v: stats.prayers ?? "–", icon: Heart },
              { label: "Events", v: stats.events ?? "–", icon: Calendar },
            ].map(({ label, v, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] grid place-items-center">
                  <Icon size={17} className="text-[var(--brand-primary)]" />
                </div>
                <div>
                  <div className="font-display text-2xl text-[var(--brand-primary)]">{v}</div>
                  <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live prayers preview */}
      {prayers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-[var(--brand-primary)]">Brethren are praying</h2>
            <Link to="/app/prayer" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1">
              Prayer wall <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {prayers.map((p) => (
              <div key={p.id} className="card-surface p-4" data-testid={`discovery-prayer-${p.id}`}>
                <div className="flex items-start gap-2">
                  <Heart size={13} className="text-[var(--brand-accent)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[var(--brand-primary)] line-clamp-1">{p.title}</div>
                    <div className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">{p.body}</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1.5">{p.user_name} · {p.prayed_count || 0} prayed</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Engagement Rail ──────────────────────────────────────────────────────
function EngagementRail() {
  const [engagement, setEngagement] = useState(null);
  useEffect(() => {
    http.get("/me/engagement").then((r) => setEngagement(r.data)).catch(() => {});
  }, []);
  if (!engagement) return null;
  const { live_now = [], next_rehearsal, upcoming_events = [] } = engagement;
  const nextEvent = upcoming_events[0];
  const hasContent = live_now.length > 0 || next_rehearsal || nextEvent;
  if (!hasContent) return null;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="engagement-rail">
      {/* Live Now */}
      {live_now.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }} data-testid="home-live-now">
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 grid place-items-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/80 text-[10px] uppercase tracking-widest font-semibold">Live Now</div>
              <div className="text-white text-sm font-medium truncate mt-0.5">{live_now[0].title}</div>
              <Link to="/app/events" className="mt-2 inline-flex items-center gap-1 text-white/80 text-xs hover:text-white">
                <Play size={10} /> Watch <ChevronRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* Next rehearsal */}
      {next_rehearsal && (
        <div className="card-surface border-l-4 border-[var(--brand-accent)]" data-testid="home-next-rehearsal">
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--brand-accent)]/10 grid place-items-center shrink-0">
              <CalendarClock size={17} className="text-[var(--brand-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--brand-accent)]">Next Rehearsal</div>
              <div className="text-sm font-medium text-[var(--brand-primary)] truncate mt-0.5">{next_rehearsal.title}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {new Date(next_rehearsal.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Next event */}
      {nextEvent && (
        <div className="card-surface border-l-4 border-emerald-400" data-testid="home-next-event">
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
              <Calendar size={17} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-emerald-700">Up Next</div>
              <div className="text-sm font-medium text-[var(--brand-primary)] truncate mt-0.5">{nextEvent.title}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {new Date(nextEvent.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <Link to="/app/events" className="text-xs text-emerald-600 hover:underline mt-1 inline-flex items-center gap-0.5">View all <ChevronRight size={10} /></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parish Dashboard (1 or 2+ parishes) ──────────────────────────────────
function ParishDashboard({ user, memberships, prayers, events, stats }) {
  const active = memberships[0];
  const p = active?.parish || {};

  return (
    <div className="max-w-6xl mx-auto space-y-7" data-testid="home-parish-dashboard">
      {/* Parish header card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--border-default)]"
        style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
      >
        <div
          className="absolute top-0 right-0 w-56 h-56 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #C5A028, transparent)", transform: "translate(25%,-25%)" }}
        />
        <div className="relative px-7 py-8 md:px-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-2">
                Alleluia, {user?.name?.split(" ")[0] || "beloved"}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl text-white">{p.name || "My Parish"}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-white/60 text-sm">
                <MapPin size={13} />
                <span>{p.city}{p.country ? `, ${p.country}` : ""}</span>
                {p.shepherd_name && (
                  <><span className="opacity-40">·</span><span>Shep. {p.shepherd_name}</span></>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <CheckCircle size={14} className="text-[var(--brand-accent)]" />
              <span className="text-xs text-white/80 font-medium">Active member</span>
            </div>
          </div>
          {/* Quick-action pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { to: "/app/parish-feed", label: "Parish Feed", icon: MessageCircle },
              { to: "/app/prayer", label: "Prayer", icon: Heart },
              { to: "/app/events", label: "Events", icon: Calendar },
              { to: "/app/choir", label: "Choir", icon: Music },
              { to: "/app/service", label: "Service", icon: HandHelping },
              { to: "/app/my-parish", label: "Full Dashboard", icon: Sparkles },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                <Icon size={12} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CPM Stars of the Week/Month */}
      <CpmStarsWidget />

      {/* 🔴 Live Parish Feed — most engaging, shown first */}
      <LiveParishFeedPreview parishId={active?.parish_id} />

      {/* Active Contests */}
      <ActiveContestsWidget />

      {/* Engagement rail */}
      <EngagementRail />

      {/* Meet Brethren */}
      <MeetBrethrenStrip parish={p} currentUserId={user?.id} />

      {/* Parish switcher for 2 parishes */}
      {memberships.length > 1 && (
        <div className="card-surface p-5" data-testid="parish-switcher">
          <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Your parishes</div>
          <div className="grid grid-cols-2 gap-3">
            {memberships.map((m, i) => (
              <Link
                key={m.id}
                to="/app/my-parish"
                className={`p-4 rounded-xl border text-sm transition-colors ${
                  i === 0
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/5"
                    : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                }`}
              >
                <div className="font-medium text-[var(--brand-primary)] line-clamp-1">{m.parish?.name || "Parish"}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{m.parish?.city}</div>
                {i === 0 && (
                  <div className="text-[10px] text-[var(--brand-accent)] mt-1.5 font-semibold uppercase tracking-wider">Active</div>
                )}
              </Link>
            ))}
          </div>
          <Link to="/app/my-parish" className="mt-3 text-xs text-[var(--brand-accent)] inline-flex items-center gap-1">
            Manage parishes <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* Events + Prayers compact grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-[var(--brand-primary)]">Upcoming Events</h2>
            <Link to="/app/events" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1">
              All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="card-surface p-4 text-sm text-[var(--text-secondary)]">
                No events yet. <Link to="/app/events" className="text-[var(--brand-accent)] hover:underline">Check events →</Link>
              </div>
            ) : events.slice(0, 3).map((ev) => (
              <Link key={ev.id} to="/app/events" className="card-surface p-3 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors" data-testid={`home-event-${ev.id}`}>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
                  <Calendar size={15} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--brand-primary)] truncate">{ev.title}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {new Date(ev.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-[var(--brand-primary)]">Prayer Wall</h2>
            <Link to="/app/prayer" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1">
              All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {prayers.length === 0 ? (
              <div className="card-surface p-4 text-sm text-[var(--text-secondary)]">
                <Link to="/app/prayer" className="text-[var(--brand-accent)] hover:underline">Post a prayer request →</Link>
              </div>
            ) : prayers.slice(0, 3).map((pr) => (
              <Link key={pr.id} to="/app/prayer" className="card-surface p-3 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors" data-testid={`home-prayer-${pr.id}`}>
                <Heart size={13} className="text-[var(--brand-accent)] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--brand-primary)] line-clamp-1">{pr.title}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{pr.user_name} · {pr.prayed_count || 0} prayed</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Onboarding — shown only for new/incomplete users at the bottom */}
      <IntroduceYourselfBanner parish={p} />
      <GettingStartedCard user={user} memberships={memberships} />
    </div>
  );
}

// ── Root export — fetches data, branches on parish state ──────────────────
export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      http.get("/stats/home").then((r) => setStats(r.data)).catch(() => {}),
      http.get("/me/memberships").then((r) => setMemberships(r.data)).catch(() => {}),
      http.get("/prayers", { params: { scope: "global" } }).then((r) => setPrayers(r.data.slice(0, 4))).catch(() => {}),
      http.get("/events").then((r) => setEvents(r.data.slice(0, 4))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  if (memberships.length === 0) {
    return <DiscoveryState user={user} prayers={prayers} stats={stats} />;
  }

  return (
    <ParishDashboard
      user={user}
      memberships={memberships}
      prayers={prayers}
      events={events}
      stats={stats}
    />
  );
}
