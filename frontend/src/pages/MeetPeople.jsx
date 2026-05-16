import React, { useEffect, useState, useCallback, useRef } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  MapPin, MessageSquare, UserPlus, UserCheck, Loader2, Search,
  X, Flag, ShieldBan, Music, HandHelping, BadgeCheck, Users, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import VerifiedBadge from "../components/VerifiedBadge";

function Avatar({ member, size = 12 }) {
  const cls = `w-${size} h-${size} rounded-full overflow-hidden flex items-center justify-center font-display text-white shrink-0`;
  const color = "bg-[var(--brand-primary)]";
  if (member.avatar) {
    return <div className={cls}><img src={member.avatar} alt={member.name} className="w-full h-full object-cover" /></div>;
  }
  return <div className={`${cls} ${color} text-lg`}>{(member.name || "U").slice(0, 1).toUpperCase()}</div>;
}

function MemberCard({ m, currentUser, onMessage, onProfileOpen }) {
  const [following, setFollowing] = useState(m._following || false);
  const [busy, setBusy] = useState(false);

  const toggleFollow = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (following) {
        await http.delete(`/members/${m.id}/follow`);
        setFollowing(false);
        toast.success("Unfollowed");
      } else {
        await http.post(`/members/${m.id}/follow`);
        setFollowing(true);
        toast.success("Following " + m.name);
      }
    } catch (ex) { toast.error(formatErr(ex)); } finally { setBusy(false); }
  };

  const block = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Block ${m.name}? They won't appear in your directory.`)) return;
    try { await http.post(`/members/${m.id}/block`); toast.success("Blocked"); } catch (ex) { toast.error(formatErr(ex)); }
  };

  const report = async (e) => {
    e.stopPropagation();
    try { await http.post("/reports", { target_type: "user", target_id: m.id, reason: "Inappropriate profile" }); toast.success("Reported"); } catch (ex) { toast.error(formatErr(ex)); }
  };

  const sameCountry = currentUser?.country && m.country?.toLowerCase() === currentUser.country?.toLowerCase();
  const hasChoir = m.choir_status === "verified" || m.choir_role;
  const hasService = m.service_types?.length > 0;

  return (
    <div onClick={() => onProfileOpen(m)} className="card-surface p-5 cursor-pointer hover:shadow-md transition-shadow group" data-testid={`member-card-${m.id}`}>
      <div className="flex items-start gap-3">
        <Avatar member={m} size={12} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-[var(--brand-primary)] truncate">{m.name}</span>
            {m.verified && <VerifiedBadge size="xs" reason={m.verified_reason} />}
            {m.badges?.length > 0 && <BadgeCheck size={13} className="text-[var(--brand-accent)] shrink-0" />}
          </div>
          {m.ccc_rank && <div className="text-xs text-[var(--brand-accent)] font-medium">{m.ccc_rank}</div>}
          <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
            <MapPin size={10} />
            {m.city ? `${m.city}, ` : ""}{m.country || "—"}
            {sameCountry && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Same country</span>}
          </div>
        </div>
        {/* Safety menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={report} title="Report" className="w-7 h-7 rounded-md hover:bg-amber-50 text-[var(--text-tertiary)] hover:text-amber-600 grid place-items-center"><Flag size={12} /></button>
          <button onClick={block} title="Block" className="w-7 h-7 rounded-md hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600 grid place-items-center"><ShieldBan size={12} /></button>
        </div>
      </div>

      {m.profile_summary && <p className="text-sm text-[var(--text-secondary)] mt-3 line-clamp-2">{m.profile_summary}</p>}

      {/* Context chips */}
      <div className="flex flex-wrap gap-1 mt-2">
        {hasChoir && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5"><Music size={9} /> Choir</span>}
        {hasService && m.service_types?.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5"><HandHelping size={9} /> {s}</span>)}
        {m.badges?.map((b) => <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)]">{b}</span>)}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={toggleFollow}
          disabled={busy}
          className={`text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${following ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"}`}
          data-testid={`follow-${m.id}`}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : following ? <UserCheck size={11} /> : <UserPlus size={11} />}
          {following ? "Following" : "Follow"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMessage(m); }}
          className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
          data-testid={`message-${m.id}`}
        >
          <MessageSquare size={11} /> Message
        </button>
      </div>
    </div>
  );
}

function ProfileModal({ member, onClose, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    http.get(`/members/${member.id}`).then((r) => {
      setProfile(r.data);
      setFollowing(r.data.is_following || false);
    }).catch(() => setProfile(member)).finally(() => setLoading(false));
  }, [member]);

  const toggleFollow = async () => {
    try {
      if (following) { await http.delete(`/members/${member.id}/follow`); setFollowing(false); }
      else { await http.post(`/members/${member.id}/follow`); setFollowing(true); toast.success("Following " + member.name); }
    } catch (ex) { toast.error(formatErr(ex)); }
  };

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    setMsgBusy(true);
    try { await http.post("/messages", { to_user_id: member.id, body: msgText }); toast.success("Message sent"); setMsgText(""); } catch (ex) { toast.error(formatErr(ex)); } finally { setMsgBusy(false); }
  };

  const p = profile || member;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4" onClick={onClose}>
      <div className="card-surface max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="profile-modal">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Avatar member={p} size={16} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-display text-2xl text-[var(--brand-primary)]">{p.name}</div>
                {p.verified && <VerifiedBadge size="sm" reason={p.verified_reason} />}
              </div>
              {p.ccc_rank && <div className="text-sm text-[var(--brand-accent)] font-medium">{p.ccc_rank}</div>}
              <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-1">
                <MapPin size={11} /> {[p.city, p.country].filter(Boolean).join(", ") || "—"}
              </div>
              {profile?.followers_count > 0 && <div className="text-xs text-[var(--text-tertiary)] mt-1"><Users size={10} className="inline mr-1" />{profile.followers_count} follower{profile.followers_count !== 1 ? "s" : ""}</div>}
            </div>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"><X size={18} /></button>
          </div>

          {loading && <div className="mt-4 animate-pulse text-sm text-[var(--text-secondary)]">Loading profile…</div>}

          {p.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {p.badges.map((b) => <span key={b} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] border border-[var(--border-default)]"><BadgeCheck size={9} className="text-[var(--brand-accent)]" /> {b}</span>)}
            </div>
          )}

          {p.profile_summary && <p className="text-sm text-[var(--text-secondary)] mt-3 whitespace-pre-wrap">{p.profile_summary}</p>}

          {profile?.choir && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <Music size={12} /> Choir · {profile.choir.voice_part} · {profile.choir.role === "director" ? "Director" : "Member"}
            </div>
          )}

          {profile?.service_teams?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {profile.service_teams.map((s) => <span key={s.id} className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><HandHelping size={10} /> {s.service_type}</span>)}
            </div>
          )}

          {p.career_summary && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Career</div>
              <p className="text-sm text-[var(--text-secondary)]">{p.career_summary}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-5 flex-wrap">
            <button onClick={toggleFollow} className={`text-sm px-4 py-1.5 rounded-md border inline-flex items-center gap-1.5 transition-colors ${following ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"}`}>
              {following ? <UserCheck size={13} /> : <UserPlus size={13} />} {following ? "Following" : "Follow"}
            </button>
          </div>

          {/* Message area */}
          <div className="mt-4 border-t border-[var(--border-default)] pt-4">
            <div className="text-xs text-[var(--text-tertiary)] mb-2">Send a message</div>
            <div className="flex gap-2">
              <input value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} placeholder={`Message ${p.name}…`} className="input-clean flex-1" data-testid="modal-msg-input" />
              <button onClick={sendMsg} disabled={msgBusy} className="btn-primary text-sm inline-flex items-center gap-1" data-testid="modal-msg-send">
                {msgBusy ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />} Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeetPeople() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState(user?.country || "");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [msgFor, setMsgFor] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [profileFor, setProfileFor] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (country) params.country = country;
    if (city) params.q = city;
    if (q) params.q = q;
    http.get("/members", { params })
      .then((r) => setMembers(r.data.filter((m) => m.id !== user?.id && m.directory_visible !== false)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [country, city, q, user?.id]);

  useEffect(() => { load(); }, [load]);

  const sendMsg = async () => {
    if (!msgText.trim() || !msgFor) return;
    setMsgBusy(true);
    try { await http.post("/messages", { to_user_id: msgFor.id, body: msgText }); toast.success("Message sent"); setMsgFor(null); setMsgText(""); }
    catch (e) { toast.error(formatErr(e)); } finally { setMsgBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Discover</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Meet Celestial People</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Discover brethren by location, rank, choir, or service.</p>
      </div>

      {/* Search bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name, city, or rank…" className="input-clean pl-8 w-full" data-testid="meet-q" />
          </div>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="input-clean w-36" data-testid="meet-country" />
          <button onClick={load} className="btn-primary inline-flex items-center gap-1" data-testid="meet-search"><Search size={14} /> Search</button>
          <button onClick={() => setFiltersOpen((s) => !s)} className="text-sm px-3 py-1.5 rounded-md border border-[var(--border-default)] inline-flex items-center gap-1 text-[var(--text-secondary)]">
            Filters <ChevronDown size={12} className={filtersOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
        {filtersOpen && (
          <div className="grid sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border-default)]">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input-clean" />
          </div>
        )}
      </div>

      {/* Member grid */}
      <div>
        <div className="text-sm text-[var(--text-secondary)] mb-3">
          {loading ? "Searching…" : `${members.length} member${members.length !== 1 ? "s" : ""} found`}
          {country && ` in ${country}`}
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="card-surface p-5 h-44 animate-pulse bg-[var(--bg-subtle)]" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="card-surface p-10 text-center space-y-2">
            <Users size={32} className="mx-auto text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">No members found. Try a different country or search term.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <MemberCard key={m.id} m={m} currentUser={user} onMessage={setMsgFor} onProfileOpen={setProfileFor} />
            ))}
          </div>
        )}
      </div>

      {/* Quick message modal */}
      {msgFor && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={() => setMsgFor(null)}>
          <div className="card-surface p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-xl text-[var(--brand-primary)] mb-3">Message {msgFor.name}</div>
            <textarea className="input-clean min-h-[100px] resize-none" value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type your message…" data-testid="msg-text" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setMsgFor(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)]">Cancel</button>
              <button onClick={sendMsg} disabled={msgBusy} className="btn-primary inline-flex items-center gap-2" data-testid="msg-send">
                {msgBusy && <Loader2 size={16} className="animate-spin" />} Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full profile modal */}
      {profileFor && <ProfileModal member={profileFor} currentUser={user} onClose={() => setProfileFor(null)} />}
    </div>
  );
}
