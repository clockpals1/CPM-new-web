import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { Loader2, Trash2, Plus, BadgeCheck, Shield, FileWarning, History, Zap, ShieldCheck, MapPin, Heart, CheckCircle, AlertCircle, Music, CalendarClock, Megaphone, Users, Upload, Download, Bot, FileText, Sparkles, PlayCircle, BookOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const KEYS = [
  { key: "ccc_ranks", label: "CCC Ranks & Titles" },
  { key: "badges", label: "Recognition Badges" },
  { key: "event_categories", label: "Event Categories" },
  { key: "service_types", label: "Service Team Types" },
  { key: "prayer_categories", label: "Prayer Categories" },
  { key: "job_categories", label: "Job Categories" },
  { key: "report_reasons", label: "Report Reasons" },
  { key: "livestream_providers", label: "Livestream Providers" },
];

function SettingsManager() {
  const [activeKey, setActiveKey] = useState("ccc_ranks");
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const load = () => http.get(`/settings/${activeKey}`).then((r) => setItems(r.data));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

const BLANK_PARISH = { name: "", country: "", state: "", city: "", address: "", shepherd_name: "", phone: "", website: "", service_times: "", description: "", image_url: "", lat: "", lng: "", status: "active", join_mode: "request_only", choir_enabled: true, ministries_enabled: true };

function ParishForm({ value, onChange }) {
  const f = (k) => (e) => onChange({ ...value, [k]: e.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <input className="input-clean sm:col-span-2" placeholder="Parish name *" value={value.name} onChange={f("name")} data-testid="ap-name" />
      <input className="input-clean" placeholder="Country *" value={value.country} onChange={f("country")} data-testid="ap-country" />
      <input className="input-clean" placeholder="State / Region" value={value.state} onChange={f("state")} />
      <input className="input-clean" placeholder="City *" value={value.city} onChange={f("city")} data-testid="ap-city" />
      <input className="input-clean" placeholder="Shepherd name" value={value.shepherd_name} onChange={f("shepherd_name")} />
      <input className="input-clean sm:col-span-2" placeholder="Full address" value={value.address} onChange={f("address")} />
      <input className="input-clean" placeholder="Phone" value={value.phone} onChange={f("phone")} />
      <input className="input-clean" placeholder="Website URL" value={value.website} onChange={f("website")} />
      <input className="input-clean sm:col-span-2" placeholder="Service / worship times (e.g. Sun 9am, Wed 6pm)" value={value.service_times} onChange={f("service_times")} />
      <input className="input-clean sm:col-span-2" placeholder="Image URL (parish banner or logo)" value={value.image_url} onChange={f("image_url")} />
      <input className="input-clean" placeholder="Latitude (e.g. 6.5244)" type="number" step="any" value={value.lat} onChange={f("lat")} data-testid="ap-lat" />
      <input className="input-clean" placeholder="Longitude (e.g. 3.3792)" type="number" step="any" value={value.lng} onChange={f("lng")} data-testid="ap-lng" />
      <select className="input-clean" value={value.join_mode} onChange={f("join_mode")} data-testid="ap-join-mode">
        <option value="request_only">Join Mode: By Request (admin approval required)</option>
        <option value="location_based">Join Mode: Location-based (auto-approve same country)</option>
        <option value="open">Join Mode: Open (anyone joins directly)</option>
      </select>
      <select className="input-clean" value={value.status} onChange={f("status")} data-testid="ap-status">
        <option value="active">Status: Active</option>
        <option value="inactive">Status: Inactive</option>
      </select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={Boolean(value.choir_enabled)} onChange={f("choir_enabled")} className="w-4 h-4 accent-[var(--brand-primary)]" /> Choir enabled
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={Boolean(value.ministries_enabled)} onChange={f("ministries_enabled")} className="w-4 h-4 accent-[var(--brand-primary)]" /> Ministries enabled
      </label>
      <textarea className="input-clean sm:col-span-2 min-h-[70px]" placeholder="About this parish…" value={value.description} onChange={f("description")} />
    </div>
  );
}

function ParishesManager() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(BLANK_PARISH);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [stats, setStats] = useState({});
  const [creating, setCreating] = useState(false);

  const load = () => http.get("/parishes", { params: { status: undefined } }).then((r) => {
    setList(r.data);
    r.data.forEach((p) => {
      http.get(`/parishes/${p.id}/stats`).then((s) => setStats((prev) => ({ ...prev, [p.id]: s.data }))).catch(() => {});
    });
  });
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.country || !form.city) return toast.error("Name, country, and city are required.");
    setCreating(true);
    try {
      await http.post("/parishes", { ...form, lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null });
      toast.success("Parish created"); setForm(BLANK_PARISH); load();
    } catch (e) { toast.error(formatErr(e)); } finally { setCreating(false); }
  };

  const saveEdit = async (pid) => {
    try {
      await http.patch(`/parishes/${pid}`, { ...editForm, lat: editForm.lat ? parseFloat(editForm.lat) : null, lng: editForm.lng ? parseFloat(editForm.lng) : null });
      toast.success("Parish updated"); setEditing(null); setEditForm(null); load();
    } catch (e) { toast.error(formatErr(e)); }
  };

  const toggleStatus = async (p) => {
    const next = p.status === "active" ? "inactive" : "active";
    try { await http.patch(`/parishes/${p.id}`, { status: next }); toast.success(`Parish ${next}`); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  const remove = async (pid, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await http.delete(`/parishes/${pid}`); toast.success("Deleted"); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card-surface p-5">
        <h3 className="font-display text-xl text-[var(--brand-primary)] mb-4 flex items-center gap-2"><Plus size={16} /> Create new parish</h3>
        <ParishForm value={form} onChange={setForm} />
        <div className="flex justify-end mt-4">
          <button onClick={create} disabled={creating} className="btn-primary inline-flex items-center gap-2" data-testid="ap-create">
            {creating && <Loader2 size={14} className="animate-spin" />} Create Parish
          </button>
        </div>
      </div>

      {/* Parish list */}
      <div className="space-y-3">
        <div className="text-sm text-[var(--text-tertiary)] font-medium">All parishes ({list.length})</div>
        {list.map((p) => (
          <div key={p.id} className="card-surface" data-testid={`admin-parish-${p.id}`}>
            {editing === p.id ? (
              <div className="p-5 space-y-4">
                <ParishForm value={editForm} onChange={setEditForm} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditing(null); setEditForm(null); }} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md">Cancel</button>
                  <button onClick={() => saveEdit(p.id)} className="btn-primary text-sm" data-testid={`save-parish-${p.id}`}>Save changes</button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-[var(--brand-primary)]">{p.name}</div>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-semibold ${p.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{p.status}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase">{p.join_mode?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{[p.city, p.state, p.country].filter(Boolean).join(", ")}</div>
                  {p.shepherd_name && <div className="text-xs text-[var(--text-secondary)] mt-0.5">Shepherd: {p.shepherd_name}</div>}
                  {stats[p.id] && <div className="text-xs text-[var(--brand-accent)] mt-1">{stats[p.id].member_count} member{stats[p.id].member_count !== 1 ? "s" : ""} • {stats[p.id].pending_count} pending</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setEditing(p.id); setEditForm({ ...BLANK_PARISH, ...p, lat: p.lat ?? "", lng: p.lng ?? "" }); }} className="text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:border-[var(--brand-primary)]" data-testid={`edit-parish-${p.id}`}>Edit</button>
                  <button onClick={() => toggleStatus(p)} className={`text-xs px-3 py-1.5 rounded-md border ${p.status === "active" ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`} data-testid={`toggle-parish-${p.id}`}>
                    {p.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => remove(p.id, p.name)} className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50" data-testid={`delete-parish-${p.id}`}><Trash2 size={12} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="card-surface p-6 text-sm text-[var(--text-secondary)] text-center">No parishes yet. Create the first one above.</div>}
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
    { group: "AI Assistant", label: "openai_api_key", title: "OpenAI API key", desc: "Used for the CPM Assistant chatbot and AI-generated daily feed posts. Get yours at platform.openai.com.", secret: true, placeholder: "sk-…" },
    { label: "daily_posts_enabled", title: "Daily Posts enabled", desc: "Set to 'true' to enable automatic daily devotion/prayer/verse/music posts. Requires OpenAI key above.", secret: false, placeholder: "true" },
    { group: "Parish Join Rules", label: "global_join_mode", title: "Global join mode", desc: "per_parish = each parish decides; open = anyone joins directly; location_based = same-country auto-approve; request_only = always admin approval.", secret: false, placeholder: "per_parish" },
    { label: "max_parish_memberships", title: "Max parish memberships per user", desc: "How many active + pending memberships a user may hold (default: 2).", secret: false, placeholder: "2" },
    { label: "join_state_match_required", title: "Require state match for location-based join", desc: "Set true to also require state/region match in addition to country (default: false).", secret: false, placeholder: "false" },
    { group: "Email (Resend)", label: "resend_api_key", title: "Resend API key", desc: "Used for password reset emails and notifications.", secret: true, placeholder: "re_xxx" },
    { label: "resend_from_email", title: "Resend 'From' email", desc: "Verified sender, e.g. CelestialPeopleMeeet <noreply@celestialpeoplemeet.com>", secret: false, placeholder: "noreply@celestialpeoplemeet.com" },
    { group: "Maps & Directions", label: "google_maps_api_key_public", title: "Google Maps JS API key (public)", desc: "Used by the parish detail embedded map. Must have Maps Embed API enabled.", secret: false, placeholder: "AIza…" },
    { group: "Storage (Cloudflare R2)", label: "cloudflare_r2_account_id", title: "Cloudflare R2 account ID", desc: "From your Cloudflare dashboard.", secret: false },
    { label: "cloudflare_r2_access_key_id", title: "Cloudflare R2 access key ID", desc: "", secret: true },
    { label: "cloudflare_r2_secret_access_key", title: "Cloudflare R2 secret", desc: "", secret: true },
    { label: "cloudflare_r2_bucket", title: "Cloudflare R2 bucket name", desc: "", secret: false, placeholder: "celestial-media" },
    { label: "cloudflare_r2_public_url", title: "R2 public base URL", desc: "Custom domain or pub-...r2.dev URL", secret: false, placeholder: "https://media.celestialpeoplemeet.com" },
    { group: "Push Notifications", label: "vapid_public_key", title: "VAPID public key (auto-generated)", desc: "Click Generate VAPID below if empty.", secret: false, readonly: true },
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
          <React.Fragment key={f.label}>
            {f.group && <div className="pt-2 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)] border-b border-[var(--border-default)]">{f.group}</div>}
            <IntegrationRow field={f} currentValue={valueOf(f.label)} masked={masked(f.label)} hasValue={has(f.label)} onSave={save} />
          </React.Fragment>
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

function PrayerModerationManager() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const load = () => {
    setLoading(true);
    http.get("/admin/prayers/moderation")
      .then((r) => setQueue(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (pid, action) => {
    setBusy((b) => ({ ...b, [pid]: action }));
    try {
      await http.patch(`/admin/prayers/${pid}`, { action });
      toast.success(action === "remove" ? "Prayer removed" : action === "archive" ? "Prayer archived" : "Prayer restored");
      load();
    } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy((b) => { const n = { ...b }; delete n[pid]; return n; }); }
  };

  if (loading) return <div className="text-sm text-[var(--text-secondary)] animate-pulse">Loading moderation queue…</div>;

  if (queue.length === 0) {
    return (
      <div className="card-surface p-8 text-center space-y-2">
        <CheckCircle size={28} className="mx-auto text-emerald-500" />
        <p className="font-display text-xl text-[var(--brand-primary)]">All clear</p>
        <p className="text-sm text-[var(--text-secondary)]">No prayer requests have been reported.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
        <AlertCircle size={15} className="text-amber-600" />
        {queue.length} prayer request{queue.length !== 1 ? "s" : ""} flagged for review, sorted by report count.
      </div>
      {queue.map((p) => (
        <div key={p.id} className="card-surface overflow-hidden" data-testid={`prayer-mod-${p.id}`}>
          <div className="border-l-4 border-amber-400 px-5 py-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    {p.report_count} report{p.report_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{p.scope === "parish" ? "Parish wall" : "Global wall"}</span>
                  <span className={`text-xs font-semibold uppercase rounded-full px-2 py-0.5 border ${
                    p.status === "removed" ? "bg-red-50 text-red-700 border-red-200" :
                    p.status === "archived" ? "bg-gray-100 text-gray-500 border-gray-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>{p.status}</span>
                </div>
                <h4 className="font-display text-lg text-[var(--brand-primary)]">{p.title}</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-3">{p.body}</p>
                <div className="text-xs text-[var(--text-tertiary)] mt-2">
                  By {p.anonymous ? "Anonymous" : p.user_name} •
                  Report reasons: <span className="text-amber-700">{[...new Set(p.report_reasons)].join(", ") || "none specified"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {p.status !== "removed" && (
                  <button
                    onClick={() => act(p.id, "remove")}
                    disabled={!!busy[p.id]}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                    data-testid={`prayer-remove-${p.id}`}
                  >
                    {busy[p.id] === "remove" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Remove
                  </button>
                )}
                {p.status !== "archived" && p.status !== "removed" && (
                  <button
                    onClick={() => act(p.id, "archive")}
                    disabled={!!busy[p.id]}
                    className="text-xs px-3 py-1.5 rounded-md border border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    data-testid={`prayer-archive-${p.id}`}
                  >
                    Archive
                  </button>
                )}
                {(p.status === "removed" || p.status === "archived") && (
                  <button
                    onClick={() => act(p.id, "restore")}
                    disabled={!!busy[p.id]}
                    className="text-xs px-3 py-1.5 rounded-md border border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    data-testid={`prayer-restore-${p.id}`}
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Choir Hub Manager ────────────────────────────────────────────────────
function ChoirHubManager() {
  const [parishes, setParishes] = useState([]);
  const [selectedPid, setSelectedPid] = useState("");
  const [pending, setPending] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [subTab, setSubTab] = useState("pending");
  const [busy, setBusy] = useState({});

  useEffect(() => {
    http.get("/parishes").then((r) => {
      setParishes(r.data);
      if (r.data[0]) setSelectedPid(r.data[0].id);
    }).catch(() => {});
    http.get("/choir/pending").then((r) => setPending(r.data)).catch(() => {});
  }, []);

  const loadParishData = useCallback(() => {
    if (!selectedPid) return;
    http.get("/rehearsals", { params: { parish_id: selectedPid } }).then((r) => setRehearsals(r.data)).catch(() => {});
    http.get("/choir/announcements", { params: { parish_id: selectedPid } }).then((r) => setAnnouncements(r.data)).catch(() => {});
  }, [selectedPid]);

  useEffect(() => { loadParishData(); }, [loadParishData]);

  const verify = async (cid) => {
    setBusy((b) => ({ ...b, [cid]: true }));
    try { await http.post(`/choir/${cid}/verify`); toast.success("Member verified"); http.get("/choir/pending").then((r) => setPending(r.data)); } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy((b) => { const n = { ...b }; delete n[cid]; return n; }); }
  };

  const promote = async (cid) => {
    try { await http.post(`/choir/${cid}/promote`); toast.success("Promoted to director"); } catch (e) { toast.error(formatErr(e)); }
  };

  const deleteRehearsal = async (rid) => {
    try { await http.delete(`/rehearsals/${rid}`); loadParishData(); toast.success("Rehearsal removed"); } catch (e) { toast.error(formatErr(e)); }
  };

  const deleteAnnouncement = async (aid) => {
    try { await http.delete(`/choir/announcements/${aid}`); loadParishData(); toast.success("Announcement removed"); } catch (e) { toast.error(formatErr(e)); }
  };

  const parishPending = pending.filter((c) => c.parish_id === selectedPid);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input-clean max-w-xs" value={selectedPid} onChange={(e) => setSelectedPid(e.target.value)}>
          <option value="">Select parish</option>
          {parishes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1.5">
          {["pending", "rehearsals", "announcements"].map((s) => (
            <button key={s} onClick={() => setSubTab(s)} className={`px-3 py-1.5 rounded-md border text-xs capitalize ${subTab === s ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
              {s}
              {s === "pending" && pending.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pending.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {subTab === "pending" && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-secondary)]">{parishPending.length} pending choir verification request{parishPending.length !== 1 ? "s" : ""} for this parish.</div>
          {parishPending.length === 0 ? (
            <div className="card-surface p-8 text-center space-y-2">
              <CheckCircle size={28} className="mx-auto text-emerald-500" />
              <p className="text-sm text-[var(--text-secondary)]">No pending choir requests for this parish.</p>
            </div>
          ) : parishPending.map((c) => (
            <div key={c.id} className="card-surface p-4 flex items-center gap-3 flex-wrap" data-testid={`admin-choir-pending-${c.id}`}>
              <div className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] grid place-items-center font-medium shrink-0">{(c.user_name || "?").slice(0, 1)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--brand-primary)]">{c.user_name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{c.voice_part} · {c.parish?.name}</div>
                {c.note && <div className="text-xs text-[var(--text-secondary)] italic mt-0.5">"{c.note}"</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(c.id)} disabled={!!busy[c.id]} className="btn-primary text-xs inline-flex items-center gap-1" data-testid={`admin-verify-${c.id}`}>
                  {busy[c.id] ? <Loader2 size={11} className="animate-spin" /> : <BadgeCheck size={11} />} Verify
                </button>
                <button onClick={() => promote(c.id)} className="text-xs px-3 py-1.5 border border-[var(--brand-accent)] text-[var(--brand-accent)] rounded-md hover:bg-[var(--brand-accent)] hover:text-white transition-colors">
                  Make Director
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "rehearsals" && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-secondary)]">{rehearsals.length} rehearsal{rehearsals.length !== 1 ? "s" : ""} for this parish.</div>
          {rehearsals.length === 0 ? (
            <div className="card-surface p-6 text-center text-sm text-[var(--text-secondary)]">No rehearsals scheduled. Use the Choir Hub page to schedule one.</div>
          ) : rehearsals.map((r) => (
            <div key={r.id} className="card-surface p-4 flex items-start gap-3" data-testid={`admin-rehearsal-${r.id}`}>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--brand-primary)]">{r.title}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{new Date(r.scheduled_at).toLocaleString()} {r.location && `· ${r.location}`}</div>
                {r.notes && <p className="text-xs text-[var(--text-secondary)] mt-1">{r.notes}</p>}
              </div>
              <button onClick={() => deleteRehearsal(r.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === "announcements" && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-secondary)]">{announcements.length} choir announcement{announcements.length !== 1 ? "s" : ""} for this parish.</div>
          {announcements.length === 0 ? (
            <div className="card-surface p-6 text-center text-sm text-[var(--text-secondary)]">No announcements. Post one from the Choir Hub page.</div>
          ) : announcements.map((a) => (
            <div key={a.id} className="card-surface p-4 flex items-start gap-3" data-testid={`admin-announcement-${a.id}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {a.priority === "urgent" && <span className="text-[10px] font-semibold text-red-600 uppercase">Urgent</span>}
                  <span className="text-sm font-medium text-[var(--brand-primary)]">{a.title}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{a.body}</p>
                <div className="text-xs text-[var(--text-tertiary)] mt-1">by {a.author_name} · {new Date(a.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => deleteAnnouncement(a.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Parish Bulk Import Manager ───────────────────────────────────────────
function ParishImportManager() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const downloadSample = async () => {
    try {
      const { data } = await http.get("/admin/parishes/sample");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "cpm-parishes-sample.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(formatErr(e)); }
  };

  const processFile = async (file) => {
    if (!file || !file.name.endsWith(".json")) return toast.error("Please select a .json file");
    setBusy(true); setResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return toast.error("File must contain a JSON array of parish objects");
      const { data: res } = await http.post("/admin/parishes/import", data);
      setResult(res);
      toast.success(`Import complete: ${res.created} created, ${res.skipped} skipped`);
    } catch (e) { toast.error(formatErr(e) || "Invalid JSON file"); }
    finally { setBusy(false); }
  };

  const onFile = (e) => processFile(e.target.files?.[0]);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files?.[0]); };

  return (
    <div className="space-y-6">
      <div className="card-surface p-5 space-y-4">
        <h3 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2"><Download size={16} /> Download Sample Format</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Download the sample JSON template, fill in your parishes (images via URL, coordinates optional), then upload below. All fields except <code className="bg-[var(--bg-subtle)] px-1 rounded">name</code>, <code className="bg-[var(--bg-subtle)] px-1 rounded">country</code>, and <code className="bg-[var(--bg-subtle)] px-1 rounded">city</code> are optional.
        </p>
        <button onClick={downloadSample} className="btn-primary inline-flex items-center gap-2" data-testid="parish-sample-download">
          <Download size={15} /> Download cpm-parishes-sample.json
        </button>
      </div>

      <div className="card-surface p-5 space-y-4">
        <h3 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2"><Upload size={16} /> Upload Parish JSON</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
            dragging ? "border-[var(--brand-accent)] bg-amber-50" : "border-[var(--border-default)] hover:border-[var(--brand-primary)]"
          }`}
          onClick={() => document.getElementById("parish-json-upload").click()}
          data-testid="parish-drop-zone"
        >
          <Upload size={28} className="mx-auto text-[var(--text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--brand-primary)]">Drop your JSON file here or click to browse</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Accepts .json files only</p>
          <input id="parish-json-upload" type="file" accept=".json" className="hidden" onChange={onFile} />
        </div>
        {busy && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 size={16} className="animate-spin" /> Importing parishes…</div>}
        {result && (
          <div className={`rounded-lg p-4 text-sm space-y-1 ${
            result.errors?.length ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"
          }`} data-testid="import-result">
            <div className="font-medium">{result.created} parish{result.created !== 1 ? "es" : ""} created · {result.skipped} skipped (already exist)</div>
            {result.errors?.length > 0 && (
              <div className="space-y-0.5">
                {result.errors.map((e, i) => <div key={i} className="text-amber-700 text-xs">⚠ {e}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings / Ranks Bulk Import ──────────────────────────────────────────
function SettingsImportManager() {
  const IMPORTABLE = [
    { key: "ccc_ranks", label: "CCC Ranks & Titles" },
    { key: "badges", label: "Recognition Badges" },
    { key: "service_types", label: "Service Team Types" },
    { key: "event_categories", label: "Event Categories" },
    { key: "prayer_categories", label: "Prayer Categories" },
  ];
  const [activeKey, setActiveKey] = useState("ccc_ranks");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const downloadSample = async () => {
    try {
      const { data } = await http.get(`/admin/settings/sample/${activeKey}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `cpm-${activeKey}-sample.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(formatErr(e)); }
  };

  const processFile = async (file) => {
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return toast.error("File must contain a JSON array of strings");
      const { data: res } = await http.post(`/admin/settings/import/${activeKey}`, data);
      setResult(res);
      toast.success(`${res.added} values added, ${res.skipped} skipped`);
    } catch (e) { toast.error(formatErr(e) || "Invalid JSON"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {IMPORTABLE.map((k) => (
          <button key={k.key} onClick={() => { setActiveKey(k.key); setResult(null); }}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              activeKey === k.key ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)]"
            }`}>{k.label}</button>
        ))}
      </div>
      <div className="card-surface p-5 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          The sample file is a simple JSON array of strings. Edit the values, then upload to bulk-add them to <strong>{IMPORTABLE.find(k => k.key === activeKey)?.label}</strong>. Existing values are skipped.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={downloadSample} className="btn-primary inline-flex items-center gap-2">
            <Download size={15} /> Download sample
          </button>
          <label className="btn-accent inline-flex items-center gap-2 cursor-pointer">
            <Upload size={15} /> Upload JSON
            <input type="file" accept=".json" className="hidden" onChange={(e) => processFile(e.target.files?.[0])} />
          </label>
        </div>
        {busy && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 size={16} className="animate-spin" /> Importing…</div>}
        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm" data-testid="settings-import-result">
            <span className="font-medium">{result.added} added</span> · {result.skipped} skipped
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Knowledge Base Manager ─────────────────────────────────────────────
function AIKnowledgeManager() {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);

  const load = () => http.get("/admin/ai/documents").then((r) => setDocs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title.trim() || !form.content.trim()) return toast.error("Title and content required");
    setBusy(true);
    try {
      await http.post("/admin/ai/documents", form);
      toast.success("Document added to knowledge base");
      setForm({ title: "", content: "" }); load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await http.delete(`/admin/ai/documents/${id}`); toast.success("Removed"); load(); } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="card-surface p-5 border-l-4 border-[var(--brand-accent)]">
        <div className="flex items-start gap-3">
          <Bot size={20} className="text-[var(--brand-accent)] mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-[var(--brand-primary)] mb-1">How the CPM Assistant learns</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Paste text from the CCC Constitution, Bible lessons, church history, or any document. The AI bot reads all uploaded documents as context when answering member questions. Supports plain text — you can paste directly from a PDF.
            </p>
          </div>
        </div>
      </div>

      <div className="card-surface p-5 space-y-3">
        <h3 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2"><Plus size={16} /> Add Knowledge Document</h3>
        <input
          className="input-clean"
          placeholder="Document title (e.g. CCC Constitution 2023, Bible Lesson: The Armour of God)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          data-testid="ai-doc-title"
        />
        <textarea
          className="input-clean min-h-[200px] resize-y font-mono text-xs"
          placeholder="Paste the document text here… (plain text, from PDF or Word)"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          data-testid="ai-doc-content"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">{form.content.length.toLocaleString()} characters</span>
          <button onClick={add} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="ai-doc-add">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Add to Knowledge Base
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-tertiary)]">
          Knowledge Base — {docs.length} document{docs.length !== 1 ? "s" : ""}
        </div>
        {docs.length === 0 && (
          <div className="card-surface p-8 text-center">
            <BookOpen size={28} className="mx-auto text-[var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No documents uploaded yet. Add the CCC Constitution or any church document above.</p>
          </div>
        )}
        {docs.map((d) => (
          <div key={d.id} className="card-surface p-4 flex items-start gap-3" data-testid={`ai-doc-${d.id}`}>
            <FileText size={16} className="text-[var(--brand-accent)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--brand-primary)] text-sm">{d.title}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {(d.char_count || 0).toLocaleString()} chars · Added by {d.created_by_name} · {new Date(d.created_at).toLocaleDateString()}
              </div>
            </div>
            <button onClick={() => remove(d.id)} className="text-red-600 hover:text-red-800 p-1 shrink-0" data-testid={`ai-doc-delete-${d.id}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Daily Posts Manager ───────────────────────────────────────────────────
function DailyPostsManager() {
  const [enabled, setEnabled] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get("/integrations").then((r) => {
      const item = r.data.find((i) => i.label === "daily_posts_enabled");
      setEnabled(item?.meta?.value || "false");
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await http.post("/integrations", { label: "daily_posts_enabled", value: enabled });
      toast.success(`Daily posts ${enabled === "true" ? "enabled" : "disabled"}`);
    } catch (e) { toast.error(formatErr(e)); } finally { setSaving(false); }
  };

  const trigger = async () => {
    setTriggering(true);
    try {
      await http.post("/admin/daily-posts/trigger", {});
      toast.success("Daily posts generation started! Check the Global Feed in a moment.");
    } catch (e) { toast.error(formatErr(e)); } finally { setTriggering(false); }
  };

  const POST_TYPES = [
    { emoji: "✝️", label: "Daily Devotion", desc: "A short spiritual devotion with a Bible verse reference" },
    { emoji: "🙏", label: "Morning Prayer", desc: "A community prayer for members to pray together" },
    { emoji: "📖", label: "Verse of the Day", desc: "A Bible verse with brief CCC-centred reflection" },
    { emoji: "🎵", label: "Music for the Day", desc: "A suggested CCC hymn or spiritual song" },
  ];

  return (
    <div className="space-y-6">
      <div className="card-surface p-5 border-l-4 border-[var(--brand-accent)]">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-[var(--brand-accent)] mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-[var(--brand-primary)] mb-1">AI-Generated Daily Posts</div>
            <p className="text-sm text-[var(--text-secondary)]">
              When enabled, the server automatically generates 4 posts to the Global Feed every day at <strong>6:00 AM UTC</strong> — a devotion, prayer, Bible verse, and music suggestion — all tailored to CCC worship and culture. Requires an OpenAI API key in Integrations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {POST_TYPES.map((p) => (
          <div key={p.label} className="card-surface p-4 text-center space-y-2">
            <div className="text-3xl">{p.emoji}</div>
            <div className="font-medium text-sm text-[var(--brand-primary)]">{p.label}</div>
            <div className="text-xs text-[var(--text-secondary)]">{p.desc}</div>
          </div>
        ))}
      </div>

      <div className="card-surface p-5 space-y-4">
        <h3 className="font-display text-xl text-[var(--brand-primary)]">Configuration</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-[var(--brand-primary)]">Daily Posts:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setEnabled("true")}
              className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                enabled === "true" ? "bg-emerald-600 text-white border-emerald-600" : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >Enable</button>
            <button
              onClick={() => setEnabled("false")}
              className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                enabled === "false" ? "bg-red-600 text-white border-red-600" : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >Disable</button>
          </div>
          <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null} Save
          </button>
        </div>
        <div className="border-t border-[var(--border-default)] pt-4">
          <div className="text-sm font-medium text-[var(--brand-primary)] mb-2">Manual Trigger</div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Fire today's posts right now (skips any already posted today). Useful for testing or if the server missed a scheduled run.</p>
          <button onClick={trigger} disabled={triggering} className="btn-accent inline-flex items-center gap-2" data-testid="trigger-daily-posts">
            {triggering ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
            {triggering ? "Generating…" : "Trigger Daily Posts Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("settings");
  const TABS = [
    { k: "settings", l: "Settings & Catalog", icon: BadgeCheck },
    { k: "parish-import", l: "Parish Import", icon: Upload },
    { k: "ranks-import", l: "Ranks & Catalogs Import", icon: Download },
    { k: "parishes", l: "Parishes", icon: Plus },
    { k: "approvals", l: "Approvals", icon: BadgeCheck },
    { k: "users", l: "Users & Roles", icon: Shield },
    { k: "endorsements", l: "Shepherd Endorsements", icon: ShieldCheck },
    { k: "moderation", l: "Moderation", icon: FileWarning },
    { k: "prayer-mod", l: "Prayer Wall", icon: Heart },
    { k: "choir-hub", l: "Choir Hub", icon: Music },
    { k: "ai-knowledge", l: "AI Knowledge Base", icon: Bot },
    { k: "daily-posts", l: "Daily Posts", icon: Sparkles },
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
      {tab === "parish-import" && <ParishImportManager />}
      {tab === "ranks-import" && <SettingsImportManager />}
      {tab === "parishes" && <ParishesManager />}
      {tab === "approvals" && <ApprovalsManager />}
      {tab === "users" && <UsersManager />}
      {tab === "endorsements" && <ShepherdEndorsementManager />}
      {tab === "moderation" && <ModerationManager />}
      {tab === "prayer-mod" && <PrayerModerationManager />}
      {tab === "choir-hub" && <ChoirHubManager />}
      {tab === "ai-knowledge" && <AIKnowledgeManager />}
      {tab === "daily-posts" && <DailyPostsManager />}
      {tab === "integrations" && <IntegrationsManager />}
      {tab === "audit" && <AuditManager />}
    </div>
  );
}
