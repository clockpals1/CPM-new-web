import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Music, BadgeCheck, Loader2, Plus, Trash2, Megaphone,
  CalendarClock, AlertCircle, CheckCircle2, Clock, MapPin,
  ChevronDown, ChevronUp, X, Users, Star,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────
const VOICE_PARTS = ["Soprano", "Alto", "Tenor", "Bass", "Treble", "Baritone"];

function formatDT(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isPast(iso) { return iso && new Date(iso).getTime() < Date.now(); }

// ── My Choir Status Card ─────────────────────────────────────────────────
function MyChoirStatusCard({ myChoir, onJoinClick }) {
  if (!myChoir) {
    return (
      <div className="card-surface p-5 flex items-start gap-4" data-testid="choir-status-none">
        <div className="w-11 h-11 rounded-xl bg-[var(--bg-subtle)] grid place-items-center shrink-0">
          <Music size={20} className="text-[var(--text-tertiary)]" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-[var(--brand-primary)]">Not in choir</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">Request to join the parish choir below. A parish admin will verify you.</div>
        </div>
        <button onClick={onJoinClick} className="btn-accent text-xs shrink-0">Request to join</button>
      </div>
    );
  }
  if (myChoir.status === "pending") {
    return (
      <div className="card-surface p-5 flex items-start gap-4 border-l-4 border-amber-400" data-testid="choir-status-pending">
        <div className="w-11 h-11 rounded-xl bg-amber-50 grid place-items-center shrink-0">
          <Clock size={20} className="text-amber-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--brand-primary)]">Request pending</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">Your choir join request is awaiting verification by a parish admin.</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Voice part: {myChoir.voice_part}</div>
        </div>
      </div>
    );
  }
  const isDirector = myChoir.role === "director";
  return (
    <div className={`card-surface p-5 flex items-start gap-4 border-l-4 ${isDirector ? "border-[var(--brand-accent)]" : "border-emerald-500"}`} data-testid="choir-status-verified">
      <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${isDirector ? "bg-[var(--brand-accent)]/10" : "bg-emerald-50"}`}>
        {isDirector ? <Star size={20} className="text-[var(--brand-accent)]" /> : <CheckCircle2 size={20} className="text-emerald-600" />}
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--brand-primary)] flex items-center gap-2">
          {isDirector ? "Choir Director" : "Verified Choir Member"}
          <BadgeCheck size={14} className={isDirector ? "text-[var(--brand-accent)]" : "text-emerald-500"} />
        </div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5">Voice part: {myChoir.voice_part}</div>
        {isDirector && <div className="text-xs text-[var(--brand-accent)] mt-1 font-medium">You are a choir director for this parish.</div>}
      </div>
    </div>
  );
}

// ── Announcements Board ──────────────────────────────────────────────────
function AnnouncementsBoard({ parishId, canAdmin }) {
  const [announcements, setAnnouncements] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", priority: "normal" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!parishId) return;
    http.get("/choir/announcements", { params: { parish_id: parishId } }).then((r) => setAnnouncements(r.data)).catch(() => {});
  }, [parishId]);

  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body required");
    setBusy(true);
    try {
      await http.post("/choir/announcements", { ...form, parish_id: parishId });
      toast.success("Announcement posted"); load(); setOpen(false); setForm({ title: "", body: "", priority: "normal" });
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await http.delete(`/choir/announcements/${id}`); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-3" data-testid="choir-announcements">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[var(--brand-primary)] flex items-center gap-2">
          <Megaphone size={16} className="text-[var(--brand-accent)]" /> Choir Announcements
        </h3>
        {canAdmin && (
          <button onClick={() => setOpen((s) => !s)} className="text-xs text-[var(--brand-accent)] underline">{open ? "Cancel" : "Post announcement"}</button>
        )}
      </div>
      {open && canAdmin && (
        <div className="card-surface p-4 space-y-2 border-l-4 border-[var(--brand-accent)]">
          <div className="flex gap-2">
            <input className="input-clean flex-1 text-sm" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="input-clean text-sm max-w-[120px]" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea className="input-clean text-sm min-h-[80px] resize-none w-full" placeholder="Message to the choir..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <button onClick={post} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Megaphone size={12} />} Post
          </button>
        </div>
      )}
      {announcements.length === 0 ? (
        <div className="card-surface p-5 text-sm text-[var(--text-secondary)]" data-testid="no-announcements">No choir announcements yet.</div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className={`card-surface p-4 border-l-4 ${a.priority === "urgent" ? "border-red-500" : "border-[var(--border-default)]"}`} data-testid={`announcement-${a.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.priority === "urgent" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Urgent</span>
                    )}
                    <span className="text-sm font-medium text-[var(--brand-primary)]">{a.title}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{a.body}</p>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1.5">— {a.author_name} · {new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                {canAdmin && (
                  <button onClick={() => remove(a.id)} className="shrink-0 text-[var(--text-tertiary)] hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rehearsal Schedule ────────────────────────────────────────────────────
function RehearsalSchedule({ parishId, canAdmin }) {
  const [rehearsals, setRehearsals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", notes: "", location: "", scheduled_at: "", voice_parts: [] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!parishId) return;
    http.get("/rehearsals", { params: { parish_id: parishId } }).then((r) => setRehearsals(r.data)).catch(() => {});
  }, [parishId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title.trim() || !form.scheduled_at) return toast.error("Title and date/time required");
    setBusy(true);
    try {
      await http.post("/rehearsals", { ...form, parish_id: parishId });
      toast.success("Rehearsal scheduled"); load(); setOpen(false); setForm({ title: "", notes: "", location: "", scheduled_at: "", voice_parts: [] });
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await http.delete(`/rehearsals/${id}`); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  const upcoming = rehearsals.filter((r) => !isPast(r.scheduled_at));
  const past = rehearsals.filter((r) => isPast(r.scheduled_at));

  return (
    <div className="space-y-3" data-testid="rehearsal-schedule">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[var(--brand-primary)] flex items-center gap-2">
          <CalendarClock size={16} className="text-[var(--brand-accent)]" /> Rehearsal Schedule
        </h3>
        {canAdmin && (
          <button onClick={() => setOpen((s) => !s)} className="text-xs text-[var(--brand-accent)] underline">{open ? "Cancel" : "Schedule rehearsal"}</button>
        )}
      </div>

      {open && canAdmin && (
        <div className="card-surface p-4 space-y-2 border-l-4 border-[var(--brand-accent)]">
          <div className="grid sm:grid-cols-2 gap-2">
            <input className="input-clean text-sm sm:col-span-2" placeholder="Rehearsal title or theme" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">Date & time</label>
              <input type="datetime-local" className="input-clean text-sm w-full" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <input className="input-clean text-sm" placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <textarea className="input-clean text-sm sm:col-span-2 min-h-[60px] resize-none" placeholder="Notes for choir members" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={add} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />} Schedule
          </button>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No rehearsals scheduled yet.</div>
      ) : (
        <>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="card-surface p-4 flex items-start gap-3 border-l-4 border-emerald-400" data-testid={`rehearsal-${r.id}`}>
                <div className="shrink-0 w-12 text-center rounded-lg bg-emerald-50 py-1.5">
                  <div className="text-[10px] uppercase font-semibold text-emerald-600">{new Date(r.scheduled_at).toLocaleDateString("en-GB", { month: "short" })}</div>
                  <div className="font-display text-xl text-emerald-800 leading-none">{new Date(r.scheduled_at).getDate()}</div>
                  <div className="text-[10px] text-emerald-600">{new Date(r.scheduled_at).toLocaleDateString("en-GB", { weekday: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--brand-primary)]">{r.title}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5 flex items-center gap-2">
                    <Clock size={10} /> {new Date(r.scheduled_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    {r.location && <><MapPin size={10} /> {r.location}</>}
                  </div>
                  {r.notes && <p className="text-xs text-[var(--text-secondary)] mt-1">{r.notes}</p>}
                </div>
                {canAdmin && (
                  <button onClick={() => remove(r.id)} className="text-[var(--text-tertiary)] hover:text-red-600 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {past.length > 0 && (
            <details className="text-xs text-[var(--text-tertiary)] cursor-pointer">
              <summary className="list-none flex items-center gap-1 hover:text-[var(--brand-primary)]"><ChevronDown size={12} /> {past.length} past rehearsal{past.length > 1 ? "s" : ""}</summary>
              <div className="space-y-2 mt-2">
                {past.map((r) => (
                  <div key={r.id} className="card-surface p-3 opacity-60" data-testid={`rehearsal-past-${r.id}`}>
                    <div className="text-sm font-medium text-[var(--brand-primary)]">{r.title}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{formatDT(r.scheduled_at)}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ── Choir Roster ──────────────────────────────────────────────────────────
function ChoirRoster({ parishId, canAdmin, onVerify, onPromote }) {
  const [roster, setRoster] = useState([]);
  const [pending, setPending] = useState([]);

  const load = useCallback(() => {
    if (!parishId) return;
    http.get("/choir", { params: { parish_id: parishId } }).then((r) => setRoster(r.data)).catch(() => {});
    if (canAdmin) http.get("/choir/pending").then((r) => setPending(r.data.filter((c) => c.parish_id === parishId))).catch(() => {});
  }, [parishId, canAdmin]);

  useEffect(() => { load(); }, [load]);

  const directors = roster.filter((c) => c.role === "director");
  const members = roster.filter((c) => c.role !== "director");

  const verify = async (cid) => {
    try { await http.post(`/choir/${cid}/verify`); toast.success("Member verified"); load(); if (onVerify) onVerify(); } catch (e) { toast.error(formatErr(e)); }
  };
  const promote = async (cid) => {
    try { await http.post(`/choir/${cid}/promote`); toast.success("Promoted to director"); load(); if (onPromote) onPromote(); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-4" data-testid="choir-roster">
      {/* Pending verification */}
      {canAdmin && pending.length > 0 && (
        <div className="card-surface p-4 border-l-4 border-amber-400">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-1.5">
            <AlertCircle size={12} /> {pending.length} pending verification
          </div>
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex items-center gap-3 flex-wrap" data-testid={`pending-choir-${c.id}`}>
                <div className="w-8 h-8 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center text-xs font-medium shrink-0">
                  {(c.user_name || "?").slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--brand-primary)]">{c.user_name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{c.voice_part}</div>
                </div>
                <button onClick={() => verify(c.id)} className="btn-primary text-xs" data-testid={`verify-choir-${c.id}`}>Verify</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directors */}
      {directors.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest font-semibold text-[var(--brand-accent)] mb-2 flex items-center gap-1.5">
            <Star size={11} /> Choir Directors ({directors.length}/2)
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {directors.map((c) => (
              <div key={c.id} className="card-surface p-4 flex items-center gap-3 border-l-4 border-[var(--brand-accent)]" data-testid={`choir-director-${c.id}`}>
                <div className="w-10 h-10 rounded-full bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] grid place-items-center font-medium">
                  {(c.user_name || "D").slice(0, 1)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                    {c.user_name} <BadgeCheck size={13} className="text-[var(--brand-accent)]" />
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{c.voice_part} · Director</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div>
        <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
          <Users size={11} /> Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No verified choir members yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {members.map((c) => (
              <div key={c.id} className="card-surface p-4 flex items-center gap-3" data-testid={`choir-member-${c.id}`}>
                <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] grid place-items-center font-medium">
                  {(c.user_name || "M").slice(0, 1)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--brand-primary)] flex items-center gap-1">
                    {c.user_name} <BadgeCheck size={13} className="text-[var(--brand-accent)]" />
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{c.voice_part}</div>
                </div>
                {canAdmin && directors.length < 2 && (
                  <button onClick={() => promote(c.id)} className="text-xs px-2 py-1 border border-[var(--brand-accent)] text-[var(--brand-accent)] rounded hover:bg-[var(--brand-accent)] hover:text-white transition-colors" data-testid={`promote-${c.id}`}>
                    <Star size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Join Form ─────────────────────────────────────────────────────────────
function JoinChoirForm({ parishId, parishName, myChoir, onJoined }) {
  const [voice, setVoice] = useState("Soprano");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  if (myChoir) return null;

  const join = async () => {
    setBusy(true);
    try {
      await http.post("/choir/join", { parish_id: parishId, voice_part: voice, note });
      toast.success("Request submitted — your parish admin will verify you shortly.");
      setOpen(false); if (onJoined) onJoined();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card-surface p-5" data-testid="join-choir-form">
      {!open ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium text-[var(--brand-primary)]">Interested in joining the choir?</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">Submit a join request to {parishName || "your parish"}. Verification is by the parish admin.</div>
          </div>
          <button onClick={() => setOpen(true)} className="btn-accent text-sm inline-flex items-center gap-2 shrink-0" data-testid="open-join-choir">
            <Music size={14} /> Request to join
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-lg text-[var(--brand-primary)]">Choir join request</h4>
            <button onClick={() => setOpen(false)}><X size={16} className="text-[var(--text-tertiary)]" /></button>
          </div>
          <select className="input-clean" value={voice} onChange={(e) => setVoice(e.target.value)} data-testid="choir-voice">
            {VOICE_PARTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <textarea className="input-clean min-h-[70px] resize-none" placeholder="Optional note to the admin..." value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={join} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="choir-join">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Music size={15} />} Submit request
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────
export default function Choir() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [activeParishId, setActiveParishId] = useState("");
  const [myChoirStatuses, setMyChoirStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinFormOpen, setJoinFormOpen] = useState(false);

  const canAdmin = ["super_admin", "parish_admin", "shepherd"].includes(user?.role);

  const loadBase = useCallback(() => {
    setLoading(true);
    Promise.all([
      http.get("/me/memberships").then((r) => {
        setMemberships(r.data);
        if (r.data[0] && !activeParishId) setActiveParishId(r.data[0].parish_id);
      }),
      http.get("/me/choir-status").then((r) => setMyChoirStatuses(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  const activeMembership = memberships.find((m) => m.parish_id === activeParishId) || memberships[0];
  const activeParish = activeMembership?.parish;
  const myChoir = myChoirStatuses.find((c) => c.parish_id === activeParishId);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-1/3 bg-[var(--bg-subtle)] rounded" />
        <div className="card-surface h-20 rounded-xl" />
        <div className="card-surface h-40 rounded-xl" />
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card-surface p-10 text-center space-y-3">
          <Music size={36} className="mx-auto text-[var(--text-tertiary)]" />
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">Join a parish first</h2>
          <p className="text-sm text-[var(--text-secondary)]">You need to be a member of a parish before you can join or view its choir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-1">Choir Ministry</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Choir Hub</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          The digital home of your parish choir — roster, announcements, rehearsals, and upcoming ministrations.
        </p>
      </div>

      {/* Parish selector */}
      {memberships.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap card-surface p-3">
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide font-medium">Viewing choir for:</span>
          {memberships.map((m) => (
            <button key={m.parish_id} onClick={() => setActiveParishId(m.parish_id)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${activeParishId === m.parish_id ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
              {m.parish?.name}
            </button>
          ))}
        </div>
      )}

      {/* Parish name label */}
      {activeParish && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Music size={12} className="text-[var(--brand-accent)]" />
          <span>Choir of <span className="font-medium text-[var(--brand-primary)]">{activeParish.name}</span></span>
        </div>
      )}

      {/* My choir status */}
      <MyChoirStatusCard myChoir={myChoir} onJoinClick={() => setJoinFormOpen(true)} />

      {/* Join form */}
      {(!myChoir || joinFormOpen) && (
        <JoinChoirForm
          parishId={activeParishId}
          parishName={activeParish?.name}
          myChoir={myChoir}
          onJoined={() => { setJoinFormOpen(false); loadBase(); }}
        />
      )}

      {/* Announcements */}
      {activeParishId && <AnnouncementsBoard parishId={activeParishId} canAdmin={canAdmin} />}

      {/* Rehearsal schedule */}
      {activeParishId && <RehearsalSchedule parishId={activeParishId} canAdmin={canAdmin} />}

      {/* Roster */}
      {activeParishId && (
        <div className="space-y-3">
          <h3 className="font-display text-xl text-[var(--brand-primary)]">Choir Roster</h3>
          <ChoirRoster parishId={activeParishId} canAdmin={canAdmin} onVerify={loadBase} onPromote={loadBase} />
        </div>
      )}
    </div>
  );
}
