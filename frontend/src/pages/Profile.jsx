import React, { useEffect, useRef, useState, useCallback } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Loader2, BadgeCheck, Camera, Eye, EyeOff, MapPin, Briefcase,
  Music, HandHelping, Shield, ChevronDown, ChevronUp, Star, Users,
} from "lucide-react";
import { toast } from "sonner";

const PRIVACY_OPTS = [
  { v: "public", l: "Public" },
  { v: "members", l: "Members only" },
  { v: "private", l: "Hidden" },
];

function PrivacySelect({ field, value, onChange }) {
  return (
    <select
      className="text-xs border border-[var(--border-default)] rounded px-2 py-1 bg-[var(--bg-paper)] text-[var(--text-secondary)]"
      value={value || "members"}
      onChange={(e) => onChange(field, e.target.value)}
      data-testid={`privacy-${field}`}
    >
      {PRIVACY_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function AvatarUploader({ currentAvatar, name, onUploaded }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(currentAvatar || "");
  const [uploading, setUploading] = useState(false);

  const pick = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await http.post("/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Photo updated");
      if (onUploaded) onUploaded(data.avatar);
    } catch (ex) { toast.error(formatErr(ex)); } finally { setUploading(false); }
  };

  const initials = (name || "U").slice(0, 1).toUpperCase();
  return (
    <div className="relative group w-24 h-24 shrink-0" data-testid="avatar-uploader">
      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[var(--brand-primary)] text-white flex items-center justify-center text-3xl font-display shadow-md">
        {preview ? <img src={preview} alt="avatar" className="w-full h-full object-cover" /> : initials}
        {uploading && <div className="absolute inset-0 bg-black/40 grid place-items-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
      </div>
      <button onClick={pick} className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--brand-accent)] text-white grid place-items-center shadow hover:scale-110 transition-transform" data-testid="avatar-pick">
        <Camera size={14} />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const [ranks, setRanks] = useState([]);
  const [choirStatus, setChoirStatus] = useState([]);
  const [serviceTeams, setServiceTeams] = useState([]);
  const [form, setForm] = useState({
    name: "", ccc_rank: "", country: "", city: "",
    profile_summary: "", career_summary: "",
    interested_in_choir: false, directory_visible: true,
    privacy: {},
  });
  const [busy, setBusy] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    http.get("/settings/ccc_ranks").then((r) => setRanks(r.data)).catch(() => {});
    http.get("/me/choir-status").then((r) => setChoirStatus(r.data)).catch(() => {});
    http.get("/me/service-teams").then((r) => setServiceTeams(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        ccc_rank: user.ccc_rank || "",
        country: user.country || "",
        city: user.city || "",
        profile_summary: user.profile_summary || "",
        career_summary: user.career_summary || "",
        interested_in_choir: !!user.interested_in_choir,
        directory_visible: user.directory_visible !== false,
        privacy: user.privacy || {},
      });
    }
  }, [user]);

  const setPrivacy = (field, value) => setForm((f) => ({ ...f, privacy: { ...f.privacy, [field]: value } }));

  const save = async () => {
    setBusy(true);
    try {
      await http.patch("/me/profile", form);
      toast.success("Profile saved");
      refresh();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const completionFields = ["name", "ccc_rank", "country", "city", "profile_summary"];
  const filled = completionFields.filter((f) => !!form[f]).length;
  const pct = Math.round((filled / completionFields.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Identity</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">My Profile</h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{user?.email} · {user?.role}</p>
      </div>

      {/* Completion banner */}
      {pct < 100 && (
        <div className="card-surface p-4 flex items-center gap-4" data-testid="profile-completion">
          <div className="flex-1">
            <div className="text-sm font-medium text-[var(--brand-primary)]">Profile {pct}% complete</div>
            <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[var(--brand-accent)] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] shrink-0">Add a photo, bio, and city to complete your profile.</div>
        </div>
      )}

      {/* Identity row */}
      <div className="card-surface p-6 flex items-start gap-5 flex-wrap">
        <AvatarUploader currentAvatar={user?.avatar} name={user?.name} onUploaded={() => refresh()} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-display text-2xl text-[var(--brand-primary)]">{form.name || user?.name}</div>
          {form.ccc_rank && <div className="text-sm text-[var(--brand-accent)] font-medium">{form.ccc_rank}</div>}
          {(form.country || form.city) && (
            <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <MapPin size={11} /> {[form.city, form.country].filter(Boolean).join(", ")}
            </div>
          )}
          {/* Badges */}
          {user?.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {user.badges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] border border-[var(--border-default)]" data-testid={`badge-${b}`}>
                  <BadgeCheck size={10} className="text-[var(--brand-accent)]" /> {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Choir + Service chips */}
      {(choirStatus.length > 0 || serviceTeams.length > 0) && (
        <div className="flex flex-wrap gap-2" data-testid="profile-service-chips">
          {choirStatus.filter((c) => c.status === "verified").map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30">
              <Music size={11} /> {c.role === "director" ? "Choir Director" : "Choir"} · {c.voice_part}
            </span>
          ))}
          {serviceTeams.filter((s) => s.status === "approved").map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <HandHelping size={11} /> {s.service_type} · {s.parish?.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit form */}
      <div className="card-surface p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-tertiary)] mb-3">Personal Information</div>
        </div>
        <label className="text-sm">
          Full name
          <input className="input-clean mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name" />
        </label>
        <label className="text-sm">
          CCC Rank / Title
          <select className="input-clean mt-1" value={form.ccc_rank} onChange={(e) => setForm({ ...form, ccc_rank: e.target.value })} data-testid="profile-rank">
            <option value="">— Select rank —</option>
            {ranks.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Country
          <input className="input-clean mt-1" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="profile-country" />
        </label>
        <label className="text-sm">
          City
          <div className="flex gap-1.5 mt-1">
            <input className="input-clean flex-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="profile-city" />
            <PrivacySelect field="city" value={form.privacy?.city} onChange={setPrivacy} />
          </div>
        </label>
        <label className="text-sm sm:col-span-2">
          Bio / Profile summary
          <textarea className="input-clean mt-1 min-h-[90px] resize-none" value={form.profile_summary} onChange={(e) => setForm({ ...form, profile_summary: e.target.value })} placeholder="Share a little about yourself with fellow Celestials…" data-testid="profile-bio" />
        </label>
        <label className="text-sm sm:col-span-2">
          Career / Professional summary
          <div className="flex gap-1.5 mt-1 items-start">
            <textarea className="input-clean flex-1 min-h-[70px] resize-none" value={form.career_summary} onChange={(e) => setForm({ ...form, career_summary: e.target.value })} placeholder="Your professional background or skills (optional — useful for Jobs & Careers networking)…" data-testid="profile-career" />
            <PrivacySelect field="career_summary" value={form.privacy?.career_summary} onChange={setPrivacy} />
          </div>
        </label>
        <label className="text-sm flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={form.interested_in_choir} onChange={(e) => setForm({ ...form, interested_in_choir: e.target.checked })} />
          Interested in joining / staying in choir ministry
        </label>
        <label className="text-sm flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={form.directory_visible} onChange={(e) => setForm({ ...form, directory_visible: e.target.checked })} data-testid="profile-visible" />
          Appear in Meet People directory
        </label>

        {/* Privacy section */}
        <div className="sm:col-span-2 border-t border-[var(--border-default)] pt-3">
          <button onClick={() => setPrivacyOpen((s) => !s)} className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 hover:text-[var(--brand-primary)]">
            {privacyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Privacy settings
          </button>
          {privacyOpen && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm" data-testid="privacy-panel">
              {[["city", "City visibility"], ["career_summary", "Career summary visibility"]].map(([f, l]) => (
                <div key={f} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">{l}</span>
                  <PrivacySelect field={f} value={form.privacy?.[f]} onChange={setPrivacy} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="profile-save">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
