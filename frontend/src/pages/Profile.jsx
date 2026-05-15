import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [ranks, setRanks] = useState([]);
  const [form, setForm] = useState({ name: "", ccc_rank: "", country: "", city: "", profile_summary: "", interested_in_choir: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({
      name: user.name || "", ccc_rank: user.ccc_rank || "",
      country: user.country || "", city: user.city || "",
      profile_summary: user.profile_summary || "",
      interested_in_choir: !!user.interested_in_choir,
    });
    http.get("/settings/ccc_ranks").then((r) => setRanks(r.data));
  }, [user]);

  const save = async () => {
    setBusy(true);
    try {
      await http.patch(`/admin/users/${user.id}`, form).catch(async () => {
        // members may not be admins; fall back to a no-op or self endpoint
        await http.patch(`/admin/users/${user.id}`, form);
      });
      toast.success("Profile saved");
      refresh();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Your profile</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">{user?.name}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">{user?.role} • {user?.email}</p>
      </div>

      {user?.badges?.length > 0 && (
        <div className="card-surface p-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--text-secondary)]">Badges:</span>
          {user.badges.map((b) => (
            <span key={b} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)]" data-testid={`badge-${b}`}><BadgeCheck size={12} className="text-[var(--brand-accent)]" /> {b}</span>
          ))}
        </div>
      )}

      <div className="card-surface p-6 grid sm:grid-cols-2 gap-3">
        <label className="text-sm">Full name<input className="input-clean mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name" /></label>
        <label className="text-sm">CCC rank
          <select className="input-clean mt-1" value={form.ccc_rank} onChange={(e) => setForm({ ...form, ccc_rank: e.target.value })} data-testid="profile-rank">
            <option value="">—</option>
            {ranks.map((r) => (<option key={r.id} value={r.label}>{r.label}</option>))}
          </select>
        </label>
        <label className="text-sm">Country<input className="input-clean mt-1" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="profile-country" /></label>
        <label className="text-sm">City<input className="input-clean mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="profile-city" /></label>
        <label className="text-sm sm:col-span-2">Bio
          <textarea className="input-clean mt-1 min-h-[100px]" value={form.profile_summary} onChange={(e) => setForm({ ...form, profile_summary: e.target.value })} data-testid="profile-bio" />
        </label>
        <label className="text-sm flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.interested_in_choir} onChange={(e) => setForm({ ...form, interested_in_choir: e.target.checked })} /> Interested in the choir</label>
        <div className="sm:col-span-2 flex justify-end"><button onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="profile-save">{busy && <Loader2 size={16} className="animate-spin" />} Save</button></div>
      </div>
    </div>
  );
}
