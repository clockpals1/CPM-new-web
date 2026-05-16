import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import {
  MapPin, Phone, Clock, Video, UserCheck, Loader2, BadgeCheck, ShieldCheck,
  Navigation, ExternalLink, Users, Church, Globe, Music, CheckCircle2,
  AlertCircle, Info, ChevronLeft, ArrowRight, Mail, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

function InfoRow({ icon: Icon, label, value, children }) {
  if (!value && !children) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] grid place-items-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-[var(--brand-accent)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-medium">{label}</div>
        <div className="text-sm text-[var(--text-primary)] mt-0.5 leading-snug">{children || value}</div>
      </div>
    </div>
  );
}

function JoinCTA({ pid, parish, eligibility }) {
  const [busy, setBusy] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  if (!eligibility) return null;

  if (eligibility.already_member) {
    return (
      <div className="card-surface overflow-hidden" data-testid="parish-member-badge">
        <div className="bg-emerald-600 px-5 py-3.5 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-white shrink-0" />
          <div className="text-white">
            <div className="font-medium text-sm">You are a member of this parish</div>
            <div className="text-xs text-white/75 mt-0.5">Parish feed, events, and community content are unlocked for you</div>
          </div>
        </div>
        <div className="p-4">
          <Link to="/app/my-parish" className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm font-medium">
            <ArrowRight size={15} /> Open My Parish Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (eligibility.pending) {
    return (
      <div className="card-surface overflow-hidden border-l-4 border-amber-400" data-testid="parish-pending-badge">
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 grid place-items-center shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <div className="font-medium text-sm text-[var(--text-primary)]">Request sent — awaiting shepherd</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">You'll receive a notification once your membership is confirmed.</div>
          </div>
        </div>
      </div>
    );
  }

  if (eligibility.reason === "parish_inactive") {
    return (
      <div className="card-surface p-5 flex items-center gap-3 border-l-4 border-gray-300" data-testid="parish-inactive-badge">
        <AlertCircle size={20} className="text-gray-400 shrink-0" />
        <div>
          <div className="font-medium text-sm text-[var(--text-primary)]">Parish not currently active</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">This parish is not accepting new members at this time.</div>
        </div>
      </div>
    );
  }

  if (eligibility.reason === "membership_limit") {
    return (
      <div className="card-surface p-5 flex items-center gap-3 border-l-4 border-amber-400" data-testid="parish-limit-badge">
        <Info size={20} className="text-amber-600 shrink-0" />
        <div>
          <div className="font-medium text-sm text-[var(--text-primary)]">Membership limit reached</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">You've reached the maximum of {eligibility.max} parish memberships. Manage your memberships in My Parish.</div>
        </div>
      </div>
    );
  }

  if (!eligibility.can_direct_join && !eligibility.can_request) return null;

  const isInviteOnly = eligibility.join_mode === "invite_only";

  const doJoin = async () => {
    setBusy(true);
    try {
      await http.post(`/parishes/${pid}/join`, { note });
      toast.success(`Alleluia! Welcome to ${parish?.name}. You are now a member.`);
      navigate("/app/my-parish");
    } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="card-surface overflow-hidden" data-testid="parish-join-panel">
      <div className="bg-[var(--brand-primary)] px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/15 grid place-items-center shrink-0">
          <UserPlus size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{isInviteOnly ? "Request to join this parish" : "Join this parish"}</div>
          <div className="text-xs text-white/70 mt-0.5">
            {isInviteOnly
              ? "The shepherd will review and confirm your request"
              : "Membership is open — you'll be confirmed instantly"}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide shrink-0 ${isInviteOnly ? "bg-amber-400/20 text-amber-300" : "bg-emerald-400/20 text-emerald-300"}`}>
          {isInviteOnly ? "By Request" : "Open"}
        </span>
      </div>
      <div className="p-5 space-y-3">
        {showNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a note to the shepherd (optional)…"
            className="input-clean min-h-[72px] text-sm w-full"
            data-testid="join-note"
          />
        ) : (
          <button onClick={() => setShowNote(true)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] flex items-center gap-1 transition-colors">
            <Mail size={11} /> Add a personal note to the shepherd (optional)
          </button>
        )}
        <button
          onClick={doJoin}
          disabled={busy}
          data-testid="parish-join-btn"
          className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {isInviteOnly ? "Send Membership Request" : "Join Parish Now"}
        </button>
        {!isInviteOnly && (
          <p className="text-xs text-center text-[var(--text-tertiary)] leading-relaxed">
            You'll immediately gain access to the parish feed, events, choir, and community tools.
          </p>
        )}
      </div>
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
        <h2 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2 mb-1">
          <Navigation size={17} className="text-[var(--brand-accent)]" /> Get Directions
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{fullAddress || "Address not available"}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors" data-testid="directions-google">
            <ExternalLink size={12} /> Google Maps
          </a>
          <a href={`https://maps.apple.com/?daddr=${encoded}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors" data-testid="directions-apple">
            <ExternalLink size={12} /> Apple Maps
          </a>
          <a href={`https://waze.com/ul?q=${encoded}&navigate=yes`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors" data-testid="directions-waze">
            <ExternalLink size={12} /> Waze
          </a>
          {parish.lat && parish.lng && (
            <a href={`geo:${latLng}?q=${encoded}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)] transition-colors" data-testid="directions-native">
              <Navigation size={12} /> Open in Maps
            </a>
          )}
        </div>
      </div>
      <iframe title={`Map of ${parish.name}`} width="100%" height="280" loading="lazy"
        referrerPolicy="no-referrer-when-downgrade" src={mapEmbed} className="block" data-testid="parish-map" />
    </div>
  );
}

export default function ParishDetail() {
  const { id } = useParams();
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
        <div className="h-6 bg-[var(--bg-subtle)] rounded w-28" />
        <div className="card-surface h-52 rounded-2xl" />
        <div className="card-surface h-40 rounded-2xl" />
        <div className="card-surface h-64 rounded-2xl" />
      </div>
    );
  }

  if (!p) return (
    <div className="max-w-4xl mx-auto card-surface p-10 text-center space-y-3">
      <Church size={32} className="mx-auto text-[var(--text-tertiary)]" />
      <div className="font-display text-xl text-[var(--brand-primary)]">Parish not found</div>
      <Link to="/app/parishes" className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
        <ChevronLeft size={13} /> Back to directory
      </Link>
    </div>
  );

  const statusColors = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const isActive = p.status === "active";
  const showJoin = eligibility && !eligibility.already_member;
  const showStickyJoin = showJoin && (eligibility.can_direct_join || eligibility.can_request) &&
    !eligibility.pending && eligibility.reason !== "parish_inactive" && eligibility.reason !== "membership_limit";

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 sm:pb-8" data-testid="parish-detail">
      {/* Back nav */}
      <Link to="/app/parishes" className="inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors">
        <ChevronLeft size={14} /> All parishes
      </Link>

      {/* ── 1. HERO — Name, Location, Status ─────────────────────────────── */}
      <div className="card-surface overflow-hidden">
        {p.image_url && (
          <div className="h-44 sm:h-56 bg-[var(--bg-subtle)] overflow-hidden">
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">{[p.city, p.country].filter(Boolean).join(", ")}</div>
              <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)] mt-1 leading-tight">{p.name}</h1>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-semibold ${statusColors[p.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{p.status}</span>
              {stats?.member_count > 0 && (
                <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                  <Users size={11} /> {stats.member_count} members
                </span>
              )}
            </div>
          </div>

          {/* Quick contact row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {p.phone && (
              <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-primary)] transition-colors" data-testid="call-parish">
                <Phone size={13} className="text-[var(--brand-accent)]" /> Call Parish
              </a>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm hover:border-[var(--brand-primary)] transition-colors">
                <Globe size={13} className="text-[var(--brand-accent)]" /> Visit website
              </a>
            )}
            {p.livestream_url && (
              <a href={p.livestream_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-accent)] text-[var(--brand-accent)] text-sm hover:bg-[var(--brand-accent)] hover:text-white transition-colors">
                <Video size={13} /> Watch Livestream
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. JOIN CTA — shown prominently after hero ─────────────────────── */}
      <JoinCTA pid={id} parish={p} eligibility={eligibility} />

      {/* ── 3. PARISH INFO — Shepherd, Schedule, Address ───────────────────── */}
      <div className="card-surface p-6">
        <h2 className="font-display text-xl text-[var(--brand-primary)] mb-4">Parish Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow icon={UserCheck} label="Shepherd in Charge" value={p.shepherd_name || "—"} />
          <InfoRow icon={Clock} label="Worship Schedule" value={p.service_times || "—"} />
          <InfoRow icon={MapPin} label="Address">
            {[p.address, p.city, p.state, p.country].filter(Boolean).join(", ")}
          </InfoRow>
          <InfoRow icon={Phone} label="Contact" value={p.phone || "—"} />
          {p.website && <InfoRow icon={Globe} label="Website"><a href={p.website} target="_blank" rel="noreferrer" className="text-[var(--brand-accent)] hover:underline break-all">{p.website}</a></InfoRow>}
          {p.livestream_url && <InfoRow icon={Video} label="Livestream"><a href={p.livestream_url} target="_blank" rel="noreferrer" className="text-[var(--brand-accent)] hover:underline flex items-center gap-1"><ExternalLink size={12} />Watch online</a></InfoRow>}
        </div>
        {!isActive && (
          <div className="flex items-center gap-2 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle size={15} className="shrink-0" /> This parish is currently inactive. Contact your shepherd for updates.
          </div>
        )}
        {p.description && (
          <p className="mt-5 pt-5 border-t border-[var(--border-default)] text-sm text-[var(--text-secondary)] leading-relaxed">{p.description}</p>
        )}
        {/* Feature badges */}
        {(p.choir_enabled || p.ministries_enabled) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
            {p.choir_enabled && <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] border border-[var(--border-default)]"><Music size={11} /> Choir Active</span>}
            {p.ministries_enabled && <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] border border-[var(--border-default)]"><Church size={11} /> Ministries Active</span>}
          </div>
        )}
      </div>

      {/* ── 4. DIRECTIONS ───────────────────────────────────────────────────── */}
      {(p.address || p.city) && <DirectionsPanel parish={p} mapsKey={mapsKey} />}

      {/* ── 5. VERIFIED SHEPHERDS ───────────────────────────────────────────── */}
      {shepherds.length > 0 && (
        <div className="card-surface p-6" data-testid="endorsed-shepherds">
          <h2 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-[var(--brand-accent)]" /> Verified Shepherds
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">Endorsed by Celestial Church administration.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {shepherds.map((s) => (
              <div key={s.id} className="border border-[var(--brand-accent)]/40 bg-[var(--bg-paper)] rounded-xl p-4" data-testid={`shepherd-${s.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center font-display text-lg">
                    {(s.user_name || "S").slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-primary)] flex items-center gap-1">{s.user_name} <BadgeCheck size={13} className="text-[var(--brand-accent)]" /></div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-accent)]">Verified Shepherd</div>
                  </div>
                </div>
                {s.note && <p className="text-xs text-[var(--text-secondary)] mt-3 italic">"{s.note}"</p>}
                <div className="text-[10px] text-[var(--text-tertiary)] mt-2">Endorsed by {s.endorser_name} · {new Date(s.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STICKY MOBILE JOIN BAR ───────────────────────────────────────────── */}
      {showStickyJoin && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--border-default)] px-4 py-3 flex items-center gap-3 shadow-xl" data-testid="sticky-join-bar">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[var(--text-primary)] truncate">{p.name}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              {eligibility.join_mode === "invite_only" ? "By Request" : "Open to join"}
            </div>
          </div>
          <a href="#parish-join-panel" className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 shrink-0 rounded-xl">
            <UserPlus size={14} /> Join Parish
          </a>
        </div>
      )}
    </div>
  );
}
