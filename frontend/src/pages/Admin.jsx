import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Loader2, Trash2, Plus, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

const KEYS = [
  { key: "ccc_ranks", label: "CCC Ranks & Titles" },
  { key: "badges", label: "Recognition Badges" },
  { key: "event_categories", label: "Event Categories" },
  { key: "service_types", label: "Service Team Types" },
  { key: "prayer_categories", label: "Prayer Categories" },
  { key: "job_categories", label: "Job Categories" },
  { key: "report_reasons", label: "Report Reasons" },
];

function SettingsManager() {
  const [activeKey, setActiveKey] = useState("ccc_ranks");
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const load = () => http.get(`/settings/${activeKey}`).then((r) => setItems(r.data));
  useEffect(() => { load(); }, [activeKey]);
  const add = async () => {
    if (!newLabel.trim()) return;
    try { await http.post("/settings", { key: activeKey, label: newLabel, order: items.length }); setNewLabel(""); toast.success("Added"); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  const remove = async (id) => { try { await http.delete(`/settings/${id}`); load(); } catch (e) { toast.error(formatErr(e)); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KEYS.map((k) => (
          <button key={k.key} onClick={() => setActiveKey(k.key)} data-testid={`setting-tab-${k.key}`} className={`px-3 py-1.5 text-sm rounded-md border ${activeKey === k.key ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"}`}>{k.label}</button>
        ))}
      </div>
      <div className="card-surface p-5">
        <div className="flex gap-2 mb-4">
          <input className="input-clean" placeholder="Add new value..." value={newLabel} onChange={(e) => setNewLabel(e.target.value)} data-testid="setting-new-input" />
          <button onClick={add} className="btn-primary inline-flex items-center gap-1" data-testid="setting-add"><Plus size={14} /> Add</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border border-[var(--border-default)] rounded-md px-3 py-2 text-sm" data-testid={`setting-item-${it.id}`}>
              <span>{it.label}</span>
              <button onClick={() => remove(it.id)} className="text-red-700"><Trash2 size={14} /></button>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-[var(--text-secondary)]">No items.</div>}
        </div>
      </div>
    </div>
  );
}

function ParishesManager() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: "", country: "", city: "", address: "", shepherd_name: "", phone: "", service_times: "", description: "" });
  const load = () => http.get("/parishes").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => {
    try { await http.post("/parishes", form); toast.success("Parish created"); setForm({ name: "", country: "", city: "", address: "", shepherd_name: "", phone: "", service_times: "", description: "" }); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="card-surface p-5 grid sm:grid-cols-2 gap-3">
        <input className="input-clean" placeholder="Parish name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="ap-name" />
        <input className="input-clean" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="ap-country" />
        <input className="input-clean" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="ap-city" />
        <input className="input-clean" placeholder="Shepherd name" value={form.shepherd_name} onChange={(e) => setForm({ ...form, shepherd_name: e.target.value })} />
        <input className="input-clean" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="input-clean" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input-clean sm:col-span-2" placeholder="Service times" value={form.service_times} onChange={(e) => setForm({ ...form, service_times: e.target.value })} />
        <textarea className="input-clean sm:col-span-2 min-h-[60px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="sm:col-span-2 flex justify-end"><button onClick={create} className="btn-primary" data-testid="ap-create">Create parish</button></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((p) => (
          <div key={p.id} className="card-surface p-4 text-sm" data-testid={`admin-parish-${p.id}`}>
            <div className="font-medium text-[var(--brand-primary)]">{p.name}</div>
            <div className="text-xs text-[var(--text-tertiary)]">{p.city}, {p.country}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalsManager() {
  const [pending, setPending] = useState([]);
  const [choirPending, setChoirPending] = useState([]);
  const load = () => {
    http.get("/memberships/pending").then((r) => setPending(r.data)).catch(() => {});
    http.get("/choir/pending").then((r) => setChoirPending(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const approve = async (id) => { try { await http.post(`/memberships/${id}/approve`); toast.success("Approved"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const reject = async (id) => { try { await http.post(`/memberships/${id}/reject`); load(); } catch {} };
  const verifyChoir = async (id) => { try { await http.post(`/choir/${id}/verify`); toast.success("Choir member verified"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const promote = async (id) => { try { await http.post(`/choir/${id}/promote`); toast.success("Promoted to choir director"); load(); } catch (e) { toast.error(formatErr(e)); } };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-display text-xl mb-2 text-[var(--brand-primary)]">Pending parish memberships</h3>
        {pending.length === 0 ? <div className="text-sm text-[var(--text-secondary)]">No pending requests.</div> :
          <div className="grid md:grid-cols-2 gap-3">
            {pending.map((m) => (
              <div key={m.id} className="card-surface p-4 text-sm" data-testid={`pending-${m.id}`}>
                <div className="font-medium">{m.user?.name} → {m.parish?.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.user?.ccc_rank} • {m.user?.country}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => approve(m.id)} className="btn-primary text-xs px-3 py-1" data-testid={`approve-${m.id}`}>Approve</button>
                  <button onClick={() => reject(m.id)} className="text-xs px-3 py-1 rounded-md border border-[var(--border-default)]">Reject</button>
                </div>
              </div>
            ))}
          </div>}
      </section>
      <section>
        <h3 className="font-display text-xl mb-2 text-[var(--brand-primary)]">Pending choir verifications</h3>
        {choirPending.length === 0 ? <div className="text-sm text-[var(--text-secondary)]">No pending choir requests.</div> :
          <div className="grid md:grid-cols-2 gap-3">
            {choirPending.map((c) => (
              <div key={c.id} className="card-surface p-4 text-sm" data-testid={`choir-pending-${c.id}`}>
                <div className="font-medium">{c.user_name} <span className="text-[var(--text-tertiary)]">({c.voice_part})</span></div>
                <div className="text-xs text-[var(--text-tertiary)]">{c.parish?.name}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => verifyChoir(c.id)} className="btn-primary text-xs px-3 py-1 inline-flex items-center gap-1" data-testid={`verify-choir-${c.id}`}><BadgeCheck size={12} /> Verify</button>
                  <button onClick={() => promote(c.id)} className="text-xs px-3 py-1 rounded-md border border-[var(--brand-accent)] text-[var(--brand-accent)]" data-testid={`promote-${c.id}`}>Promote to Director</button>
                </div>
              </div>
            ))}
          </div>}
      </section>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("settings");
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Administration</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Admin Console</h1>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ k: "settings", l: "Settings & Catalog" }, { k: "parishes", l: "Parishes" }, { k: "approvals", l: "Approvals" }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} data-testid={`admin-tab-${t.k}`} className={`px-4 py-2 rounded-md border text-sm ${tab === t.k ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"}`}>{t.l}</button>
        ))}
      </div>
      {tab === "settings" && <SettingsManager />}
      {tab === "parishes" && <ParishesManager />}
      {tab === "approvals" && <ApprovalsManager />}
    </div>
  );
}
