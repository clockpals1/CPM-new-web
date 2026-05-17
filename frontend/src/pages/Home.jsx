import React, { useEffect, useState, useMemo } from "react";
import { http } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Church, Heart, Users, Calendar, MapPin, ArrowRight,
  Sparkles, Globe, Music, HandHelping, CheckCircle, ChevronRight, MessageCircle,
  Play, Radio, CalendarClock, X, Check, UserPlus, Crown, Trophy, Star,
  Flame, BookOpen, Zap,
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

// ── Daily content data ────────────────────────────────────────────────────
const SCRIPTURES = [
  { ref: "Psalm 46:1",       text: "God is our refuge and strength, a very present help in trouble." },
  { ref: "Isaiah 40:31",     text: "They that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles." },
  { ref: "John 3:16",        text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { ref: "Proverbs 3:5-6",   text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
  { ref: "Romans 8:28",      text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { ref: "Jeremiah 29:11",   text: "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end." },
  { ref: "Psalm 23:1",       text: "The Lord is my shepherd; I shall not want." },
  { ref: "Matthew 6:33",     text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { ref: "Psalm 121:2",      text: "My help cometh from the Lord, which made heaven and earth." },
  { ref: "2 Chronicles 7:14",text: "If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven." },
  { ref: "Isaiah 41:10",     text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee." },
  { ref: "Psalm 34:18",      text: "The Lord is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit." },
  { ref: "Matthew 11:28",    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { ref: "Psalm 91:1",       text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty." },
  { ref: "Joshua 1:9",       text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest." },
  { ref: "Revelation 21:4",  text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain." },
  { ref: "Hebrews 11:1",     text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { ref: "1 John 4:4",       text: "Ye are of God, little children, and have overcome them: because greater is he that is in you, than he that is in the world." },
  { ref: "Psalm 37:4",       text: "Delight thyself also in the Lord: and he shall give thee the desires of thine heart." },
  { ref: "Romans 8:1",       text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit." },
  { ref: "Lamentations 3:22-23", text: "It is of the Lord's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness." },
  { ref: "Psalm 27:1",       text: "The Lord is my light and my salvation; whom shall I fear? the Lord is the strength of my life; of whom shall I be afraid?" },
  { ref: "Philippians 4:6-7",text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God." },
  { ref: "Galatians 5:22-23",text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance." },
  { ref: "Isaiah 26:3",      text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee." },
  { ref: "Psalm 103:1",      text: "Bless the Lord, O my soul: and all that is within me, bless his holy name." },
  { ref: "John 16:33",       text: "These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world." },
  { ref: "1 Peter 5:7",      text: "Casting all your care upon him; for he careth for you." },
  { ref: "Deuteronomy 31:6", text: "Be strong and of a good courage, fear not, nor be afraid of them: for the Lord thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee." },
  { ref: "James 1:5",        text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him." },
  { ref: "Psalm 46:10",      text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { ref: "2 Corinthians 5:17",text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
  { ref: "Ezekiel 36:26",    text: "A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh." },
  { ref: "Proverbs 18:10",   text: "The name of the Lord is a strong tower: the righteous runneth into it, and is safe." },
  { ref: "Matthew 5:16",     text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { ref: "Psalm 150:6",      text: "Let every thing that hath breath praise the Lord. Praise ye the Lord." },
  { ref: "Acts 1:8",         text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me." },
  { ref: "Isaiah 55:11",     text: "So shall my word be that goeth forth out of my mouth: it shall not return unto me void, but it shall accomplish that which I please." },
  { ref: "Romans 10:17",     text: "So then faith cometh by hearing, and hearing by the word of God." },
  { ref: "Psalm 133:1",      text: "Behold, how good and how pleasant it is for brethren to dwell together in unity!" },
  { ref: "Hebrews 10:25",    text: "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching." },
  { ref: "1 Thessalonians 5:17", text: "Pray without ceasing." },
  { ref: "Colossians 3:16",  text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord." },
  { ref: "Ephesians 6:18",   text: "Praying always with all prayer and supplication in the Spirit, and watching thereunto with all perseverance and supplication for all saints." },
  { ref: "Malachi 3:10",     text: "Prove me now herewith, saith the Lord of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall not be room enough to receive it." },
  { ref: "Psalm 118:24",     text: "This is the day which the Lord hath made; we will rejoice and be glad in it." },
];

const DAY_OCCASIONS = [
  { label: "Sabbath day of the Lord ✝️", color: "text-amber-300" },        // Sunday
  { label: "New week — God goes before you 🌅", color: "text-blue-300" },   // Monday
  { label: "Press forward in His grace 🙏", color: "text-purple-300" },     // Tuesday
  { label: "Mid-week — renew your strength 💪", color: "text-emerald-300" },// Wednesday
  { label: "Give thanks in all things 🌿", color: "text-teal-300" },        // Thursday
  { label: "Preparation and reflection ✨", color: "text-rose-300" },       // Friday
  { label: "Rest and prepare your heart 🕊️", color: "text-indigo-300" },   // Saturday
];

const DAILY_CHALLENGES = [
  { emoji: "🙏", text: "Pray for 2 brethren today",            to: "/app/prayer",       cta: "Go to Prayer Wall" },
  { emoji: "📖", text: "Share a scripture in your feed",        to: "/app/parish-feed",  cta: "Open Parish Feed" },
  { emoji: "❤️", text: "Say Amen on 3 prayer requests",         to: "/app/prayer",       cta: "Visit Prayer Wall" },
  { emoji: "💬", text: "Encourage a fellow parishioner",         to: "/app/messages",     cta: "Send a Message" },
  { emoji: "✨", text: "Share a testimony of God's goodness",   to: "/app/testimonies",  cta: "Post Testimony" },
  { emoji: "📣", text: "Invite a family member to join CPM",    to: "/app/meet",         cta: "Find Brethren" },
  { emoji: "🎵", text: "Listen to a CCC hymn today",            to: "/app/music",        cta: "Open CPM Wave" },
];

// ── Daily Moment Card — personal, fresh every day ─────────────────────────
function DailyMomentCard({ user, parish }) {
  const streak = useMemo(() => {
    const today = new Date().toDateString();
    const last = localStorage.getItem("cpm_last_visit");
    const s = parseInt(localStorage.getItem("cpm_streak_v1") || "0");
    if (last === today) return Math.max(s, 1);
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const ns = last === yesterday ? s + 1 : 1;
    localStorage.setItem("cpm_last_visit", today);
    localStorage.setItem("cpm_streak_v1", String(ns));
    return ns;
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still watching? 🌙" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "Beloved").split(" ")[0];

  const dayOfWeek = new Date().getDay();
  const occasion = DAY_OCCASIONS[dayOfWeek];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const scripture = SCRIPTURES[dayOfYear % SCRIPTURES.length];
  const challenge = DAILY_CHALLENGES[dayOfWeek];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
      data-testid="daily-moment-card"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 opacity-15 pointer-events-none rounded-full"
        style={{ background: "radial-gradient(circle, #C5A028, transparent)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-56 h-56 opacity-8 pointer-events-none rounded-full"
        style={{ background: "radial-gradient(circle, #4F6BB0, transparent)" }}
      />

      <div className="relative px-6 py-7 md:px-8 md:py-8 space-y-5">
        {/* Row 1: Greeting + streak */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-1 font-semibold">{greeting}</div>
            <h1 className="font-display text-[2.4rem] text-white leading-tight">{firstName}</h1>
            <div className={`text-base mt-1 font-semibold ${occasion.color}`}>{occasion.label}</div>
          </div>
          <div className="shrink-0 flex flex-col items-center bg-[var(--brand-accent)]/15 border border-[var(--brand-accent)]/30 rounded-2xl px-4 py-3 min-w-[60px]">
            <Flame size={18} className="text-[var(--brand-accent)]" />
            <span className="text-[var(--brand-accent)] font-display text-2xl leading-none mt-0.5">{streak}</span>
            <span className="text-xs text-white/50 uppercase tracking-wide mt-0.5">day{streak !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Row 2: Daily scripture */}
        <div className="bg-white/6 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={13} className="text-[var(--brand-accent)]" />
            <span className="text-xs uppercase tracking-widest text-[var(--brand-accent)] font-bold">Today's Scripture</span>
          </div>
          <p className="text-white/90 text-base leading-relaxed italic">"{scripture.text}"</p>
          <div className="text-[var(--brand-accent)] text-sm mt-2 font-bold">— {scripture.ref}</div>
        </div>

        {/* Row 3: Daily challenge pill */}
        <Link
          to={challenge.to}
          className="flex items-center gap-3 bg-[var(--brand-accent)]/12 active:bg-[var(--brand-accent)]/25 border border-[var(--brand-accent)]/25 rounded-xl px-4 py-3 transition-colors group"
        >
          <span className="text-2xl shrink-0">{challenge.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-[var(--brand-accent)] font-bold mb-0.5">Today's nudge</div>
            <div className="text-white/90 text-base font-semibold truncate">{challenge.text}</div>
          </div>
          <ChevronRight size={16} className="text-[var(--brand-accent)]/70 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Row 4: Parish label + quick-action icon row */}
        <div className="space-y-2 pt-1">
          <div className="text-xs text-white/40 truncate">
            {parish?.name || "My Parish"}{parish?.city ? ` · ${parish.city}` : ""}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { to: "/app/parish-feed", Icon: MessageCircle, label: "Feed" },
              { to: "/app/prayer",      Icon: Heart,         label: "Pray" },
              { to: "/app/events",      Icon: Calendar,      label: "Events" },
              { to: "/app/contests",    Icon: Trophy,        label: "Contest" },
              { to: "/app/music",       Icon: Music,         label: "Hymns" },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-white/10 active:bg-white/25 text-white transition-colors"
              >
                <Icon size={18} />
                <span className="text-xs font-semibold opacity-90">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick Amen Strip — instant community intercession from Home ────────────
function QuickAmenStrip() {
  const [prayers, setPrayers] = useState([]);
  const [amened, setAmened] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cpm_amened_home_v1") || "{}"); }
    catch { return {}; }
  });
  const [flash, setFlash] = useState({});

  useEffect(() => {
    http.get("/prayers", { params: { scope: "global" } })
      .then((r) => setPrayers(r.data.slice(0, 4)))
      .catch(() => {});
  }, []);

  if (prayers.length === 0) return null;

  const sendAmen = async (p) => {
    if (amened[p.id]) return;
    try {
      await http.post(`/prayers/${p.id}/prayed`);
      const next = { ...amened, [p.id]: true };
      setAmened(next);
      localStorage.setItem("cpm_amened_home_v1", JSON.stringify(next));
      localStorage.setItem("cpm_prayed_v1", "1");
      setFlash((f) => ({ ...f, [p.id]: true }));
      setTimeout(() => setFlash((f) => ({ ...f, [p.id]: false })), 1600);
    } catch {}
  };

  return (
    <section data-testid="quick-amen-strip">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">Brethren Need Your Amen</h2>
        </div>
        <Link to="/app/prayer" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0">
          Full wall <ArrowRight size={13} />
        </Link>
      </div>
      <div className="space-y-2">
        {prayers.map((p) => {
          const done = !!amened[p.id];
          const showing = !!flash[p.id];
          return (
            <div
              key={p.id}
              className={`card-surface p-4 flex items-center gap-3 transition-all ${done ? "border-rose-100" : ""}`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-display shrink-0">
                {p.user_avatar
                  ? <img src={p.user_avatar} alt="" className="w-full h-full object-cover" />
                  : (p.user_name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[var(--brand-primary)] line-clamp-1 leading-snug">{p.title}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{p.user_name} · {p.prayed_count || 0} praying</div>
              </div>
              <button
                onClick={() => sendAmen(p)}
                disabled={done}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold min-h-[44px] transition-all active:scale-95 ${
                  showing
                    ? "bg-rose-500 text-white scale-105"
                    : done
                      ? "bg-rose-50 text-rose-500 border border-rose-200"
                      : "border-2 border-rose-300 text-rose-600 active:bg-rose-50"
                }`}
              >
                <Heart size={13} className={done ? "fill-current" : ""} />
                {showing ? "Amen! 🙏" : done ? "Praying" : "Amen"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
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
            <h3 className="font-display text-2xl text-[var(--brand-primary)]">Getting started</h3>
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">Brethren in your region</h2>
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
            <span className="text-xs text-[var(--text-secondary)] text-center leading-tight line-clamp-1 font-medium w-full truncate">
              {m.name?.split(" ")[0]}
            </span>
            {m.ccc_rank && (
              <span className="text-xs text-[var(--text-tertiary)] text-center leading-tight truncate w-full">
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
          <span className="text-xs text-[var(--brand-accent)] font-semibold text-center leading-tight">More →</span>
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
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <Crown size={18} className="text-[var(--brand-accent)]" />
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">CPM Stars</h2>
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
                <div className="text-xs uppercase tracking-widest text-[var(--brand-accent)] font-bold mb-0.5">
                  {s.period === "week" ? "⭐ Star of the Week" : "🌟 Star of the Month"}
                </div>
                <div className="text-sm font-semibold text-white leading-tight">{s.member_name}</div>
                <div className="text-xs text-white/70 mt-0.5 leading-tight line-clamp-2">{s.award}</div>
              </div>
              {s.description && (
                <div className="text-xs text-white/50 leading-tight line-clamp-2">{s.description}</div>
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
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <Trophy size={18} className="text-[var(--brand-accent)]" />
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">Active Contests</h2>
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
              <div className="text-base font-semibold text-[var(--brand-primary)] truncate leading-tight">{c.title}</div>
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

// ── Global Pulse Strip — clean post-preview cards ────────────────────────
function GlobalPulseStrip() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    http.get("/posts", { params: { scope: "global" } })
      .then((r) => setPosts(r.data.slice(0, 8)))
      .catch(() => {});
  }, []);
  if (posts.length === 0) return null;

  const timeAgo = (iso) => {
    const d = (Date.now() - new Date(iso)) / 1000;
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}d`;
  };

  return (
    <section data-testid="global-pulse-strip">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <Globe size={18} className="text-[var(--brand-accent)]" />
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">CCC Worldwide</h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <Link to="/app/feed" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0">
          Full feed <ArrowRight size={13} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {posts.map((post) => (
          <Link
            key={post.id}
            to="/app/feed"
            className="shrink-0 snap-start w-72 card-surface flex flex-col gap-3 p-4 group hover:border-[var(--brand-accent)] transition-colors"
          >
            {/* Header row */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-display shrink-0 ring-2 ring-[var(--brand-accent)]/20">
                {post.user_avatar
                  ? <img src={post.user_avatar} alt="" className="w-full h-full object-cover" />
                  : (post.user_name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--brand-primary)] truncate leading-tight">{post.user_name}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{timeAgo(post.created_at)} ago</div>
              </div>
            </div>

            {/* Parish location badge */}
            {post.parish_name && (
              <div className="inline-flex items-center gap-1 w-fit px-2 py-1 rounded-full bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 text-xs text-[var(--brand-accent)] font-semibold">
                <MapPin size={10} />{post.parish_name}
              </div>
            )}

            {/* Body */}
            {post.body && (
              <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed flex-1">{post.body}</p>
            )}

            {/* Media thumbnail */}
            {post.media_urls?.[0] && (
              <div className="rounded-xl overflow-hidden h-28 bg-[var(--bg-subtle)] shrink-0">
                <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)] mt-auto">
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <Heart size={11} className="text-rose-400" />
                {post.amen_count || post.reactions?.amen || 0} Amen
              </span>
              <span className="text-xs text-[var(--brand-accent)] font-semibold group-hover:underline">
                Read more →
              </span>
            </div>
          </Link>
        ))}

        {/* See all portal */}
        <Link
          to="/app/feed"
          className="shrink-0 snap-start w-40 rounded-2xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)] hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5 transition-all group"
          style={{ minHeight: "160px" }}
        >
          <div className="w-11 h-11 rounded-full bg-[var(--bg-subtle)] grid place-items-center group-hover:bg-[var(--brand-accent)]/15 transition-colors">
            <Globe size={20} className="text-[var(--brand-accent)]" />
          </div>
          <div className="text-center px-3">
            <div className="text-xs font-bold text-[var(--brand-primary)]">See all</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">worldwide posts</div>
          </div>
        </Link>
      </div>
    </section>
  );
}

// ── Unified Feed Preview — tabbed Parish ↔ Worldwide ──────────────────────
function UnifiedFeedPreview({ parishId }) {
  const [activeTab, setActiveTab] = useState("parish");
  const [parishPosts, setParishPosts] = useState([]);
  const [globalPosts, setGlobalPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reqs = [
      http.get("/posts", { params: { scope: "global" } }).then((r) => setGlobalPosts(r.data.slice(0, 6))).catch(() => {}),
    ];
    if (parishId) {
      reqs.push(
        http.get("/posts", { params: { scope: "parish", parish_id: parishId } }).then((r) => setParishPosts(r.data.slice(0, 6))).catch(() => {})
      );
    }
    Promise.all(reqs).finally(() => setLoading(false));
  }, [parishId]);

  const posts = activeTab === "parish" ? parishPosts : globalPosts;
  const linkTo = activeTab === "parish" ? "/app/parish-feed" : "/app/feed";
  const emptyMsg = activeTab === "parish" ? "Your parish feed is quiet — post something!" : "No global posts yet — be the first!";
  const ctaLabel = activeTab === "parish" ? "Open Parish Feed" : "Open Global Feed";
  const FooterIcon = activeTab === "parish" ? MessageCircle : Globe;

  return (
    <section data-testid="unified-feed-preview">
      {/* Tab header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-xl p-1">
          {[
            { k: "parish",  label: "My Parish",  Icon: MessageCircle },
            { k: "global",  label: "Worldwide",   Icon: Globe },
          ].map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === k
                  ? "bg-[var(--bg-paper)] text-[var(--brand-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <Link to={linkTo} className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1 shrink-0">
          See all <ArrowRight size={13} />
        </Link>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
          {activeTab === "parish" ? "Live from your parish" : "Live from CCC worldwide"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((n) => <div key={n} className="card-surface h-[72px]" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card-surface p-6 text-center space-y-2">
          <FooterIcon size={20} className="mx-auto text-[var(--text-tertiary)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">{emptyMsg}</p>
          <Link to={linkTo} className="text-xs text-[var(--brand-accent)] font-semibold hover:underline">{ctaLabel} →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={linkTo}
              className="card-surface p-4 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-display shrink-0">
                {post.user_avatar
                  ? <img src={post.user_avatar} alt="" className="w-full h-full object-cover" />
                  : (post.user_name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--brand-primary)] truncate">{post.user_name}</span>
                  {activeTab === "global" && post.parish_name && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-tertiary)] border border-[var(--border-default)] truncate max-w-[130px]">
                      📍 {post.parish_name}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-tertiary)] shrink-0 ml-auto">
                    {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {post.body && (
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">{post.body}</p>
                )}
                {post.media_urls?.length > 0 && (
                  <span className="text-xs text-[var(--text-tertiary)] mt-0.5 inline-block">
                    📎 {post.media_urls.length} file{post.media_urls.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <ChevronRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-accent)] shrink-0 mt-1 transition-colors" />
            </Link>
          ))}
          <Link
            to={linkTo}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[var(--border-default)] text-sm text-[var(--brand-accent)] font-semibold hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5 transition-colors"
          >
            <FooterIcon size={14} /> {ctaLabel}
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
            <h3 className="font-display text-2xl text-[var(--brand-primary)] mb-2">{title}</h3>
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
          <h2 className="font-display text-2xl text-[var(--brand-primary)] mb-5">Your community, worldwide</h2>
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
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Brethren are praying</h2>
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
              <div className="text-white/80 text-xs uppercase tracking-widest font-semibold">Live Now</div>
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
              <div className="text-xs uppercase tracking-widest font-semibold text-[var(--brand-accent)]">Next Rehearsal</div>
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
              <div className="text-xs uppercase tracking-widest font-semibold text-emerald-700">Up Next</div>
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
    <div className="max-w-2xl mx-auto space-y-7 overflow-x-hidden" data-testid="home-parish-dashboard">

      {/* ① Daily Moment — fresh every single day */}
      <DailyMomentCard user={user} parish={p} />

      {/* ② CPM Stars — celebration & recognition */}
      <CpmStarsWidget />

      {/* ③ Quick Amen — intercede for brethren without leaving home */}
      <QuickAmenStrip />

      {/* ④ CCC Worldwide — story-style global pulse */}
      <GlobalPulseStrip />

      {/* ⑤ Unified Feed — tabbed Parish ↔ Worldwide */}
      <UnifiedFeedPreview parishId={active?.parish_id} />

      {/* ⑥ Active Contests */}
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
                  <div className="text-xs text-[var(--brand-accent)] mt-1.5 font-semibold uppercase tracking-wider">Active</div>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Upcoming Events</h2>
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
              <Link key={ev.id} to="/app/events" className="card-surface p-4 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors" data-testid={`home-event-${ev.id}`}>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
                  <Calendar size={15} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-[var(--brand-primary)] truncate">{ev.title}</div>
                  <div className="text-sm text-[var(--text-tertiary)] mt-0.5">
                    {new Date(ev.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Prayer Wall</h2>
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
              <Link key={pr.id} to="/app/prayer" className="card-surface p-4 flex items-start gap-3 group hover:border-[var(--brand-accent)] transition-colors" data-testid={`home-prayer-${pr.id}`}>
                <Heart size={13} className="text-[var(--brand-accent)] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-[var(--brand-primary)] line-clamp-1">{pr.title}</div>
                  <div className="text-sm text-[var(--text-tertiary)] mt-0.5">{pr.user_name} · {pr.prayed_count || 0} prayed</div>
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
