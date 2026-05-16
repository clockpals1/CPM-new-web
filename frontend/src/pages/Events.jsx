import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Calendar, Video, MapPin, Loader2, ExternalLink, Plus, Trash2,
  Radio, ChevronDown, ChevronUp, Clock, Globe, Church,
  Star, CheckCircle, Sparkles, X, Image, Play,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────
const PROVIDER_META = {
  youtube:   { label: "YouTube",   color: "bg-red-600",     textColor: "text-white" },
  facebook:  { label: "Facebook",  color: "bg-blue-600",    textColor: "text-white" },
  instagram: { label: "Instagram", color: "bg-pink-600",    textColor: "text-white" },
  tiktok:    { label: "TikTok",    color: "bg-black",       textColor: "text-white" },
  custom:    { label: "Watch Live",color: "bg-[var(--brand-primary)]", textColor: "text-white" },
};

function getProviderMeta(p) {
  return PROVIDER_META[(p || "").toLowerCase()] || PROVIDER_META.custom;
}

function eventStatus(e) {
  const now = Date.now();
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 3 * 60 * 60 * 1000;
  if (now >= start && now <= end) return "live";
  if (now > end) return "past";
  return "upcoming";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function useCountdown(starts_at) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(starts_at).getTime() - Date.now();
      if (diff <= 0) { setLabel(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setLabel(`in ${d}d ${h}h`);
      else if (h > 0) setLabel(`in ${h}h ${m}m`);
      else setLabel(`in ${m}m`);
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [starts_at]);
  return label;
}

// ── Live Now Banner ────────────────────────────────────────────────────────
function LiveNowBanner({ liveEvents }) {
  if (!liveEvents.length) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }} data-testid="live-now-banner">
      <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-white font-semibold text-sm uppercase tracking-widest">Live Now</span>
        </div>
        <div className="flex-1 min-w-0 text-white/90 text-sm truncate">
          {liveEvents[0].title}{liveEvents.length > 1 && ` + ${liveEvents.length - 1} more`}
        </div>
        {liveEvents[0].livestream_url && (
          <a href={liveEvents[0].livestream_url} target="_blank" rel="noreferrer"
            className="shrink-0 bg-white text-red-700 font-semibold text-xs px-4 py-1.5 rounded-full hover:bg-red-50 transition-colors flex items-center gap-1.5">
            <Play size={11} /> Watch Now
          </a>
        )}
      </div>
    </div>
  );
}

// ── Event Livestream Buttons ───────────────────────────────────────────────
function LivestreamButtons({ streams, legacyUrl, status }) {
  const all = streams.length > 0 ? streams : (legacyUrl ? [{ id: "legacy", provider: "custom", url: legacyUrl, label: "Watch Live" }] : []);
  if (!all.length) return null;
  if (status === "upcoming") {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {all.map((s) => {
          const meta = getProviderMeta(s.provider);
          return (
            <span key={s.id} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${meta.color} ${meta.textColor} opacity-60 cursor-not-allowed`}>
              <Video size={11} /> {s.label || meta.label} — starts soon
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {all.map((s) => {
        const meta = getProviderMeta(s.provider);
        const label = status === "past"
          ? (s.label || "Watch Replay")
          : (s.label || meta.label);
        return (
          <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-opacity hover:opacity-80 ${meta.color} ${meta.textColor}`}
            data-testid={`stream-btn-${s.id}`}>
            {status === "live" ? <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live</>
              : status === "past" ? <><Play size={10} /> {label}</> : <><Video size={11} /> {label}</>}
          </a>
        );
      })}
    </div>
  );
}

// ── Highlights section ─────────────────────────────────────────────────────
function EventHighlights({ eventId, canPost }) {
  const [highlights, setHighlights] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", replay_url: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    http.get(`/events/${eventId}/highlights`).then((r) => setHighlights(r.data)).catch(() => {});
  }, [eventId]);
  const post = async () => {
    if (!form.title.trim()) return toast.error("Add a highlight title");
    setBusy(true);
    try {
      const { data } = await http.post(`/events/${eventId}/highlights`, form);
      setHighlights((h) => [data, ...h]); setOpen(false); setForm({ title: "", body: "", replay_url: "" });
      toast.success("Highlight posted");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  if (highlights.length === 0 && !canPost) return null;
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-accent)] flex items-center gap-1.5">
          <Sparkles size={12} /> Post-event highlights
        </div>
        {canPost && <button onClick={() => setOpen((s) => !s)} className="text-xs text-[var(--brand-accent)] underline">{open ? "Cancel" : "Post highlight"}</button>}
      </div>
      {open && canPost && (
        <div className="space-y-2 mb-3 bg-[var(--bg-subtle)] rounded-lg p-3">
          <input className="input-clean text-sm" placeholder="Highlight title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input-clean text-sm min-h-[60px] resize-none" placeholder="Brief recap or message..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input className="input-clean text-sm" placeholder="Replay URL (optional)" value={form.replay_url} onChange={(e) => setForm({ ...form, replay_url: e.target.value })} />
          <button onClick={post} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Post highlight
          </button>
        </div>
      )}
      <div className="space-y-2">
        {highlights.map((h) => (
          <div key={h.id} className="bg-[var(--bg-subtle)] rounded-lg p-3" data-testid={`highlight-${h.id}`}>
            <div className="flex items-start gap-2">
              <Sparkles size={13} className="text-[var(--brand-accent)] shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-[var(--brand-primary)]">{h.title}</div>
                {h.body && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{h.body}</div>}
                {h.replay_url && (
                  <a href={h.replay_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--brand-accent)] mt-1 hover:underline">
                    <Play size={10} /> Watch replay
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Add Livestream Form ────────────────────────────────────────────────────
function AddLivestreamForm({ eventId, providers, onAdded }) {
  const [form, setForm] = useState({ provider: "youtube", url: "", label: "", embed_type: "link", is_primary: true });
  const [busy, setBusy] = useState(false);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    if (!form.url.trim()) return toast.error("Paste the stream URL");
    setBusy(true);
    try {
      const { data } = await http.post(`/events/${eventId}/livestreams`, form);
      onAdded(data); toast.success("Stream added");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="mt-3 bg-[var(--bg-subtle)] rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select className="input-clean text-xs" value={form.provider} onChange={f("provider")}>
          {providers.length > 0
            ? providers.map((p) => <option key={p.id} value={p.label.toLowerCase()}>{p.label}</option>)
            : ["YouTube", "Facebook", "Instagram", "TikTok", "Custom"].map((p) => <option key={p} value={p.toLowerCase()}>{p}</option>)}
        </select>
        <input className="input-clean text-xs" placeholder="Optional label" value={form.label} onChange={f("label")} />
      </div>
      <input className="input-clean text-xs" placeholder="https://..." value={form.url} onChange={f("url")} />
      <button onClick={submit} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />} Add stream
      </button>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────
function EventCard({ event: ev, currentUser, memberships, providers, onDeleted }) {
  const status = eventStatus(ev);
  const countdown = useCountdown(ev.starts_at);
  const canAdmin = ["super_admin", "parish_admin", "shepherd"].includes(currentUser?.role);
  const [streams, setStreams] = useState([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showAddStream, setShowAddStream] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    http.get(`/events/${ev.id}/livestreams`).then((r) => setStreams(r.data)).catch(() => {});
    http.get(`/events/${ev.id}/rsvp-status`).then((r) => { setRsvped(r.data.rsvped); setRsvpCount(r.data.count); }).catch(() => {});
  }, [ev.id]);

  const handleRsvp = async () => {
    if (rsvped) return;
    setBusy(true);
    try {
      await http.post(`/events/${ev.id}/rsvp`);
      setRsvped(true); setRsvpCount((c) => c + 1);
      toast.success("You're attending! Alleluia.");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    try { await http.delete(`/events/${ev.id}`); onDeleted(ev.id); toast.success("Event removed"); } catch (e) { toast.error(formatErr(e)); }
  };

  const handleFeature = async () => {
    try { await http.post(`/admin/events/${ev.id}/feature`, { featured: !ev.featured }); toast.success(ev.featured ? "Unfeatured" : "Featured!"); } catch (e) { toast.error(formatErr(e)); }
  };

  const statusBadge = {
    live: "bg-red-600 text-white",
    past: "bg-gray-200 text-gray-600",
    upcoming: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  }[status];

  return (
    <div className={`card-surface overflow-hidden transition-shadow hover:shadow-md ${status === "past" ? "opacity-80" : ""}`} data-testid={`event-card-${ev.id}`}>
      {/* Status top bar for live */}
      {status === "live" && (
        <div className="bg-red-600 px-5 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-semibold uppercase tracking-widest">Happening Now</span>
        </div>
      )}
      {ev.featured && status !== "live" && (
        <div className="bg-[var(--brand-accent)]/10 border-b border-[var(--brand-accent)]/20 px-5 py-1.5 flex items-center gap-1.5">
          <Star size={11} className="text-[var(--brand-accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-accent)]">Featured Event</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Date block */}
          <div className="shrink-0 w-14 text-center rounded-xl bg-[var(--bg-subtle)] py-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-accent)] font-semibold">
              {new Date(ev.starts_at).toLocaleDateString("en-GB", { month: "short" })}
            </div>
            <div className="font-display text-2xl text-[var(--brand-primary)] leading-none">
              {new Date(ev.starts_at).getDate()}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              {new Date(ev.starts_at).toLocaleDateString("en-GB", { weekday: "short" })}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {ev.category && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--brand-accent)] border border-[var(--brand-accent)]/30 rounded-full px-2 py-0.5">
                  {ev.category}
                </span>
              )}
              <span className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${statusBadge}`}>
                {status === "live" ? "● Live" : status === "past" ? "Ended" : countdown || "Upcoming"}
              </span>
              {ev.scope === "parish" ? (
                <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5"><Church size={9} /> Parish</span>
              ) : (
                <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5"><Globe size={9} /> Global</span>
              )}
            </div>

            <h3 className="font-display text-xl text-[var(--brand-primary)] leading-snug">{ev.title}</h3>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(ev.starts_at)}{ev.ends_at && ` – ${formatTime(ev.ends_at)}`}</span>
              {ev.location && (
                <a href={`https://maps.google.com?q=${encodeURIComponent(ev.location)}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 hover:text-[var(--brand-accent)] transition-colors">
                  <MapPin size={11} /> {ev.location}
                </a>
              )}
            </div>

            {ev.description && <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{ev.description}</p>}

            {/* Livestream buttons */}
            <LivestreamButtons streams={streams} legacyUrl={ev.livestream_url} status={status} />

            {/* Actions row */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
              {status !== "past" && (
                <button onClick={handleRsvp} disabled={rsvped || busy}
                  className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-all ${
                    rsvped ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "btn-primary text-xs"}`}
                  data-testid={`event-rsvp-${ev.id}`}>
                  {rsvped ? <><CheckCircle size={12} /> Going</> : "I'll be there"}
                </button>
              )}
              {rsvpCount > 0 && <span className="text-xs text-[var(--text-tertiary)]">{rsvpCount} attending</span>}
              {status === "past" && streams.length === 0 && !ev.livestream_url && (
                <button onClick={() => setShowHighlights((s) => !s)}
                  className="text-xs text-[var(--brand-accent)] flex items-center gap-1">
                  <Sparkles size={12} /> See recap {showHighlights ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
              {canAdmin && (
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={handleFeature} className={`text-xs px-2 py-1 rounded border ${ev.featured ? "border-[var(--brand-accent)] text-[var(--brand-accent)]" : "border-[var(--border-default)] text-[var(--text-tertiary)]"}`}>
                    <Star size={11} />
                  </button>
                  <button onClick={() => setShowAddStream((s) => !s)} className="text-xs px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)]">
                    <Video size={11} />
                  </button>
                  <button onClick={handleDelete} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>

            {showAddStream && canAdmin && (
              <AddLivestreamForm eventId={ev.id} providers={[]} onAdded={(s) => { setStreams((p) => [...p, s]); setShowAddStream(false); }} />
            )}

            {(status === "past" || showHighlights) && (
              <EventHighlights eventId={ev.id} canPost={canAdmin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Event Form ─────────────────────────────────────────────────────────
function NewEventForm({ cats, memberships, onCreated, onClose }) {
  const [form, setForm] = useState({
    title: "", description: "", category: cats[0]?.label || "Sunday Worship",
    starts_at: "", ends_at: "", scope: "global", parish_id: memberships[0]?.parish_id || "",
    location: "", livestream_url: "",
  });
  const [busy, setBusy] = useState(false);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim() || !form.starts_at) return toast.error("Title and start time are required");
    setBusy(true);
    try {
      const { data } = await http.post("/events", { ...form, parish_id: form.scope === "parish" ? form.parish_id : null });
      onCreated(data); toast.success("Event created — Alleluia!"); onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card-surface p-6 slide-up" data-testid="new-event-form">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-[var(--brand-primary)]">Create event</h3>
        <button onClick={onClose}><X size={18} className="text-[var(--text-tertiary)]" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input-clean sm:col-span-2" placeholder="Event title" value={form.title} onChange={f("title")} data-testid="event-title" />
        <select className="input-clean" value={form.category} onChange={f("category")}>
          {cats.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
        </select>
        <select className="input-clean" value={form.scope} onChange={f("scope")}>
          <option value="global">Global Church</option>
          <option value="parish">My Parish</option>
        </select>
        {form.scope === "parish" && (
          <select className="input-clean sm:col-span-2" value={form.parish_id} onChange={f("parish_id")}>
            <option value="">Select parish</option>
            {memberships.map((m) => <option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>)}
          </select>
        )}
        <div className="sm:col-span-2 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">Starts</label>
            <input type="datetime-local" className="input-clean w-full" value={form.starts_at} onChange={f("starts_at")} data-testid="event-start" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-1">Ends (optional)</label>
            <input type="datetime-local" className="input-clean w-full" value={form.ends_at} onChange={f("ends_at")} />
          </div>
        </div>
        <input className="input-clean sm:col-span-2" placeholder="Location or address (optional)" value={form.location} onChange={f("location")} />
        <input className="input-clean sm:col-span-2" placeholder="Primary livestream URL (optional — more can be added after)" value={form.livestream_url} onChange={f("livestream_url")} />
        <textarea className="input-clean sm:col-span-2 min-h-[80px] resize-none" placeholder="Event description" value={form.description} onChange={f("description")} />
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="event-submit">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />} Create event
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────
function FilterBar({ cats, scopeFilter, setScopeFilter, catFilter, setCatFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
        {["all", "global", "parish"].map((s) => (
          <button key={s} onClick={() => setScopeFilter(s)}
            className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${scopeFilter === s ? "bg-[var(--brand-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"}`}>
            {s === "all" ? "All" : s === "global" ? "Global" : "My Parish"}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setCatFilter("")} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${catFilter === "" ? "bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
          All
        </button>
        {cats.slice(0, 6).map((c) => (
          <button key={c.id} onClick={() => setCatFilter(catFilter === c.label ? "" : c.label)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${catFilter === c.label ? "bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────
export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [liveNow, setLiveNow] = useState([]);
  const [cats, setCats] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("");

  const canPost = ["super_admin", "parish_admin", "shepherd"].includes(user?.role);

  const loadEvents = useCallback(() => {
    setLoading(true);
    http.get("/events").then((r) => setEvents(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
    http.get("/settings/event_categories").then((r) => setCats(r.data)).catch(() => {});
    http.get("/me/memberships").then((r) => setMemberships(r.data)).catch(() => {});
    http.get("/me/engagement").then((r) => setLiveNow(r.data.live_now || [])).catch(() => {});
  }, [loadEvents]);

  const filtered = events.filter((e) => {
    if (scopeFilter !== "all" && e.scope !== scopeFilter) return false;
    if (catFilter && e.category !== catFilter) return false;
    return true;
  });

  const upcoming = filtered.filter((e) => eventStatus(e) !== "past");
  const past = filtered.filter((e) => eventStatus(e) === "past");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-1">Calendar</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Events & Worship</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Parish services, revivals, choir programs, and global church events.</p>
        </div>
        {canPost && (
          <button onClick={() => setComposerOpen((s) => !s)} className="btn-accent inline-flex items-center gap-2" data-testid="events-new-btn">
            <Plus size={15} /> {composerOpen ? "Cancel" : "New event"}
          </button>
        )}
      </div>

      {/* Live Now banner */}
      <LiveNowBanner liveEvents={liveNow} />

      {/* New event composer */}
      {composerOpen && canPost && (
        <NewEventForm cats={cats} memberships={memberships} onCreated={(e) => { setEvents((prev) => [e, ...prev]); setComposerOpen(false); }} onClose={() => setComposerOpen(false)} />
      )}

      {/* Filters */}
      <FilterBar cats={cats} scopeFilter={scopeFilter} setScopeFilter={setScopeFilter} catFilter={catFilter} setCatFilter={setCatFilter} />

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-surface p-5 animate-pulse flex gap-4">
              <div className="w-14 h-16 rounded-xl bg-[var(--bg-subtle)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-1/4" />
                <div className="h-6 bg-[var(--bg-subtle)] rounded w-3/4" />
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming + Live */}
          {upcoming.length === 0 && past.length === 0 ? (
            <div className="card-surface p-10 text-center space-y-3">
              <Calendar size={32} className="mx-auto text-[var(--text-tertiary)]" />
              <h3 className="font-display text-xl text-[var(--brand-primary)]">No events yet</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {catFilter ? `No ${catFilter} events found.` : "Check back soon — your parish is planning great things."}
              </p>
              {canPost && <button onClick={() => setComposerOpen(true)} className="btn-accent inline-flex items-center gap-2 mx-auto"><Plus size={14} /> Create first event</button>}
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} currentUser={user} memberships={memberships} providers={[]} onDeleted={(id) => setEvents((p) => p.filter((ev) => ev.id !== id))} />
              ))}
              {past.length > 0 && (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                    <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest font-semibold">Past events & replays</span>
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                  </div>
                  {past.slice(0, 10).map((e) => (
                    <EventCard key={e.id} event={e} currentUser={user} memberships={memberships} providers={[]} onDeleted={(id) => setEvents((p) => p.filter((ev) => ev.id !== id))} />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
