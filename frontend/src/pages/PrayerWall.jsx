import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Heart, Loader2, ChevronDown, ChevronUp, Send, Flag, CheckCircle,
  BookOpen, Users, Globe, Church, ArrowRight, X, AlertCircle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_META = {
  new:      { label: "New",      color: "bg-blue-50 text-blue-700 border-blue-200" },
  ongoing:  { label: "Ongoing",  color: "bg-amber-50 text-amber-700 border-amber-200" },
  answered: { label: "Answered", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200" },
  removed:  { label: "Removed",  color: "bg-red-50 text-red-600 border-red-200" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Prayer Companion Card ─────────────────────────────────────────────────
function PrayerCompanionCard() {
  const prompts = [
    "Take a moment to lift a fellow member in prayer before scrolling.",
    "Prayer is not asking. It is a longing of the soul. — Gandhi",
    "Alleluia — your prayer reaches heaven before it reaches this wall.",
    "Every \"I Prayed\" you give is a spiritual hug to a brother or sister.",
    "Pray for one person today you do not know personally.",
  ];
  const today = new Date().getDay();
  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-start gap-4"
      style={{ background: "linear-gradient(135deg, #0F1E38 0%, #1a3060 100%)" }}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--brand-accent)]/20 grid place-items-center shrink-0 mt-0.5">
        <BookOpen size={18} className="text-[var(--brand-accent)]" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-accent)] mb-1">Prayer companion</div>
        <p className="text-white/90 text-sm leading-relaxed">{prompts[today % prompts.length]}</p>
      </div>
    </div>
  );
}

// ── Prayer Composer ────────────────────────────────────────────────────────
function PrayerComposer({ scope, parishId, memberships, categories, onSubmitted, onClose }) {
  const [form, setForm] = useState({
    title: "", body: "", category: "general", urgency: "normal",
    scope, parish_id: parishId, anonymous: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, scope, parish_id: scope === "parish" ? parishId : null }));
  }, [scope, parishId]);

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Please add a prayer title.");
    if (!form.body.trim()) return toast.error("Please share your prayer request.");
    if (form.scope === "parish" && !form.parish_id) return toast.error("Select your parish first.");
    setBusy(true);
    try {
      const { data } = await http.post("/prayers", { ...form, parish_id: form.scope === "parish" ? form.parish_id : null });
      onSubmitted(data);
      toast.success("Your prayer has been shared. Alleluia.");
      onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card-surface p-6 slide-up border-[var(--brand-accent)]/30" data-testid="prayer-composer">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[var(--brand-primary)]">Share your prayer request</h3>
        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X size={18} /></button>
      </div>

      <div className="space-y-4">
        <input
          autoFocus
          className="input-clean"
          placeholder="Prayer title (e.g. Health and healing for my father)"
          value={form.title}
          onChange={f("title")}
          data-testid="prayer-title"
        />
        <textarea
          className="input-clean min-h-[120px] resize-none"
          placeholder="Share the details of your request. This space is safe and sacred."
          value={form.body}
          onChange={f("body")}
          data-testid="prayer-body"
        />

        <div className="grid sm:grid-cols-3 gap-3">
          <select className="input-clean" value={form.category} onChange={f("category")} data-testid="prayer-cat">
            {categories.length === 0
              ? <option value="general">General</option>
              : categories.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
          </select>
          <select className="input-clean" value={form.urgency} onChange={f("urgency")} data-testid="prayer-urgency">
            <option value="normal">Normal urgency</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical — please pray now</option>
          </select>
          {scope === "parish" && memberships.length > 1 && (
            <select className="input-clean" value={form.parish_id} onChange={f("parish_id")} data-testid="prayer-parish-select">
              {memberships.map((m) => <option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>)}
            </select>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer text-sm text-[var(--text-secondary)]">
          <input type="checkbox" className="w-4 h-4 accent-[var(--brand-primary)]" checked={form.anonymous} onChange={f("anonymous")} data-testid="prayer-anon" />
          Post anonymously — your name will not be shown
        </label>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[var(--text-tertiary)]">
            Posting to: <span className="font-medium text-[var(--brand-primary)]">
              {scope === "global" ? "Global Church" : (memberships.find((m) => m.parish_id === form.parish_id)?.parish?.name || "My Parish")}
            </span>
          </p>
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="prayer-submit">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Submit prayer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Comments Thread ────────────────────────────────────────────────────────
function CommentsThread({ prayerId, status }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    http.get(`/prayers/${prayerId}/comments`)
      .then((r) => { setComments(r.data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [prayerId]);

  const post = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data } = await http.post(`/prayers/${prayerId}/comment`, { body: body.trim() });
      setComments((c) => [...c, data]);
      setBody("");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const canComment = !["removed", "archived"].includes(status);

  if (!loaded) return <div className="pt-3 text-xs text-[var(--text-tertiary)] animate-pulse">Loading…</div>;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)]">No responses yet. Be the first to pray in words.</p>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2.5" data-testid={`comment-${c.id}`}>
          <div className="w-7 h-7 rounded-full bg-[var(--brand-secondary)]/30 grid place-items-center text-xs font-semibold text-[var(--brand-primary)] shrink-0">
            {(c.user_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--brand-primary)]">
              {c.user_name} {c.ccc_rank && <span className="font-normal text-[var(--text-tertiary)]">· {c.ccc_rank}</span>}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-0.5">{c.body}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{timeAgo(c.created_at)}</div>
          </div>
        </div>
      ))}
      {canComment && (
        <div className="flex gap-2 pt-1">
          <input
            className="flex-1 text-sm bg-[var(--bg-subtle)] rounded-md px-3 py-2 outline-none placeholder:text-[var(--text-tertiary)] focus:ring-1 focus:ring-[var(--brand-accent)]"
            placeholder="Share a word of encouragement…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && post()}
            data-testid="comment-input"
          />
          <button onClick={post} disabled={busy || !body.trim()} className="p-2 rounded-md bg-[var(--brand-primary)] text-white disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Report Modal ───────────────────────────────────────────────────────────
function ReportModal({ prayerId, reasons, onClose }) {
  const [reason, setReason] = useState(reasons[0]?.label || "Inappropriate content");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await http.post(`/prayers/${prayerId}/report`, { reason, notes });
      if (data.already) toast.info("You have already reported this prayer.");
      else toast.success("Report submitted. Our moderators will review it.");
      onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="report-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-[var(--brand-primary)]">Report this prayer</h3>
          <button onClick={onClose}><X size={18} className="text-[var(--text-tertiary)]" /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Reports are reviewed by our moderation team and handled with care. Prayer content is sensitive — we only act on genuine concerns.
        </p>
        <select className="input-clean mb-3" value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.length > 0
            ? reasons.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)
            : <option>Inappropriate content</option>}
        </select>
        <textarea
          className="input-clean min-h-[80px] resize-none mb-4"
          placeholder="Optional: add more context for the moderation team"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2 text-sm">
            {busy && <Loader2 size={14} className="animate-spin" />} Submit report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Answered Modal ────────────────────────────────────────────────────────
function AnsweredModal({ prayerId, onClose, onAnswered }) {
  const [testimony, setTestimony] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await http.post(`/prayers/${prayerId}/answered`, { testimony });
      onAnswered(prayerId, testimony);
      toast.success("Praise God! Your prayer has been marked as answered.");
      onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="answered-modal">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={22} className="text-emerald-600" />
          <h3 className="font-display text-xl text-[var(--brand-primary)]">Mark as Answered</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Alleluia! Share a brief testimony of how God answered this prayer (optional, but powerful for the community).
        </p>
        <textarea
          className="input-clean min-h-[100px] resize-none mb-4"
          placeholder="e.g. The doctor said there is no sign of the illness. God is faithful!"
          value={testimony}
          onChange={(e) => setTestimony(e.target.value)}
          data-testid="answered-testimony"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2 text-sm bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
            {busy && <Loader2 size={14} className="animate-spin" />}
            <CheckCircle size={14} /> Mark answered
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prayer Card ────────────────────────────────────────────────────────────
function PrayerCard({ prayer: initialPrayer, currentUser, reportReasons }) {
  const [prayer, setPrayer] = useState(initialPrayer);
  const [showComments, setShowComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [answeredOpen, setAnsweredOpen] = useState(false);
  const [prayedBusy, setPrayedBusy] = useState(false);

  const isOwner = currentUser?.id === prayer.user_id || currentUser?.sub === prayer.user_id;
  const isAdmin = ["super_admin", "parish_admin", "shepherd"].includes(currentUser?.role);
  const canMarkAnswered = (isOwner || isAdmin) && !["answered", "removed", "archived"].includes(prayer.status);

  const statusMeta = STATUS_META[prayer.status] || STATUS_META.new;

  const prayFor = async () => {
    if (prayer.i_prayed) return;
    setPrayedBusy(true);
    try {
      const { data } = await http.post(`/prayers/${prayer.id}/prayed`);
      if (!data.already) {
        setPrayer((p) => ({ ...p, prayed_count: (p.prayed_count || 0) + 1, i_prayed: true }));
      } else {
        setPrayer((p) => ({ ...p, i_prayed: true }));
      }
    } catch { /* silent */ } finally { setPrayedBusy(false); }
  };

  const handleAnswered = (id, testimony) => {
    setPrayer((p) => ({ ...p, status: "answered", testimony }));
  };

  if (prayer.status === "removed") {
    return (
      <div className="card-surface p-4 flex items-center gap-3 opacity-60" data-testid={`prayer-card-${prayer.id}`}>
        <AlertCircle size={16} className="text-[var(--text-tertiary)] shrink-0" />
        <p className="text-sm text-[var(--text-tertiary)]">This prayer request has been removed by a moderator.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`card-surface overflow-hidden transition-shadow hover:shadow-md ${prayer.status === "archived" ? "opacity-70" : ""}`}
        data-testid={`prayer-card-${prayer.id}`}
      >
        {/* Answered banner */}
        {prayer.status === "answered" && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Prayer answered</span>
          </div>
        )}

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3 justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {prayer.category && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--brand-accent)] border border-[var(--brand-accent)]/30 rounded-full px-2 py-0.5">
                    {prayer.category}
                  </span>
                )}
                {prayer.urgency && prayer.urgency !== "normal" && (
                  <span className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 border ${prayer.urgency === "critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {prayer.urgency === "critical" ? "Critical" : "Urgent"}
                  </span>
                )}
                <span className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 border ${statusMeta.color}`}>
                  {statusMeta.label}
                </span>
              </div>
              <h3 className="font-display text-xl text-[var(--brand-primary)] leading-snug">{prayer.title}</h3>
            </div>

            {/* I Prayed button */}
            <button
              onClick={prayFor}
              disabled={prayedBusy || prayer.i_prayed}
              data-testid={`prayed-btn-${prayer.id}`}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all ${
                prayer.i_prayed
                  ? "bg-[var(--brand-accent)] border-[var(--brand-accent)] text-white"
                  : "border-[var(--border-default)] hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5 text-[var(--text-secondary)]"
              }`}
            >
              {prayedBusy
                ? <Loader2 size={16} className="animate-spin" />
                : <Heart size={16} className={prayer.i_prayed ? "fill-white text-white" : "text-[var(--brand-accent)]"} />
              }
              <span className="text-[10px] font-semibold leading-none">
                {prayer.prayed_count || 0}
              </span>
            </button>
          </div>

          {/* Body */}
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{prayer.body}</p>

          {/* Answered testimony */}
          {prayer.status === "answered" && prayer.testimony && (
            <div className="mt-3 bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800 leading-relaxed">
              <span className="font-semibold">Testimony: </span>{prayer.testimony}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <div className="w-6 h-6 rounded-full bg-[var(--brand-secondary)]/30 grid place-items-center text-[10px] font-semibold text-[var(--brand-primary)]">
                {(prayer.user_name || "A").slice(0, 1).toUpperCase()}
              </div>
              <span>
                {prayer.anonymous ? "A Celestial Member" : prayer.user_name}
                <span className="mx-1">·</span>
                {timeAgo(prayer.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowComments((s) => !s)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--brand-primary)] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--bg-subtle)] transition-colors"
                data-testid={`comments-toggle-${prayer.id}`}
              >
                Respond {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {canMarkAnswered && (
                <button
                  onClick={() => setAnsweredOpen(true)}
                  className="text-xs text-emerald-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                  data-testid={`answered-btn-${prayer.id}`}
                >
                  <CheckCircle size={12} /> Answered
                </button>
              )}
              <button
                onClick={() => setReportOpen(true)}
                className="text-xs text-[var(--text-tertiary)] hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                data-testid={`report-btn-${prayer.id}`}
              >
                <Flag size={12} />
              </button>
            </div>
          </div>

          {/* I Prayed label under button */}
          {prayer.i_prayed && (
            <div className="mt-2 text-[10px] text-[var(--brand-accent)] font-semibold uppercase tracking-wider">
              You prayed for this
            </div>
          )}

          {showComments && <CommentsThread prayerId={prayer.id} status={prayer.status} />}
        </div>
      </div>

      {reportOpen && (
        <ReportModal prayerId={prayer.id} reasons={reportReasons} onClose={() => setReportOpen(false)} />
      )}
      {answeredOpen && (
        <AnsweredModal prayerId={prayer.id} onClose={() => setAnsweredOpen(false)} onAnswered={handleAnswered} />
      )}
    </>
  );
}

// ── Empty States ───────────────────────────────────────────────────────────
function EmptyState({ scope, hasParish, onCompose }) {
  if (!hasParish && scope === "parish") {
    return (
      <div className="card-surface p-8 text-center space-y-3">
        <Church size={32} className="mx-auto text-[var(--text-tertiary)]" />
        <h3 className="font-display text-xl text-[var(--brand-primary)]">Join a parish to pray together</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          The parish prayer wall is for members of a parish. Find your parish and join to see and share prayers with your community.
        </p>
      </div>
    );
  }
  return (
    <div className="card-surface p-10 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-[var(--brand-accent)]/10 grid place-items-center mx-auto">
        <Heart size={26} className="text-[var(--brand-accent)]" />
      </div>
      <h3 className="font-display text-2xl text-[var(--brand-primary)]">Alleluia — the wall is open</h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
        No prayer requests yet. Be the first to share yours, or return soon — your brethren will bring their hearts here.
      </p>
      <button onClick={onCompose} className="btn-accent inline-flex items-center gap-2 mx-auto">
        <Heart size={15} /> Submit a prayer request
      </button>
    </div>
  );
}

// ── Prayer Pulse Banner ───────────────────────────────────────────────────
function ParishPulseBanner({ prayers }) {
  const recentCount = prayers.filter((p) => {
    const diff = (Date.now() - new Date(p.created_at).getTime()) / 1000 / 3600;
    return diff < 24;
  }).length;
  const totalPrayed = prayers.reduce((s, p) => s + (p.prayed_count || 0), 0);
  if (recentCount === 0 && totalPrayed === 0) return null;
  return (
    <div className="flex items-center gap-6 bg-[var(--bg-subtle)] rounded-xl px-5 py-3 text-sm text-[var(--text-secondary)]">
      {recentCount > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {recentCount} new prayer{recentCount !== 1 ? "s" : ""} in 24h
        </span>
      )}
      {totalPrayed > 0 && (
        <span className="flex items-center gap-1.5">
          <Heart size={13} className="text-[var(--brand-accent)]" />
          {totalPrayed} times prayed
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Users size={13} className="text-[var(--brand-primary)]" />
        {prayers.length} request{prayers.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────
export default function PrayerWall() {
  const { user } = useAuth();
  const [scope, setScope] = useState("global");
  const [prayers, setPrayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [parishId, setParishId] = useState("");
  const [categories, setCategories] = useState([]);
  const [reportReasons, setReportReasons] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasParish = memberships.length > 0;

  const loadList = useCallback((s, pid) => {
    setLoading(true);
    const params = { scope: s };
    if (s === "parish") {
      if (!pid) { setPrayers([]); setLoading(false); return; }
      params.parish_id = pid;
    }
    http.get("/prayers", { params })
      .then((r) => setPrayers(r.data))
      .catch(() => setPrayers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      http.get("/me/memberships").then((r) => {
        setMemberships(r.data);
        if (r.data[0]) setParishId(r.data[0].parish_id);
      }).catch(() => {}),
      http.get("/settings/prayer_categories").then((r) => setCategories(r.data)).catch(() => {}),
      http.get("/settings/report_reasons").then((r) => setReportReasons(r.data)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (memberships.length > 0 || scope === "global") loadList(scope, parishId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, parishId]);

  const handleScopeChange = (s) => {
    setScope(s);
    if (s === "parish" && !hasParish) setComposerOpen(false);
  };

  const onSubmitted = (newPrayer) => {
    setPrayers((prev) => [{ ...newPrayer, i_prayed: false }, ...prev]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-1">Prayer Wall</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Pray with your family</h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">A sacred space to share requests and stand in prayer for one another.</p>
      </div>

      <PrayerCompanionCard />

      {/* Context tabs + parish switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => handleScopeChange("global")}
              data-testid="prayer-tab-global"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${scope === "global" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"}`}
            >
              <Globe size={14} /> Global Church
            </button>
            <button
              onClick={() => handleScopeChange("parish")}
              data-testid="prayer-tab-parish"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm border-l border-[var(--border-default)] transition-colors ${scope === "parish" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"}`}
            >
              <Church size={14} /> My Parish
            </button>
          </div>
          {scope === "parish" && memberships.length > 1 && (
            <select
              value={parishId}
              onChange={(e) => setParishId(e.target.value)}
              className="input-clean text-sm max-w-[180px]"
              data-testid="prayer-parish-select"
            >
              {memberships.map((m) => <option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>)}
            </select>
          )}
          {scope === "parish" && memberships.length === 1 && (
            <span className="text-sm text-[var(--text-tertiary)]">
              {memberships[0].parish?.name}
            </span>
          )}
        </div>

        {(scope === "global" || hasParish) && (
          <button
            onClick={() => setComposerOpen((s) => !s)}
            className="btn-accent inline-flex items-center gap-2"
            data-testid="prayer-new-btn"
          >
            <Heart size={15} />
            {composerOpen ? "Close" : "Submit a prayer"}
          </button>
        )}
      </div>

      {/* Composer */}
      {composerOpen && (
        <PrayerComposer
          scope={scope}
          parishId={parishId}
          memberships={memberships}
          categories={categories}
          onSubmitted={onSubmitted}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {/* Pulse banner */}
      {prayers.length > 0 && <ParishPulseBanner prayers={prayers} />}

      {/* Prayer list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-surface p-5 animate-pulse">
              <div className="h-4 bg-[var(--bg-subtle)] rounded w-1/4 mb-3" />
              <div className="h-6 bg-[var(--bg-subtle)] rounded w-3/4 mb-2" />
              <div className="h-4 bg-[var(--bg-subtle)] rounded w-full mb-1" />
              <div className="h-4 bg-[var(--bg-subtle)] rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : prayers.length === 0 ? (
        <EmptyState scope={scope} hasParish={hasParish} onCompose={() => setComposerOpen(true)} />
      ) : (
        <div className="space-y-4">
          {prayers.map((p) => (
            <PrayerCard
              key={p.id}
              prayer={p}
              currentUser={user}
              reportReasons={reportReasons}
            />
          ))}
        </div>
      )}

      {/* Answered prayers highlight */}
      {prayers.some((p) => p.status === "answered") && (
        <div className="card-surface p-5 border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-600" />
            <h3 className="font-display text-lg text-emerald-800">Answered prayers</h3>
          </div>
          <div className="space-y-2">
            {prayers.filter((p) => p.status === "answered").map((p) => (
              <div key={p.id} className="flex items-start gap-2 text-sm text-emerald-900">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{p.title}</span>
                  {p.testimony && <span className="text-emerald-700"> — {p.testimony}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gentle engagement nudge */}
      {!composerOpen && prayers.length > 0 && (
        <div className="text-center py-2">
          <p className="text-xs text-[var(--text-tertiary)]">
            See a prayer that moved you?{" "}
            <button
              onClick={() => setComposerOpen(true)}
              className="text-[var(--brand-accent)] underline font-medium"
            >
              Share your own request <ArrowRight size={11} className="inline" />
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
