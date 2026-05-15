import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Church, Heart, Users, Calendar, Bell, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    http.get("/stats/home").then((r) => setStats(r.data)).catch(() => {});
    http.get("/me/memberships").then((r) => setMemberships(r.data)).catch(() => {});
    http.get("/prayers", { params: { scope: "global" } }).then((r) => setPrayers(r.data.slice(0, 4))).catch(() => {});
    http.get("/events").then((r) => setEvents(r.data.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="card-surface p-7 md:p-10 relative overflow-hidden" data-testid="home-welcome">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-3">Peace, beloved</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Hello, {user?.name?.split(" ")[0] || "friend"}.</h1>
        <p className="mt-2 text-[var(--text-secondary)] max-w-2xl">Your worldwide Celestial family awaits. Connect with your parish, pray together, and serve in your ministry.</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Parishes", v: stats.parishes ?? "–", icon: Church },
            { label: "Members", v: stats.members ?? "–", icon: Users },
            { label: "Prayers", v: stats.prayers ?? "–", icon: Heart },
            { label: "Events", v: stats.events ?? "–", icon: Calendar },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] grid place-items-center text-[var(--brand-primary)]"><s.icon size={18} /></div>
              <div><div className="font-display text-2xl text-[var(--brand-primary)]">{s.v}</div><div className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider">{s.label}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* My Parishes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl text-[var(--brand-primary)]">My Parishes</h2>
          <Link to="/app/parishes" className="text-sm text-[var(--brand-accent)] inline-flex items-center gap-1" data-testid="link-find-parish">Find a parish <ArrowRight size={14} /></Link>
        </div>
        {memberships.length === 0 ? (
          <div className="card-surface p-6 text-sm text-[var(--text-secondary)]">You haven't joined a parish yet. <Link to="/app/parishes" className="text-[var(--brand-accent)] underline">Browse parishes</Link>.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {memberships.map((m) => (
              <Link key={m.id} to={`/app/parishes/${m.parish_id}`} className="card-surface p-5 hover:border-[var(--brand-accent)] transition-colors" data-testid={`my-parish-${m.parish_id}`}>
                <div className="text-xs uppercase tracking-wider text-[var(--brand-accent)]">Approved member</div>
                <div className="font-display text-xl mt-1 text-[var(--brand-primary)]">{m.parish?.name}</div>
                <div className="text-sm text-[var(--text-tertiary)] mt-0.5">{m.parish?.city}, {m.parish?.country}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Prayer + Events */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Recent Prayers</h2>
            <Link to="/app/prayer" className="text-sm text-[var(--brand-accent)]" data-testid="link-prayer-wall">View all →</Link>
          </div>
          <div className="space-y-3">
            {prayers.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No prayers yet.</div> : prayers.map((p) => (
              <div key={p.id} className="card-surface p-4" data-testid={`home-prayer-${p.id}`}>
                <div className="flex items-center gap-2"><Heart size={14} className="text-[var(--brand-accent)]" /><div className="text-sm font-medium text-[var(--brand-primary)]">{p.title}</div></div>
                <div className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{p.body}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-2">by {p.user_name} • {p.prayed_count || 0} prayed</div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl text-[var(--brand-primary)]">Upcoming Events</h2>
            <Link to="/app/events" className="text-sm text-[var(--brand-accent)]" data-testid="link-events">View all →</Link>
          </div>
          <div className="space-y-3">
            {events.length === 0 ? <div className="card-surface p-5 text-sm text-[var(--text-secondary)]">No events scheduled.</div> : events.map((e) => (
              <div key={e.id} className="card-surface p-4" data-testid={`home-event-${e.id}`}>
                <div className="text-xs uppercase tracking-wider text-[var(--brand-accent)]">{e.category}</div>
                <div className="font-display text-lg text-[var(--brand-primary)] mt-1">{e.title}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-1">{new Date(e.starts_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
