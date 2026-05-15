import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Calendar, Video, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [cats, setCats] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Sunday Worship", starts_at: "", scope: "global", parish_id: "", livestream_url: "", location: "" });
  const [busy, setBusy] = useState(false);
  const canPost = user?.role === "super_admin" || user?.role === "parish_admin" || user?.role === "shepherd";

  const load = () => http.get("/events").then((r) => setEvents(r.data));
  useEffect(() => {
    load();
    http.get("/settings/event_categories").then((r) => setCats(r.data));
    http.get("/me/memberships").then((r) => setMemberships(r.data)).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.title || !form.starts_at) return toast.error("Title and start time required");
    setBusy(true);
    try {
      const payload = { ...form, parish_id: form.scope === "parish" ? form.parish_id : null };
      await http.post("/events", payload);
      toast.success("Event created"); setOpen(false); load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const rsvp = async (id) => { try { await http.post(`/events/${id}/rsvp`); toast.success("RSVP confirmed"); } catch (e) { toast.error(formatErr(e)); } };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Calendar</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Events & Livestream</h1>
        </div>
        {canPost && <button onClick={() => setOpen(!open)} className="btn-accent" data-testid="events-new-btn">{open ? "Close" : "New event"}</button>}
      </div>

      {open && canPost && (
        <div className="card-surface p-5 grid sm:grid-cols-2 gap-3 slide-up">
          <input className="input-clean sm:col-span-2" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="event-title" />
          <select className="input-clean" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {cats.map((c) => (<option key={c.id} value={c.label}>{c.label}</option>))}
          </select>
          <input type="datetime-local" className="input-clean" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} data-testid="event-start" />
          <select className="input-clean" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            <option value="global">Global</option><option value="parish">Parish</option>
          </select>
          {form.scope === "parish" && (
            <select className="input-clean" value={form.parish_id} onChange={(e) => setForm({ ...form, parish_id: e.target.value })}>
              <option value="">Select parish</option>
              {memberships.map((m) => (<option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>))}
            </select>
          )}
          <input className="input-clean sm:col-span-2" placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input-clean sm:col-span-2" placeholder="Livestream URL (optional)" value={form.livestream_url} onChange={(e) => setForm({ ...form, livestream_url: e.target.value })} />
          <textarea className="input-clean sm:col-span-2 min-h-[80px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end"><button onClick={create} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="event-submit">{busy && <Loader2 size={16} className="animate-spin" />} Create event</button></div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {events.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No events yet.</div> : events.map((e) => (
          <div key={e.id} className="card-surface p-5" data-testid={`event-card-${e.id}`}>
            <div className="text-xs uppercase tracking-wider text-[var(--brand-accent)]">{e.category} • {e.scope}</div>
            <div className="font-display text-xl text-[var(--brand-primary)] mt-1">{e.title}</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-1 flex items-center gap-1"><Calendar size={14} /> {new Date(e.starts_at).toLocaleString()}</div>
            {e.location && <div className="text-sm text-[var(--text-tertiary)] flex items-center gap-1"><MapPin size={14} /> {e.location}</div>}
            <p className="text-sm text-[var(--text-secondary)] mt-2">{e.description}</p>
            <div className="flex gap-3 mt-3">
              <button onClick={() => rsvp(e.id)} className="btn-primary" data-testid={`event-rsvp-${e.id}`}>I'll attend</button>
              {e.livestream_url && <a href={e.livestream_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[var(--brand-accent)]"><Video size={14} /> Watch</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
