import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Loader2, Trash2, Plus, BadgeCheck, Shield, FileWarning, History, Zap, ShieldCheck } from "lucide-react";
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
  const [servicePending, setServicePending] = useState([]);
  const load = () => {
    http.get("/memberships/pending").then((r) => setPending(r.data)).catch(() => {});
    http.get("/choir/pending").then((r) => setChoirPending(r.data)).catch(() => {});
    http.get("/service/pending").then((r) => setServicePending(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const approveMembership = async (id) => { try { await http.post(`/memberships/${id}/approve`); toast.success("Approved"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const rejectMembership = async (id) => { try { await http.post(`/memberships/${id}/reject`); load(); } catch {} };
  const verifyChoir = async (id) => { try { await http.post(`/choir/${id}/verify`); toast.success("Choir member verified"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const promote = async (id) => { try { await http.post(`/choir/${id}/promote`); toast.success("Promoted to choir director"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const approveService = async (id) => { try { await http.post(`/service/${id}/approve`); toast.success("Service approved"); load(); } catch (e) { toast.error(formatErr(e)); } };

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
                  <button onClick={() => approveMembership(m.id)} className="btn-primary text-xs px-3 py-1" data-testid={`approve-${m.id}`}>Approve</button>
                  <button onClick={() => rejectMembership(m.id)} className="text-xs px-3 py-1 rounded-md border border-[var(--border-default)]">Reject</button>
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
      <section>
        <h3 className="font-display text-xl mb-2 text-[var(--brand-primary)]">Pending service requests</h3>
        {servicePending.length === 0 ? <div className="text-sm text-[var(--text-secondary)]">No pending service requests.</div> :
          <div className="grid md:grid-cols-2 gap-3">
            {servicePending.map((s) => (
              <div key={s.id} className="card-surface p-4 text-sm" data-testid={`service-pending-${s.id}`}>
                <div className="font-medium">{s.user_name} → {s.service_type}</div>
                <button onClick={() => approveService(s.id)} className="btn-primary text-xs px-3 py-1 mt-2">Approve</button>
              </div>
            ))}
          </div>}
      </section>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState([]);
  const [parishes, setParishes] = useState([]);
  const [badges, setBadges] = useState([]);
  const load = () => http.get("/admin/users").then((r) => setUsers(r.data));
  useEffect(() => {
    load();
    http.get("/parishes").then((r) => setParishes(r.data));
    http.get("/settings/badges").then((r) => setBadges(r.data));
  }, []);
  const setRole = async (uid, role, parish_id) => { try { await http.post(`/admin/users/${uid}/role`, { role, parish_id }); toast.success("Role updated"); load(); } catch (e) { toast.error(formatErr(e)); } };
  const awardBadge = async (uid, badge) => { try { await http.post(`/admin/users/${uid}/badge`, { badge }); toast.success("Badge awarded"); load(); } catch (e) { toast.error(formatErr(e)); } };
  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="card-surface p-4 text-sm flex flex-wrap items-center gap-3" data-testid={`user-${u.id}`}>
          <div className="flex-1 min-w-[180px]">
            <div className="font-medium text-[var(--brand-primary)]">{u.name}</div>
            <div className="text-xs text-[var(--text-tertiary)]">{u.email} • {u.ccc_rank} • {u.country}</div>
            {u.badges?.length > 0 && <div className="text-[10px] mt-1 text-[var(--brand-accent)]">{u.badges.join(" • ")}</div>}
          </div>
          <select defaultValue={u.role} onChange={(e) => setRole(u.id, e.target.value, u.assigned_parish_id)} className="input-clean text-xs max-w-[180px]" data-testid={`role-${u.id}`}>
            {["member", "moderator", "shepherd", "parish_admin", "super_admin"].map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
          <select defaultValue={u.assigned_parish_id || ""} onChange={(e) => setRole(u.id, u.role, e.target.value)} className="input-clean text-xs max-w-[200px]">
            <option value="">No parish assigned</option>
            {parishes.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <select onChange={(e) => e.target.value && awardBadge(u.id, e.target.value)} defaultValue="" className="input-clean text-xs max-w-[180px]" data-testid={`badge-select-${u.id}`}>
            <option value="">Award badge…</option>
            {badges.map((b) => (<option key={b.id} value={b.label}>{b.label}</option>))}
          </select>
        </div>
      ))}
    </div>
  );
}

function ModerationManager() {
  const [reports, setReports] = useState([]);
  const load = () => http.get("/admin/reports", { params: { status: "open" } }).then((r) => setReports(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const act = async (id, action) => { try { await http.post(`/admin/reports/${id}/resolve`, { action }); toast.success(`Report ${action}`); load(); } catch (e) { toast.error(formatErr(e)); } };
  if (reports.length === 0) return <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No open reports.</div>;
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="card-surface p-4 text-sm" data-testid={`report-${r.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-[var(--brand-primary)]">{r.target_type} flagged: <span className="text-[var(--brand-accent)]">{r.reason}</span></div>
              <div className="text-xs text-[var(--text-tertiary)]">By {r.reporter_name} • {new Date(r.created_at).toLocaleString()} • target id: {r.target_id}</div>
              {r.note && <div className="text-xs mt-1">{r.note}</div>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => act(r.id, "dismiss")} className="text-xs px-3 py-1 rounded-md border border-[var(--border-default)]" data-testid={`dismiss-${r.id}`}>Dismiss</button>
              <button onClick={() => act(r.id, "hide")} className="text-xs px-3 py-1 rounded-md border border-orange-700 text-orange-700" data-testid={`hide-${r.id}`}>Hide</button>
              <button onClick={() => act(r.id, "delete")} className="text-xs px-3 py-1 rounded-md bg-red-700 text-white" data-testid={`delete-${r.id}`}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditManager() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { http.get("/admin/audit-logs").then((r) => setLogs(r.data)).catch(() => {}); }, []);
  return (
    <div className="card-surface p-5">
      {logs.length === 0 ? <div className="text-sm text-[var(--text-secondary)]">No audit entries yet.</div> :
        <div className="space-y-2 text-sm">
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 border-b border-[var(--border-default)] pb-2 last:border-0" data-testid={`audit-${l.id}`}>
              <History size={14} className="text-[var(--text-tertiary)] mt-1" />
              <div className="flex-1">
                <div><span className="font-medium">{l.actor_name}</span> <span className="text-[var(--text-tertiary)]">{l.action}</span> → <span className="text-[var(--brand-primary)]">{l.target}</span></div>
                <div className="text-xs text-[var(--text-tertiary)]">{new Date(l.created_at).toLocaleString()} {l.details ? `• ${JSON.stringify(l.details)}` : ""}</div>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

function IntegrationsManager() {
  const [items, setItems] = useState([]);
  const FIELDS = [
    { label: "resend_api_key", title: "Resend API key", desc: "Used for password reset emails and notifications.", secret: true, placeholder: "re_xxx" },
    { label: "resend_from_email", title: "Resend 'From' email", desc: "Verified sender, e.g. CelestialPeopleMeeet <noreply@celestialpeoplemeet.com>", secret: false, placeholder: "noreply@celestialpeoplemeet.com" },
    { label: "google_maps_api_key_public", title: "Google Maps JS API key (public)", desc: "Used by the parish detail map.", secret: false, placeholder: "AIza…" },
    { label: "cloudflare_r2_account_id", title: "Cloudflare R2 account ID", desc: "From your Cloudflare dashboard.", secret: false },
    { label: "cloudflare_r2_access_key_id", title: "Cloudflare R2 access key ID", desc: "", secret: true },
    { label: "cloudflare_r2_secret_access_key", title: "Cloudflare R2 secret", desc: "", secret: true },
    { label: "cloudflare_r2_bucket", title: "Cloudflare R2 bucket name", desc: "", secret: false, placeholder: "celestial-media" },
    { label: "cloudflare_r2_public_url", title: "R2 public base URL", desc: "Custom domain or pub-...r2.dev URL", secret: false, placeholder: "https://media.celestialpeoplemeet.com" },
    { label: "vapid_public_key", title: "VAPID public key (auto-generated)", desc: "Click Generate VAPID below if empty.", secret: false, readonly: true },
  ];
  const load = () => http.get("/integrations").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async (label, value) => {
    try { await http.post("/integrations", { label, value }); toast.success(`${label} saved`); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  const test = async (provider) => {
    try { const { data } = await http.post(`/integrations/test/${provider}`, {}); toast[data.ok ? "success" : "error"](data.message); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  const valueOf = (label) => items.find((i) => i.label === label)?.meta?.value || "";
  const masked = (label) => items.find((i) => i.label === label)?.masked_value || "";
  const has = (label) => items.find((i) => i.label === label)?.has_value || false;

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 flex flex-wrap gap-3 items-center">
        <button onClick={() => test("vapid")} className="btn-primary inline-flex items-center gap-2" data-testid="gen-vapid"><Zap size={14} /> Generate / fetch VAPID keys</button>
        <button onClick={() => test("resend")} className="btn-accent inline-flex items-center gap-2" data-testid="test-resend">Test Resend email</button>
        <span className="text-xs text-[var(--text-tertiary)]">Generated keys are stored in admin settings — never hardcoded.</span>
      </div>
      <div className="grid gap-3">
        {FIELDS.map((f) => (
          <IntegrationRow key={f.label} field={f} currentValue={valueOf(f.label)} masked={masked(f.label)} hasValue={has(f.label)} onSave={save} />
        ))}
      </div>
    </div>
  );
}

function IntegrationRow({ field, currentValue, masked, hasValue, onSave }) {
  const [val, setVal] = useState(currentValue || "");
  useEffect(() => { setVal(currentValue || ""); }, [currentValue]);
  return (
    <div className="card-surface p-4" data-testid={`integration-${field.label}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[var(--brand-primary)]">{field.title}</div>
          <div className="text-xs text-[var(--text-tertiary)]">{field.desc}</div>
          {field.secret && hasValue && <div className="text-[10px] text-[var(--brand-accent)] mt-1">Currently set: {masked}</div>}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type={field.secret ? "password" : "text"}
            className="input-clean text-sm flex-1 sm:w-80"
            placeholder={field.placeholder || (field.secret ? "Paste new value…" : "")}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            readOnly={field.readonly}
            data-testid={`integration-input-${field.label}`}
          />
          {!field.readonly && <button onClick={() => onSave(field.label, val)} className="btn-primary text-sm" data-testid={`integration-save-${field.label}`}>Save</button>}
        </div>
      </div>
    </div>
  );
}

function ShepherdEndorsementManager() {
  const [users, setUsers] = useState([]);
  const [parishes, setParishes] = useState([]);
  const [pick, setPick] = useState({});
  const [endorsements, setEndorsements] = useState([]);

  const load = () => {
    http.get("/admin/users").then((r) => setUsers(r.data));
    http.get("/parishes").then((r) => setParishes(r.data));
    http.get("/shepherds").then((r) => setEndorsements(r.data));
  };
  useEffect(() => { load(); }, []);

  const endorse = async (uid) => {
    const parish_id = pick[uid];
    if (!parish_id) return toast.error("Pick a parish first");
    try { await http.post(`/admin/users/${uid}/endorse-shepherd`, { parish_id, note: "Verified shepherd for this parish." }); toast.success("Endorsed"); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  const revoke = async (eid) => {
    try { await http.delete(`/admin/endorsements/${eid}`); toast.success("Revoked"); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-display text-xl mb-2 text-[var(--brand-primary)] flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--brand-accent)]" /> Active Endorsements</h3>
        {endorsements.length === 0 ? <div className="card-surface p-4 text-sm text-[var(--text-secondary)]">No endorsements yet.</div> :
          <div className="grid sm:grid-cols-2 gap-3">
            {endorsements.map((e) => (
              <div key={e.id} className="card-surface p-4 text-sm border-l-4 border-[var(--brand-accent)]" data-testid={`endorsement-${e.id}`}>
                <div className="font-medium">{e.user_name} <span className="text-[var(--brand-accent)] text-xs">Verified Shepherd</span></div>
                <div className="text-xs text-[var(--text-tertiary)]">{e.parish_name} • by {e.endorser_name}</div>
                <button onClick={() => revoke(e.id)} className="text-xs text-red-700 mt-2" data-testid={`revoke-${e.id}`}>Revoke</button>
              </div>
            ))}
          </div>}
      </section>
      <section>
        <h3 className="font-display text-xl mb-2 text-[var(--brand-primary)]">Endorse a member</h3>
        <div className="space-y-2">
          {users.filter((u) => u.role !== "super_admin").map((u) => (
            <div key={u.id} className="card-surface p-3 text-sm flex flex-wrap items-center gap-3" data-testid={`endorse-row-${u.id}`}>
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium text-[var(--brand-primary)]">{u.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{u.ccc_rank} • {u.country}</div>
              </div>
              <select value={pick[u.id] || ""} onChange={(ev) => setPick({ ...pick, [u.id]: ev.target.value })} className="input-clean text-xs max-w-[240px]" data-testid={`endorse-parish-${u.id}`}>
                <option value="">Select parish</option>
                {parishes.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <button onClick={() => endorse(u.id)} className="btn-accent text-xs px-3 py-1" data-testid={`endorse-btn-${u.id}`}>Endorse as Shepherd</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("settings");
  const TABS = [
    { k: "settings", l: "Settings & Catalog", icon: BadgeCheck },
    { k: "parishes", l: "Parishes", icon: Plus },
    { k: "approvals", l: "Approvals", icon: BadgeCheck },
    { k: "users", l: "Users & Roles", icon: Shield },
    { k: "endorsements", l: "Shepherd Endorsements", icon: ShieldCheck },
    { k: "moderation", l: "Moderation", icon: FileWarning },
    { k: "integrations", l: "Integrations", icon: Zap },
    { k: "audit", l: "Audit Log", icon: History },
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Administration</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Admin Console</h1>
      </div>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} data-testid={`admin-tab-${t.k}`} className={`px-4 py-2 rounded-md border text-sm inline-flex items-center gap-2 ${tab === t.k ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"}`}>
            <t.icon size={14} /> {t.l}
          </button>
        ))}
      </div>
      {tab === "settings" && <SettingsManager />}
      {tab === "parishes" && <ParishesManager />}
      {tab === "approvals" && <ApprovalsManager />}
      {tab === "users" && <UsersManager />}
      {tab === "endorsements" && <ShepherdEndorsementManager />}
      {tab === "moderation" && <ModerationManager />}
      {tab === "integrations" && <IntegrationsManager />}
      {tab === "audit" && <AuditManager />}
    </div>
  );
}
