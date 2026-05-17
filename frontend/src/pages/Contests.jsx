import React, { useEffect, useState, useRef } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import MediaUploader from "../components/MediaUploader";
import {
  Trophy, Heart, Clock, Image, Video, BookOpen, Sparkles,
  ChevronRight, ChevronDown, X, Loader2, Send, Star, Crown,
  Users, ArrowLeft, CheckCircle,
} from "lucide-react";

const TYPE_CONFIG = {
  photo:     { icon: Image,    label: "Photo Contest",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200"   },
  video:     { icon: Video,    label: "Video Contest",    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  verse:     { icon: BookOpen, label: "Memory Verse",     color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200"  },
  testimony: { icon: Sparkles, label: "Testimony",        color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200"},
};

function countdown(endAt) {
  const diff = new Date(endAt) - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── Entry card ────────────────────────────────────────────────────────────
function EntryCard({ entry, onVote, isWinner }) {
  const [loading, setLoading] = useState(false);
  const handleVote = async () => {
    setLoading(true);
    await onVote(entry.id);
    setLoading(false);
  };
  return (
    <div className={`card-surface overflow-hidden transition-all ${isWinner ? "ring-2 ring-[var(--brand-accent)]" : ""}`}>
      {isWinner && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-accent)] text-white text-xs font-bold uppercase tracking-wider">
          <Crown size={12} /> Winner
        </div>
      )}
      {entry.media_urls?.length > 0 && (
        <div className="aspect-video bg-[var(--bg-subtle)] overflow-hidden">
          {entry.media_urls[0].includes("video") || entry.media_urls[0].match(/\.(mp4|mov|webm)$/i) ? (
            <video src={entry.media_urls[0]} controls className="w-full h-full object-cover" />
          ) : (
            <img src={entry.media_urls[0]} alt="entry" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-display shrink-0">
            {entry.user_avatar ? <img src={entry.user_avatar} alt="" className="w-full h-full object-cover" /> : entry.user_name?.[0]}
          </div>
          <span className="font-medium text-sm text-[var(--brand-primary)] truncate">{entry.user_name}</span>
        </div>
        {entry.body && <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">{entry.body}</p>}
        <button
          onClick={handleVote}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
            entry.has_voted
              ? "bg-[var(--brand-accent)] text-white"
              : "border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
          }`}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Heart size={12} className={entry.has_voted ? "fill-current" : ""} />}
          {entry.votes} {entry.has_voted ? "Voted" : "Vote"}
        </button>
      </div>
    </div>
  );
}

// ── Submit form ────────────────────────────────────────────────────────────
function SubmitEntryForm({ contest, onSubmitted, onClose }) {
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim() && mediaUrls.length === 0) return toast.error("Add a caption or media to your entry.");
    setBusy(true);
    try {
      const { data } = await http.post(`/contests/${contest.id}/entries`, { body, media_urls: mediaUrls });
      toast.success("Entry submitted! Good luck 🎉");
      localStorage.setItem("cpm_posted_v1", "1");
      onSubmitted(data);
    } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-[var(--bg-paper)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-default)]">
          <div className="flex-1">
            <div className="font-display text-lg text-[var(--brand-primary)]">Submit your entry</div>
            <div className="text-xs text-[var(--text-tertiary)]">{contest.title}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              contest.type === "verse" ? "Type your memory verse here…" :
              contest.type === "testimony" ? "Share your testimony…" :
              "Add a caption for your entry…"
            }
            rows={4}
            className="input-clean w-full text-sm resize-none"
          />
          <MediaUploader mediaUrls={mediaUrls} onChange={setMediaUrls} />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit Entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contest detail ─────────────────────────────────────────────────────────
function ContestDetail({ contest, onBack }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = user?.role === "super_admin" || user?.role === "parish_admin";
  const hasEntered = entries.some((e) => e.user_id === user?.id);
  const tc = TYPE_CONFIG[contest.type] || TYPE_CONFIG.photo;
  const TypeIcon = tc.icon;

  const loadEntries = () => {
    setLoadingEntries(true);
    http.get(`/contests/${contest.id}/entries`)
      .then((r) => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));
  };

  useEffect(() => { loadEntries(); }, [contest.id]);

  const handleVote = async (eid) => {
    try {
      const { data } = await http.post(`/contests/${contest.id}/entries/${eid}/vote`);
      setEntries((prev) => prev.map((e) =>
        e.id === eid ? { ...e, has_voted: data.voted, votes: e.votes + (data.voted ? 1 : -1) } : e
      ).sort((a, b) => b.votes - a.votes));
    } catch (e) { toast.error(formatErr(e)); }
  };

  const declareWinner = async (eid) => {
    if (!window.confirm("Declare this entry as the winner?")) return;
    try {
      await http.post(`/contests/${contest.id}/winner/${eid}`);
      toast.success("Winner declared!");
      loadEntries();
    } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors">
        <ArrowLeft size={15} /> All contests
      </button>

      {/* Contest header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
      >
        <div className="absolute -bottom-8 -right-8 w-40 h-40 opacity-10 pointer-events-none rounded-full"
          style={{ background: "radial-gradient(circle, #C5A028, transparent)" }} />
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${tc.bg} ${tc.color} ${tc.border} border`}>
          <TypeIcon size={12} /> {tc.label}
        </div>
        <h1 className="font-display text-2xl text-white leading-snug">{contest.title}</h1>
        <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-lg">{contest.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {contest.prize && (
            <div className="flex items-center gap-2 bg-[var(--brand-accent)]/20 px-3 py-1.5 rounded-full">
              <Trophy size={13} className="text-[var(--brand-accent)]" />
              <span className="text-xs text-[var(--brand-accent)] font-semibold">{contest.prize}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <Clock size={12} /> {countdown(contest.end_at)}
          </div>
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <Users size={12} /> {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
          </div>
        </div>
        {contest.status === "active" && !hasEntered && (
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--brand-accent)] text-white text-sm font-semibold hover:bg-[var(--brand-accent)]/90 transition-colors active:scale-95"
          >
            <Send size={14} /> Enter Now
          </button>
        )}
        {hasEntered && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/70 text-sm">
            <CheckCircle size={14} className="text-emerald-400" /> Entry submitted
          </div>
        )}
      </div>

      {/* Entries */}
      {loadingEntries ? (
        <div className="grid sm:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => <div key={n} className="card-surface h-48" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card-surface p-10 text-center space-y-3">
          <Trophy size={28} className="mx-auto text-[var(--brand-accent)] opacity-50" />
          <div className="font-display text-lg text-[var(--brand-primary)]">No entries yet — be the first!</div>
          {contest.status === "active" && (
            <button onClick={() => setShowForm(true)} className="btn-accent text-sm">Submit your entry</button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {entries.map((e) => (
            <div key={e.id} className="space-y-2">
              <EntryCard
                entry={e}
                onVote={handleVote}
                isWinner={e.id === contest.winner_entry_id}
              />
              {isAdmin && contest.status === "active" && (
                <button onClick={() => declareWinner(e.id)} className="text-xs text-[var(--brand-accent)] hover:underline">
                  Declare winner
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SubmitEntryForm
          contest={contest}
          onSubmitted={(e) => { setEntries([e, ...entries]); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Contest card ───────────────────────────────────────────────────────────
function ContestCard({ contest, onClick }) {
  const tc = TYPE_CONFIG[contest.type] || TYPE_CONFIG.photo;
  const TypeIcon = tc.icon;
  const isEnded = contest.status === "ended";
  return (
    <button
      onClick={onClick}
      className="card-surface w-full text-left group hover:border-[var(--brand-accent)] transition-all active:scale-[0.98]"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tc.bg} ${tc.color} ${tc.border}`}>
            <TypeIcon size={11} /> {tc.label}
          </div>
          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
            isEnded ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-600"
          }`}>
            {isEnded ? "Ended" : "Active"}
          </span>
        </div>
        <h3 className="font-display text-lg text-[var(--brand-primary)] leading-snug mb-1 group-hover:text-[var(--brand-accent)] transition-colors">
          {contest.title}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mb-4">{contest.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {contest.prize && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--brand-accent)] font-semibold">
                <Trophy size={12} /> {contest.prize}
              </div>
            )}
            {!isEnded && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <Clock size={11} /> {countdown(contest.end_at)}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-accent)] transition-colors" />
        </div>
      </div>
    </button>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────
export default function Contests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    http.get("/contests")
      .then((r) => setContests(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = contests.filter((c) =>
    tab === "active" ? c.status === "active" : c.status === "ended"
  );

  if (selected) {
    const contest = contests.find((c) => c.id === selected);
    if (contest) return (
      <div className="max-w-3xl mx-auto">
        <ContestDetail contest={contest} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8"
        style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
      >
        <div className="absolute -top-6 -right-6 w-40 h-40 opacity-10 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, #C5A028, transparent)" }} />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] text-xs font-semibold mb-4">
          <Trophy size={12} /> Community Contests
        </div>
        <h1 className="font-display text-3xl text-white leading-tight">Celestial Challenges</h1>
        <p className="text-white/70 text-sm mt-2 max-w-md leading-relaxed">
          Compete, vote, and celebrate each other. The top entries win prizes and may be featured as CPM Stars of the Week!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ k: "active", l: "Active" }, { k: "ended", l: "Past" }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
              tab === t.k ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Contest list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((n) => <div key={n} className="card-surface h-36" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-10 text-center space-y-3">
          <Trophy size={28} className="mx-auto text-[var(--text-tertiary)] opacity-40" />
          <div className="font-display text-lg text-[var(--brand-primary)]">
            {tab === "active" ? "No active contests right now" : "No past contests yet"}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Check back soon — new contests are posted regularly!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <ContestCard key={c.id} contest={c} onClick={() => setSelected(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
