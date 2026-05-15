import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { MapPin, Phone, Clock, Video, UserCheck, Loader2, BadgeCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function ParishDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [my, setMy] = useState([]);
  const [busy, setBusy] = useState(false);
  const [shepherds, setShepherds] = useState([]);
  const [mapsKey, setMapsKey] = useState("");

  useEffect(() => {
    http.get(`/parishes/${id}`).then((r) => setP(r.data));
    http.get("/me/memberships").then((r) => setMy(r.data)).catch(() => {});
    http.get("/shepherds", { params: { parish_id: id } }).then((r) => setShepherds(r.data)).catch(() => {});
    http.get("/integrations/public").then((r) => setMapsKey(r.data.google_maps_api_key_public)).catch(() => {});
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

  const mapQuery = encodeURIComponent(`${p.address || ""} ${p.city} ${p.country}`.trim());
  const mapEmbed = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${mapQuery}`
    : `https://maps.google.com/maps?q=${mapQuery}&t=&z=12&ie=UTF8&iwloc=&output=embed`;

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

      {shepherds.length > 0 && (
        <div className="card-surface p-6" data-testid="endorsed-shepherds">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="text-[var(--brand-accent)]" size={20} />
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Verified Shepherds</h2>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">Endorsed by Celestial Church administration. Their identity has been verified for this parish.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {shepherds.map((s) => (
              <div key={s.id} className="border border-[var(--brand-accent)] bg-[var(--bg-paper)] rounded-lg p-4" data-testid={`shepherd-${s.id}`}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center font-display text-lg">{(s.user_name || "S").slice(0, 1)}</div>
                  <div>
                    <div className="font-medium text-[var(--brand-primary)] flex items-center gap-1">{s.user_name} <BadgeCheck size={14} className="text-[var(--brand-accent)]" /></div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-accent)]">Verified Shepherd</div>
                  </div>
                </div>
                {s.note && <p className="text-xs text-[var(--text-secondary)] mt-3 italic">"{s.note}"</p>}
                <div className="text-[10px] text-[var(--text-tertiary)] mt-2">Endorsed by {s.endorser_name} • {new Date(s.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface p-2 overflow-hidden">
        <iframe
          title={`Map of ${p.name}`}
          width="100%"
          height="320"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapEmbed}
          className="rounded-lg"
          data-testid="parish-map"
        ></iframe>
      </div>
    </div>
  );
}
