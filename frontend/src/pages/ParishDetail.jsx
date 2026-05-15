import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { MapPin, Phone, Clock, Video, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ParishDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [my, setMy] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    http.get(`/parishes/${id}`).then((r) => setP(r.data));
    http.get("/me/memberships").then((r) => setMy(r.data)).catch(() => {});
  }, [id]);

  const alreadyMember = my.some((m) => m.parish_id === id);

  const request = async () => {
    setBusy(true);
    try {
      await http.post("/memberships/request", { parish_id: id });
      toast.success("Membership request sent. Awaiting parish admin approval.");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  if (!p) return <div className="text-sm text-[var(--text-secondary)]">Loading parish…</div>;
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="parish-detail">
      <div className="card-surface p-7">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">{p.country}</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)] mt-1">{p.name}</h1>
        <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
          <div className="flex items-start gap-2"><MapPin size={16} className="text-[var(--brand-accent)] mt-0.5" /><div>{p.address}<br/><span className="text-[var(--text-tertiary)]">{p.city}, {p.country}</span></div></div>
          <div className="flex items-start gap-2"><UserCheck size={16} className="text-[var(--brand-accent)] mt-0.5" /><div>Shepherd<br/><span className="text-[var(--text-tertiary)]">{p.shepherd_name || "—"}</span></div></div>
          <div className="flex items-start gap-2"><Phone size={16} className="text-[var(--brand-accent)] mt-0.5" /><div>Contact<br/><span className="text-[var(--text-tertiary)]">{p.phone || "—"}</span></div></div>
          <div className="flex items-start gap-2"><Clock size={16} className="text-[var(--brand-accent)] mt-0.5" /><div>Services<br/><span className="text-[var(--text-tertiary)]">{p.service_times || "—"}</span></div></div>
        </div>
        {p.description && <p className="mt-5 text-[var(--text-secondary)]">{p.description}</p>}
        {p.livestream_url && (
          <a href={p.livestream_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--brand-accent)]" data-testid="parish-livestream"><Video size={16} /> Watch livestream</a>
        )}
        <div className="mt-6 flex gap-3">
          {alreadyMember ? (
            <span className="px-4 py-2 rounded-md bg-[var(--bg-subtle)] text-sm text-[var(--brand-primary)]" data-testid="parish-member-badge">You are a verified member</span>
          ) : (
            <button onClick={request} disabled={busy} data-testid="parish-request-join" className="btn-primary inline-flex items-center gap-2">
              {busy && <Loader2 size={16} className="animate-spin" />} Request membership
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
