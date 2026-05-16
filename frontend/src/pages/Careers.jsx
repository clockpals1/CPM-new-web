import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Briefcase, Loader2, Bookmark, BookmarkCheck, MapPin, Globe, Building,
  CheckCircle, Clock, X, Plus, Search,
} from "lucide-react";
import { toast } from "sonner";

const TABS = ["Browse", "Saved", "Applications"];

function JobCard({ j, saved: initSaved, applied: initApplied, onApply }) {
  const [saved, setSaved] = useState(initSaved || false);
  const [applied, setApplied] = useState(initApplied || false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleSave = async (e) => {
    e.stopPropagation();
    try {
      if (saved) { await http.delete(`/jobs/${j.id}/save`); setSaved(false); toast.success("Removed from saved"); }
      else { await http.post(`/jobs/${j.id}/save`); setSaved(true); toast.success("Job saved"); }
    } catch (ex) { toast.error(formatErr(ex)); }
  };

  const submitApply = async () => {
    setBusy(true);
    try {
      await http.post(`/jobs/${j.id}/apply`, { message: msg || "I am interested in this opportunity." });
      setApplied(true); setApplyOpen(false);
      toast.success("Application submitted");
      if (onApply) onApply(j.id);
    } catch (ex) { toast.error(formatErr(ex)); } finally { setBusy(false); }
  };

  return (
    <div className="card-surface p-5 flex flex-col gap-3" data-testid={`job-card-${j.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-accent)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded">{j.category}</span>
            {j.remote && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">Remote</span>}
            {j.scope === "parish" && <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">Parish</span>}
          </div>
          <div className="font-display text-xl text-[var(--brand-primary)] mt-1">{j.title}</div>
          <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-3 mt-1 flex-wrap">
            {j.location && <span className="flex items-center gap-1"><MapPin size={10} /> {j.location}</span>}
            <span className="flex items-center gap-1"><Building size={10} /> {j.poster_name}</span>
          </div>
        </div>
        <button onClick={toggleSave} className={`p-2 rounded-lg border transition-colors shrink-0 ${saved ? "bg-[var(--brand-accent)]/10 border-[var(--brand-accent)]/30 text-[var(--brand-accent)]" : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--brand-accent)]"}`} data-testid={`save-${j.id}`}>
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>

      <p className="text-sm text-[var(--text-secondary)] line-clamp-3 flex-1">{j.description}</p>

      {j.contact && <div className="text-xs text-[var(--text-tertiary)]">Contact: <span className="text-[var(--brand-accent)]">{j.contact}</span></div>}

      {applyOpen ? (
        <div className="border-t border-[var(--border-default)] pt-3 space-y-2">
          <textarea className="input-clean text-sm min-h-[70px] resize-none" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Optional message to the poster…" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setApplyOpen(false)} className="text-sm px-3 py-1.5 text-[var(--text-secondary)]">Cancel</button>
            <button onClick={submitApply} disabled={busy} className="btn-primary text-sm inline-flex items-center gap-1" data-testid={`job-apply-confirm-${j.id}`}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Submit
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => applied ? undefined : setApplyOpen(true)}
          disabled={applied}
          className={`text-sm px-4 py-1.5 rounded-md border inline-flex items-center gap-1.5 w-fit transition-colors ${applied ? "border-emerald-200 text-emerald-700 bg-emerald-50 cursor-default" : "btn-primary"}`}
          data-testid={`job-apply-${j.id}`}
        >
          {applied ? <><CheckCircle size={13} /> Applied</> : <><Briefcase size={13} /> Apply</>}
        </button>
      )}
    </div>
  );
}

export default function Careers() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Browse");
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [cat, setCat] = useState("");
  const [cats, setCats] = useState([]);
  const [postOpen, setPostOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", location: "", remote: false, scope: "global", contact: "" });
  const [busy, setBusy] = useState(false);
  const [appliedIds, setAppliedIds] = useState(new Set());

  useEffect(() => {
    http.get("/settings/job_categories").then((r) => { setCats(r.data); if (r.data[0]) setForm((f) => ({ ...f, category: r.data[0].label })); }).catch(() => {});
    http.get("/me/applications").then((r) => { setApplications(r.data); setAppliedIds(new Set(r.data.map((a) => a.job_id))); }).catch(() => {});
    http.get("/me/saved-jobs").then((r) => setSaved(r.data)).catch(() => {});
  }, []);

  const loadJobs = useCallback(() => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (location) params.location = location;
    if (remoteOnly) params.remote = true;
    http.get("/jobs", { params }).then((r) => setJobs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [q, location, remoteOnly]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const create = async () => {
    if (!form.title || !form.description) return toast.error("Title and description required");
    setBusy(true);
    try { await http.post("/jobs", form); toast.success("Job posted"); setPostOpen(false); loadJobs(); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const savedIds = new Set(saved.map((j) => j.id));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Careers & Opportunities</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Work, ministry, and growth</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Opportunities posted by and for the Celestial community.</p>
        </div>
        <button onClick={() => setPostOpen((s) => !s)} className="btn-accent inline-flex items-center gap-1.5" data-testid="job-new-btn">
          <Plus size={15} /> {postOpen ? "Close" : "Post opportunity"}
        </button>
      </div>

      {/* Post form */}
      {postOpen && (
        <div className="card-surface p-5 grid sm:grid-cols-2 gap-3 slide-up">
          <div className="sm:col-span-2 text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">New Opportunity</div>
          <input className="input-clean sm:col-span-2" placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="job-title" />
          <textarea className="input-clean sm:col-span-2 min-h-[100px] resize-none" placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="job-desc" />
          <select className="input-clean" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {cats.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
          </select>
          <input className="input-clean" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input-clean" placeholder="Contact email / phone" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <div className="flex gap-4 items-center">
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} /> Remote</label>
            <select className="input-clean" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="global">Global</option>
              <option value="parish">Parish only</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={create} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="job-submit">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={15} />} Post
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md border text-sm ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
            {t}
            {t === "Saved" && saved.length > 0 && <span className="ml-1.5 text-[10px] bg-[var(--brand-accent)] text-white rounded-full px-1.5">{saved.length}</span>}
            {t === "Applications" && applications.length > 0 && <span className="ml-1.5 text-[10px] bg-emerald-600 text-white rounded-full px-1.5">{applications.length}</span>}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {tab === "Browse" && (
        <>
          <div className="card-surface p-4 flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input className="input-clean pl-8 w-full" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadJobs()} data-testid="job-q" />
            </div>
            <input className="input-clean w-36" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="job-loc" />
            <label className="text-sm flex items-center gap-1.5 text-[var(--text-secondary)]">
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only
            </label>
            <button onClick={loadJobs} className="btn-primary text-sm" data-testid="job-search">Search</button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card-surface p-5 h-40 animate-pulse" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="card-surface p-10 text-center"><Briefcase size={32} className="mx-auto text-[var(--text-tertiary)] mb-2" /><p className="text-sm text-[var(--text-secondary)]">No openings yet. Check back soon.</p></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {jobs.map((j) => <JobCard key={j.id} j={j} saved={savedIds.has(j.id)} applied={appliedIds.has(j.id)} onApply={(id) => setAppliedIds((s) => new Set([...s, id]))} />)}
            </div>
          )}
        </>
      )}

      {/* Saved tab */}
      {tab === "Saved" && (
        saved.length === 0 ? (
          <div className="card-surface p-10 text-center"><Bookmark size={32} className="mx-auto text-[var(--text-tertiary)] mb-2" /><p className="text-sm text-[var(--text-secondary)]">No saved jobs yet. Bookmark jobs while browsing.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {saved.map((j) => <JobCard key={j.id} j={j} saved applied={appliedIds.has(j.id)} onApply={(id) => setAppliedIds((s) => new Set([...s, id]))} />)}
          </div>
        )
      )}

      {/* Applications tab */}
      {tab === "Applications" && (
        applications.length === 0 ? (
          <div className="card-surface p-10 text-center"><Clock size={32} className="mx-auto text-[var(--text-tertiary)] mb-2" /><p className="text-sm text-[var(--text-secondary)]">No applications submitted yet.</p></div>
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a.id} className="card-surface p-4 flex items-start gap-4" data-testid={`application-${a.id}`}>
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] grid place-items-center shrink-0"><Briefcase size={18} className="text-[var(--brand-accent)]" /></div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--brand-primary)]">{a.job?.title || "Job"}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{a.job?.category} {a.job?.location && `· ${a.job.location}`}</div>
                  {a.message && <p className="text-sm text-[var(--text-secondary)] mt-1 italic">"{a.message}"</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${a.status === "submitted" ? "bg-blue-50 text-blue-700 border-blue-200" : a.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
