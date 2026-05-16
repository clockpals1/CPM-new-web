import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import {
  MapPin, Phone, Clock, Video, UserCheck, Loader2, BadgeCheck, ShieldCheck,
  Navigation, ExternalLink, Users, Church, Globe, Music, CheckCircle2,
  AlertCircle, Info, ChevronLeft, Star, ArrowRight, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-3 bg-[var(--bg-subtle)] rounded-xl">
      <Icon size={18} className="text-[var(--brand-accent)]" />
      <div className="font-display text-2xl text-[var(--brand-primary)]">{value ?? "—"}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, children }) {
  if (!value && !children) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-[var(--bg-subtle)] grid place-items-center flex-shrink-0">
        <Icon size={15} className="text-[var(--brand-accent)]" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
        <div className="text-sm text-[var(--text-primary)] mt-0.5">{children || value}</div>
      </div>
    </div>
  );
}

function JoinPanel({ pid, parish, eligibility, onJoinSuccess }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  if (!eligibility) return null;

  if (eligibility.already_member) {
    return (
      <div className="space-y-2" data-testid="parish-member-badge">
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> You are a verified member of this parish
        </div>
        <Link to="/app/my-parish" className="btn-primary inline-flex items-center gap-2 text-sm">
          <ArrowRight size={15} /> Go to My Parish
        </Link>
      </div>
    );
  }
  if (eligibility.pending) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700" data-testid="parish-pending-badge">
        <Info size={16} /> Your membership is being set up — please refresh in a moment
      </div>
    );
  }
  if (eligibility.reason === "parish_inactive") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600" data-testid="parish-inactive-badge">
        <AlertCircle size={16} /> This parish is not currently active
      </div>
    );
  }
  if (eligibility.reason === "membership_limit") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700" data-testid="parish-limit-badge">
        <Info size={16} /> You have reached the maximum of {eligibility.max} active parish memberships
      </div>
    );
  }
  if (!eligibility.can_direct_join && !eligibility.can_request) return null;

  const doJoin = async () => {
    setBusy(true);
    try {
      await http.post(`/parishes/${pid}/join`, { note });
      toast.success(`Alleluia! Welcome to ${parish?.name || "this parish"}. You are now a member.`);
      navigate("/app/my-parish");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3" data-testid="parish-join-panel">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note to the parish shepherd…"
        className="input-clean min-h-[60px] text-sm w-full"
        data-testid="join-note"
      />
      <button onClick={doJoin} disabled={busy} data-testid="parish-join-btn" className="btn-primary inline-flex items-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        Join Parish
      </button>
    </div>
  );
}

function DirectionsPanel({ parish, mapsKey }) {
  const fullAddress = [parish.address, parish.city, parish.state, parish.country].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(fullAddress);
  const latLng = parish.lat && parish.lng ? `${parish.lat},${parish.lng}` : encoded;

  const mapEmbed = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encoded}`
    : `https://maps.google.com/maps?q=${encoded}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="card-surface overflow-hidden" data-testid="directions-panel">
      <div className="p-5 border-b border-[var(--border-default)]">
        <h2 className="font-display text-2xl text-[var(--brand-primary)] flex items-center gap-2">
          <Navigation size={18} className="text-[var(--brand-accent)]" /> Get Directions
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{fullAddress || "Address not available"}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors"
            data-testid="directions-google"
          >
            <ExternalLink size={13} /> Google Maps
          </a>
          <a
            href={`https://maps.apple.com/?daddr=${encoded}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors"
            data-testid="directions-apple"
          >
            <ExternalLink size={13} /> Apple Maps
          </a>
          <a
            href={`https://waze.com/ul?q=${encoded}&navigate=yes`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors"
            data-testid="directions-waze"
          >
            <ExternalLink size={13} /> Waze
          </a>
          {parish.lat && parish.lng && (
            <a
              href={`geo:${latLng}?q=${encoded}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors"
              data-testid="directions-native"
            >
              <Navigation size={13} /> Open in Maps app
            </a>
          )}
        </div>
      </div>
      <iframe
        title={`Map of ${parish.name}`}
        width="100%"
        height="300"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={mapEmbed}
        className="block"
        data-testid="parish-map"
      />
    </div>
  );
}

export default function ParishDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [stats, setStats] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [shepherds, setShepherds] = useState([]);
  const [mapsKey, setMapsKey] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      http.get(`/parishes/${id}`),
      http.get(`/parishes/${id}/stats`).catch(() => ({ data: null })),
      http.get(`/parishes/${id}/eligibility`).catch(() => ({ data: null })),
      http.get("/shepherds", { params: { parish_id: id } }).catch(() => ({ data: [] })),
      http.get("/integrations/public").catch(() => ({ data: {} })),
    ]).then(([parish, statsRes, eligRes, shepsRes, intRes]) => {
      setP(parish.data);
      setStats(statsRes.data);
      setEligibility(eligRes.data);
      setShepherds(shepsRes.data || []);
      setMapsKey(intRes.data?.google_maps_api_key_public || "");
    }).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
        <div className="card-surface h-48 rounded-xl" />
        <div className="card-surface h-64 rounded-xl" />
      </div>
    );
  }
  if (!p) return (
    <div className="max-w-4xl mx-auto card-surface p-10 text-center space-y-3">
      <Church size={32} className="mx-auto text-[var(--text-tertiary)]" />
      <div className="font-display text-xl text-[var(--brand-primary)]">Parish not found</div>
      <Link to="/app/parishes" className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"><ChevronLeft size={13} /> Back to directory</Link>
    </div>
  );

  const statusColors = { active: "bg-emerald-50 text-emerald-700 border-emerald-200", inactive: "bg-amber-50 text-amber-700 border-amber-200" };
  const joinModeLabels = { open: "Open Join", location_based: "Location-based Join", request_only: "By Request" };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="parish-detail">
      {/* Back nav */}
      <Link to="/app/parishes" className="inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors">
        <ChevronLeft size={14} /> All parishes
      </Link>

      {/* Hero card */}
      <div className="card-surface overflow-hidden">
        {p.image_url && (
          <div className="h-40 sm:h-52 bg-[var(--bg-subtle)] overflow-hidden">
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">{p.country}</div>
              <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)] mt-1 leading-tight">{p.name}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-semibold ${statusColors[p.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{p.status}</span>
              {p.join_mode && <span className="text-[10px] text-[var(--text-tertiary)]">{joinModeLabels[p.join_mode] || p.join_mode}</span>}
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-wrap gap-3 mb-6">
              <StatPill icon={Users} label="Members" value={stats.member_count} />
              {p.choir_enabled && <StatPill icon={Music} label="Choir" value="Active" />}
              {p.ministries_enabled && <StatPill icon={Church} label="Ministries" value="Active" />}
            </div>
          )}

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow icon={MapPin} label="Address">
              {[p.address, p.city, p.state, p.country].filter(Boolean).join(", ")}
            </InfoRow>
            <InfoRow icon={UserCheck} label="Shepherd in Charge" value={p.shepherd_name || "—"} />
            <InfoRow icon={Phone} label="Contact" value={p.phone || "—"} />
            <InfoRow icon={Clock} label="Worship Schedule" value={p.service_times || "—"} />
            {p.website && <InfoRow icon={Globe} label="Website"><a href={p.website} target="_blank" rel="noreferrer" className="text-[var(--brand-accent)] hover:underline">{p.website}</a></InfoRow>}
            {p.livestream_url && <InfoRow icon={Video} label="Livestream"><a href={p.livestream_url} target="_blank" rel="noreferrer" className="text-[var(--brand-accent)] hover:underline flex items-center gap-1"><ExternalLink size={12} />Watch online</a></InfoRow>}
          </div>

          {p.description && <p className="mt-6 text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-default)] pt-5">{p.description}</p>}

          {/* Actions */}
          <div className="mt-6 pt-5 border-t border-[var(--border-default)] space-y-3">
            <div className="flex flex-wrap gap-2">
              {p.phone && (
                <a href={`tel:${p.phone}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-primary)] transition-colors" data-testid="call-parish">
                  <Phone size={14} /> Call Parish
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-default)] text-sm hover:border-[var(--brand-primary)] transition-colors">
                  <Globe size={14} /> Visit website
                </a>
              )}
            </div>
            <JoinPanel pid={id} parish={p} eligibility={eligibility} onJoinSuccess={load} />
          </div>
        </div>
      </div>

      {/* Directions */}
      {(p.address || p.city) && <DirectionsPanel parish={p} mapsKey={mapsKey} />}

      {/* Verified Shepherds */}
      {shepherds.length > 0 && (
        <div className="card-surface p-6" data-testid="endorsed-shepherds">
          <h2 className="font-display text-2xl text-[var(--brand-primary)] flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-[var(--brand-accent)]" /> Verified Shepherds
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">Endorsed by Celestial Church administration.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {shepherds.map((s) => (
              <div key={s.id} className="border border-[var(--brand-accent)] bg-[var(--bg-paper)] rounded-lg p-4" data-testid={`shepherd-${s.id}`}>
                <div className="flex items-center gap-3">
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

      {/* No map integration notice */}
      {!mapsKey && (p.address || p.city) && (
        <div className="card-surface p-4 flex items-center gap-3 text-sm text-[var(--text-secondary)] border-dashed" data-testid="no-maps-notice">
          <Info size={15} className="text-amber-500 flex-shrink-0" />
          <span>For an embedded map, the Super Admin can configure a Google Maps API key in Admin → Integrations. Navigation links above still work without it.</span>
        </div>
      )}
    </div>
  );
}
