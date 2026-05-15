import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PrayerWall() {
  const [scope, setScope] = useState("global");
  const [prayers, setPrayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [parishId, setParishId] = useState("");
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general", anonymous: false });
  const [busy, setBusy] = useState(false);

  const loadList = (s, pid) => {
    const params = { scope: s };
    if (s === "parish" && pid) params.parish_id = pid;
    if (s === "parish" && !pid) return setPrayers([]);
    http.get("/prayers", { params }).then((r) => setPrayers(r.data)).catch(() => setPrayers([]));
  };

  useEffect(() => {
    http.get("/me/memberships").then((r) => { setMemberships(r.data); if (r.data[0]) setParishId(r.data[0].parish_id); });
    http.get("/settings/prayer_categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => { loadList(scope, parishId); }, [scope, parishId]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and request body are required");
    setBusy(true);
    try {
      const payload = { ...form, scope, parish_id: scope === "parish" ? parishId : null };
      const { data } = await http.post("/prayers", payload);
      setPrayers([data, ...prayers]); setOpen(false);
      setForm({ title: "", body: "", category: "general", anonymous: false });
      toast.success("Prayer submitted");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const prayFor = async (id) => {
    try { await http.post(`/prayers/${id}/prayed`); setPrayers(prayers.map((p) => p.id === id ? { ...p, prayed_count: (p.prayed_count || 0) + 1 } : p)); } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Prayer Wall</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Pray with your family</h1>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["global", "parish"].map((s) => (
            <button key={s} onClick={() => setScope(s)} data-testid={`prayer-tab-${s}`} className={`px-4 py-1.5 rounded-md text-sm border ${scope === s ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"}`}>{s === "global" ? "Global Church" : "My Parish"}</button>
          ))}
          {scope === "parish" && (
            <select value={parishId} onChange={(e) => setParishId(e.target.value)} className="input-clean" data-testid="prayer-parish-select">
              {memberships.map((m) => (<option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>))}
            </select>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className="btn-accent" data-testid="prayer-new-btn">{open ? "Close" : "Submit a prayer"}</button>
      </div>

      {open && (
        <div className="card-surface p-5 slide-up">
          <input className="input-clean" placeholder="Prayer title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="prayer-title" />
          <textarea className="input-clean mt-3 min-h-[120px]" placeholder="Share your request..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="prayer-body" />
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <select className="input-clean" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="prayer-cat">
              {categories.map((c) => (<option key={c.id} value={c.label}>{c.label}</option>))}
            </select>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} data-testid="prayer-anon" /> Post anonymously</label>
          </div>
          <div className="flex justify-end mt-3"><button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="prayer-submit">{busy && <Loader2 size={16} className="animate-spin" />} Submit</button></div>
        </div>
      )}

      <div className="space-y-3">
        {prayers.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No prayer requests yet.</div> : prayers.map((p) => (
          <div key={p.id} className="card-surface p-5" data-testid={`prayer-card-${p.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--brand-accent)]">{p.category} • {p.urgency}</div>
                <div className="font-display text-xl text-[var(--brand-primary)] mt-1">{p.title}</div>
                <div className="text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">{p.body}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-2">— {p.user_name}</div>
              </div>
              <button onClick={() => prayFor(p.id)} className="text-sm inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]" data-testid={`prayed-btn-${p.id}`}>
                <Heart size={14} className="text-[var(--brand-accent)]" /> {p.prayed_count || 0} I prayed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
