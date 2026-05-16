import React, { useEffect, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  HandHelping, Loader2, CheckCircle, Clock, XCircle, Users, Plus,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICON = {
  approved: CheckCircle,
  pending: Clock,
  rejected: XCircle,
};

export default function Service() {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ parish_id: "", service_type: "", note: "" });
  const [parishes, setParishes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const isAdmin = user?.role && ["super_admin", "parish_admin"].includes(user.role);

  const loadAll = useCallback(() => {
    http.get("/me/service-teams").then((r) => setMyTeams(r.data)).catch(() => {});
    http.get("/service").then((r) => setMembers(r.data)).catch(() => {});
    if (isAdmin) http.get("/service/pending").then((r) => setPending(r.data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    loadAll();
    http.get("/settings/service_types").then((r) => setTypes(r.data)).catch(() => {});
    http.get("/me/memberships").then((r) => {
      const approved = (r.data.memberships || []);
      setParishes(approved);
      if (approved[0]) setForm((f) => ({ ...f, parish_id: approved[0].id }));
    }).catch(() => {});
  }, [loadAll]);

  const join = async () => {
    if (!form.service_type) return toast.error("Select a service type");
    if (!form.parish_id) return toast.error("Select a parish");
    setBusy(true);
    try {
      await http.post("/service/join", form);
      toast.success("Request submitted — pending admin approval");
      setJoinOpen(false);
      loadAll();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const approve = async (sid) => {
    try { await http.post(`/service/${sid}/approve`); toast.success("Approved"); loadAll(); } catch (ex) { toast.error(formatErr(ex)); }
  };

  const reject = async (sid) => {
    try { await http.post(`/service/${sid}/reject`); toast.success("Rejected"); loadAll(); } catch (ex) { toast.error(formatErr(ex)); }
  };

  const filtered = typeFilter ? members.filter((m) => m.service_type === typeFilter) : members;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Serve the body</div>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Service & Volunteer Hub</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Join a service team, view your assignments, and serve your parish.</p>
        </div>
        <button onClick={() => setJoinOpen((s) => !s)} className="btn-accent inline-flex items-center gap-1.5" data-testid="service-join-btn">
          <Plus size={15} /> {joinOpen ? "Close" : "Join a team"}
        </button>
      </div>

      {/* My service teams */}
      {myTeams.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-2">My Service Teams</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {myTeams.map((t) => {
              const Icon = STATUS_ICON[t.status] || Clock;
              return (
                <div key={t.id} className="card-surface p-4 flex items-center gap-4" data-testid={`my-team-${t.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0">
                    <HandHelping size={18} className="text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--brand-primary)] text-sm">{t.service_type}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{t.parish?.name || "Parish"}</div>
                    {t.note && <div className="text-xs text-[var(--text-secondary)] mt-0.5 italic truncate">{t.note}</div>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 flex items-center gap-1 ${STATUS_STYLE[t.status] || STATUS_STYLE.pending}`}>
                    <Icon size={10} /> {t.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Join form */}
      {joinOpen && (
        <div className="card-surface p-5 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Join a Service Team</div>
          <select className="input-clean" value={form.parish_id} onChange={(e) => setForm({ ...form, parish_id: e.target.value })}>
            <option value="">Select parish *</option>
            {parishes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input-clean" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} data-testid="service-type">
            <option value="">Service type *</option>
            {types.map((t) => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
          <textarea className="input-clean sm:col-span-2 min-h-[80px] resize-none" placeholder="Why would you like to serve in this role?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={join} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="service-join">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <HandHelping size={15} />} Submit request
            </button>
          </div>
        </div>
      )}

      {/* Admin: Pending approvals */}
      {isAdmin && pending.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-2">
            Pending Requests <span className="bg-amber-500 text-white rounded-full text-[10px] px-1.5 py-0.5 ml-1">{pending.length}</span>
          </div>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="card-surface p-4 flex items-center gap-4" data-testid={`pending-service-${p.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--brand-primary)]">{p.user_name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{p.service_type} · {p.parish_id}</div>
                  {p.note && <div className="text-xs text-[var(--text-secondary)] italic mt-0.5">"{p.note}"</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => approve(p.id)} className="text-xs px-2.5 py-1 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" data-testid={`approve-service-${p.id}`}>Approve</button>
                  <button onClick={() => reject(p.id)} className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team directory */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Service Teams Directory</div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTypeFilter("")} className={`text-xs px-3 py-1 rounded-md border ${!typeFilter ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>All</button>
            {types.map((t) => (
              <button key={t.id} onClick={() => setTypeFilter(t.label)} className={`text-xs px-3 py-1 rounded-md border ${typeFilter === t.label ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="card-surface p-4 flex items-center gap-3" data-testid={`service-member-${m.id}`}>
              <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center text-sm font-medium shrink-0">
                {(m.user_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--brand-primary)] truncate">{m.user_name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.service_type}</div>
              </div>
              <HandHelping size={14} className="text-emerald-600 shrink-0" />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card-surface p-10 col-span-full text-center">
              <Users size={28} className="mx-auto text-[var(--text-tertiary)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">No active volunteers in this team yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
