import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Testimonies() {
  const [items, setItems] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [scope, setScope] = useState("global");
  const [parishId, setParishId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    const params = { scope };
    if (scope === "parish" && parishId) params.parish_id = parishId;
    http.get("/testimonies", { params }).then((r) => setItems(r.data));
  };
  useEffect(() => {
    http.get("/me/memberships").then((r) => { setMemberships(r.data); if (r.data[0]) setParishId(r.data[0].parish_id); });
  }, []);
  useEffect(() => { load(); }, [scope, parishId]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body required");
    setBusy(true);
    try {
      await http.post("/testimonies", { ...form, scope, parish_id: scope === "parish" ? parishId : null });
      toast.success("Testimony posted");
      setForm({ title: "", body: "" }); setOpen(false); load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Testimonies & Harvest</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Share what the Lord has done</h1>
        </div>
        <button onClick={() => setOpen(!open)} className="btn-accent" data-testid="testimony-new-btn">{open ? "Close" : "Share testimony"}</button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {["global", "parish"].map((s) => (
          <button key={s} onClick={() => setScope(s)} data-testid={`testimony-tab-${s}`} className={`px-4 py-1.5 rounded-md text-sm border ${scope === s ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"}`}>{s === "global" ? "Global" : "My Parish"}</button>
        ))}
        {scope === "parish" && (
          <select value={parishId} onChange={(e) => setParishId(e.target.value)} className="input-clean">
            {memberships.map((m) => (<option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>))}
          </select>
        )}
      </div>

      {open && (
        <div className="card-surface p-5 slide-up">
          <input className="input-clean" placeholder="Testimony title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="testimony-title" />
          <textarea className="input-clean mt-3 min-h-[120px]" placeholder="Share your story…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="testimony-body" />
          <div className="flex justify-end mt-3"><button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="testimony-submit">{busy && <Loader2 size={16} className="animate-spin" />} Post</button></div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {items.length === 0 ? <div className="card-surface p-5 col-span-full text-sm text-[var(--text-secondary)]">No testimonies yet.</div> : items.map((t) => (
          <div key={t.id} className="card-surface p-5" data-testid={`testimony-${t.id}`}>
            <Sparkles size={16} className="text-[var(--brand-accent)]" />
            <div className="font-display text-xl text-[var(--brand-primary)] mt-1">{t.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap line-clamp-6">{t.body}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-3">— {t.user_name} • {new Date(t.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
