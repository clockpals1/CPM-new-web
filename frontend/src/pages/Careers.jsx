import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Technology", location: "", remote: false, scope: "global", contact: "" });
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => http.get("/jobs", { params: { q: q || undefined, location: location || undefined } }).then((r) => setJobs(r.data));
  useEffect(() => { load(); http.get("/settings/job_categories").then((r) => setCats(r.data)); }, []);

  const create = async () => {
    if (!form.title || !form.description) return toast.error("Title and description required");
    setBusy(true);
    try { await http.post("/jobs", form); toast.success("Job posted"); setOpen(false); load(); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const apply = async (id) => { try { await http.post(`/jobs/${id}/apply`, { message: "I am interested." }); toast.success("Application submitted"); } catch (e) { toast.error(formatErr(e)); } };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Careers & Opportunities</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Work, ministry, and growth</h1>
        </div>
        <button onClick={() => setOpen(!open)} className="btn-accent" data-testid="job-new-btn">{open ? "Close" : "Post a job"}</button>
      </div>

      <div className="card-surface p-4 grid sm:grid-cols-3 gap-3">
        <input className="input-clean sm:col-span-2" placeholder="Search title or description" value={q} onChange={(e) => setQ(e.target.value)} data-testid="job-q" />
        <div className="flex gap-2"><input className="input-clean" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="job-loc" /><button onClick={load} className="btn-primary" data-testid="job-search">Search</button></div>
      </div>

      {open && (
        <div className="card-surface p-5 grid sm:grid-cols-2 gap-3 slide-up">
          <input className="input-clean sm:col-span-2" placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="job-title" />
          <textarea className="input-clean sm:col-span-2 min-h-[100px]" placeholder="Job description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="job-desc" />
          <select className="input-clean" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {cats.map((c) => (<option key={c.id} value={c.label}>{c.label}</option>))}
          </select>
          <input className="input-clean" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} /> Remote</label>
          <input className="input-clean" placeholder="Contact (email/phone)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end"><button onClick={create} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="job-submit">{busy && <Loader2 size={16} className="animate-spin" />} Post</button></div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {jobs.map((j) => (
          <div key={j.id} className="card-surface p-5" data-testid={`job-card-${j.id}`}>
            <div className="text-xs uppercase tracking-wider text-[var(--brand-accent)]">{j.category} {j.remote && "• Remote"}</div>
            <div className="font-display text-xl text-[var(--brand-primary)] mt-1 flex items-center gap-2"><Briefcase size={16} /> {j.title}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{j.location || "—"} • Posted by {j.poster_name}</div>
            <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-4">{j.description}</p>
            <button onClick={() => apply(j.id)} className="btn-primary mt-3" data-testid={`job-apply-${j.id}`}>Apply</button>
          </div>
        ))}
        {jobs.length === 0 && <div className="card-surface p-5 col-span-full text-sm text-[var(--text-secondary)]">No openings yet.</div>}
      </div>
    </div>
  );
}
