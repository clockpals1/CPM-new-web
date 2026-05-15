import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { HandHelping, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Service() {
  const [memberships, setMemberships] = useState([]);
  const [active, setActive] = useState("");
  const [types, setTypes] = useState([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    http.get("/me/memberships").then((r) => { setMemberships(r.data); if (r.data[0]) setActive(r.data[0].parish_id); });
    http.get("/settings/service_types").then((r) => { setTypes(r.data); if (r.data[0]) setPick(r.data[0].label); });
  }, []);
  useEffect(() => { if (active) http.get("/service", { params: { parish_id: active } }).then((r) => setRoster(r.data)); }, [active]);

  const join = async () => {
    setBusy(true);
    try { await http.post("/service/join", { parish_id: active, service_type: pick }); toast.success("Service request submitted. Awaiting approval."); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Service & Volunteering</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Serve in your parish</h1>
      </div>
      <div className="card-surface p-5 flex items-center gap-3 flex-wrap">
        <select className="input-clean max-w-xs" value={active} onChange={(e) => setActive(e.target.value)} data-testid="service-parish">
          <option value="">Select parish</option>
          {memberships.map((m) => (<option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>))}
        </select>
        <select className="input-clean max-w-xs" value={pick} onChange={(e) => setPick(e.target.value)} data-testid="service-type">
          {types.map((t) => (<option key={t.id} value={t.label}>{t.label}</option>))}
        </select>
        <button onClick={join} disabled={!active || busy} className="btn-accent inline-flex items-center gap-2" data-testid="service-join">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <HandHelping size={16} />} Request to join
        </button>
      </div>

      <div>
        <h2 className="font-display text-2xl text-[var(--brand-primary)] mb-3">Active Service Members</h2>
        {roster.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No active service members.</div> :
          <div className="grid sm:grid-cols-2 gap-3">
            {roster.map((s) => (
              <div key={s.id} className="card-surface p-4 flex items-center justify-between" data-testid={`service-${s.id}`}>
                <div><div className="text-sm font-medium text-[var(--brand-primary)]">{s.user_name}</div><div className="text-xs text-[var(--text-tertiary)]">{s.service_type}</div></div>
                <span className="text-xs text-green-700">Approved</span>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
