import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { Music, BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Choir() {
  const [memberships, setMemberships] = useState([]);
  const [active, setActive] = useState("");
  const [roster, setRoster] = useState([]);
  const [voice, setVoice] = useState("Soprano");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    http.get("/me/memberships").then((r) => { setMemberships(r.data); if (r.data[0]) setActive(r.data[0].parish_id); });
  }, []);
  useEffect(() => {
    if (active) http.get("/choir", { params: { parish_id: active } }).then((r) => setRoster(r.data));
  }, [active]);

  const join = async () => {
    setBusy(true);
    try { await http.post("/choir/join", { parish_id: active, voice_part: voice }); toast.success("Choir join request submitted. Awaiting verification."); } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Choir Ministry</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Lift every voice</h1>
        <p className="text-[var(--text-secondary)] mt-2">Join the choir, get verified by your parish admin, and grow into ministry leadership.</p>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center flex-wrap gap-3">
          <span className="text-sm text-[var(--text-tertiary)]">Parish:</span>
          <select className="input-clean max-w-xs" value={active} onChange={(e) => setActive(e.target.value)} data-testid="choir-parish-select">
            <option value="">Select parish</option>
            {memberships.map((m) => (<option key={m.parish_id} value={m.parish_id}>{m.parish?.name}</option>))}
          </select>
          <select className="input-clean max-w-xs" value={voice} onChange={(e) => setVoice(e.target.value)} data-testid="choir-voice">
            {["Soprano", "Alto", "Tenor", "Bass"].map((v) => (<option key={v} value={v}>{v}</option>))}
          </select>
          <button onClick={join} disabled={!active || busy} className="btn-accent inline-flex items-center gap-2" data-testid="choir-join">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Music size={16} />} Request to join choir
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl text-[var(--brand-primary)] mb-3">Choir Roster</h2>
        {roster.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No verified choir members yet.</div> :
          <div className="grid sm:grid-cols-2 gap-3">
            {roster.map((c) => (
              <div key={c.id} className="card-surface p-4 flex items-center gap-3" data-testid={`choir-member-${c.id}`}>
                <div className="w-10 h-10 rounded-full bg-[var(--brand-secondary)] text-white grid place-items-center">{(c.user_name || "U").slice(0, 1)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--brand-primary)] flex items-center gap-1">{c.user_name} <BadgeCheck size={14} className="text-[var(--brand-accent)]" /></div>
                  <div className="text-xs text-[var(--text-tertiary)]">{c.voice_part} • {c.role === "director" ? "Choir Director" : "Member"}</div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
