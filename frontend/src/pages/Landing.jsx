import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Heart, Users, Globe2 } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1543702404-38c2035462ad?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcGVvcGxlJTIwcHJheWluZyUyMHRvZ2V0aGVyJTIwY29tbXVuaXR5fGVufDB8fHx8MTc3ODg3NDI3M3ww&ixlib=rb-4.1.0&q=85";
const CHOIR_IMG = "https://images.unsplash.com/photo-1720186576697-24c1496a07e1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwY2h1cmNoJTIwY2hvaXIlMjBzaW5naW5nfGVufDB8fHx8MTc3ODg3NDI3M3ww&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[var(--bg-default)]">
      {/* Topbar */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border-default)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-9 h-9 rounded-md bg-[var(--brand-primary)] text-white grid place-items-center font-display text-xl">C</div>
            <div>
              <div className="font-display text-lg leading-tight text-[var(--brand-primary)]">CelestialPeopleMeeet</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">The Worldwide Celestial Family</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app" data-testid="landing-go-app" className="btn-primary">Enter the app →</Link>
            ) : (
              <>
                <Link to="/auth" data-testid="landing-signin" className="hidden sm:inline text-sm text-[var(--brand-primary)] hover:underline">Sign in</Link>
                <Link to="/auth" data-testid="landing-get-started" className="btn-accent">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div className="slide-up">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-4">A new chapter of fellowship</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[var(--brand-primary)] leading-[1.05]">
            One worldwide Celestial family. <span className="italic">Connected.</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-xl">
            Discover parishes anywhere in the world. Belong to your local parish digitally. Pray, sing, serve and share testimonies with brethren across continents.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" data-testid="hero-cta-join" className="btn-primary">Begin your journey</Link>
            <Link to="/auth" data-testid="hero-cta-returning" className="btn-accent">I'm returning</Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md text-sm">
            <div><div className="font-display text-3xl text-[var(--brand-primary)]">12+</div><div className="text-[var(--text-tertiary)]">Countries</div></div>
            <div><div className="font-display text-3xl text-[var(--brand-primary)]">∞</div><div className="text-[var(--text-tertiary)]">Parishes</div></div>
            <div><div className="font-display text-3xl text-[var(--brand-primary)]">1</div><div className="text-[var(--text-tertiary)]">Family</div></div>
          </div>
        </div>
        <div className="relative">
          <img src={HERO_IMG} alt="Celestial community" className="rounded-2xl border border-[var(--border-default)] shadow-sm w-full object-cover aspect-[4/5]" data-testid="hero-img" />
          <div className="absolute -bottom-6 -left-6 bg-white border border-[var(--border-default)] rounded-xl p-4 shadow-sm flex items-center gap-3 hidden md:flex">
            <Heart size={20} className="text-[var(--brand-accent)]" />
            <div className="text-sm"><div className="font-medium">23 brethren prayed</div><div className="text-xs text-[var(--text-tertiary)]">in the last hour</div></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[var(--bg-paper)] border-y border-[var(--border-default)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Built for parish life, not just posts.</h2>
            <p className="mt-3 text-[var(--text-secondary)]">CelestialPeopleMeeet is a quiet, reverent space for the worldwide CCC family. Modern as Microsoft 365. Warm as your parish on a Sunday morning.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { icon: Globe2, t: "Find your parish, anywhere", d: "Search worldwide parishes by country, city, or shepherd. Discover the closest parish when you travel or relocate." },
              { icon: Users, t: "Meet Celestial people", d: "Connect with brethren in your country. Follow, message, and grow your spiritual circle." },
              { icon: Heart, t: "Prayer wall + testimonies", d: "Submit prayer requests privately, parish-wide, or globally. Share testimonies, harvest, and answered prayers." },
              { icon: Sparkles, t: "Choir & service teams", d: "Join the choir, ushering, media, welfare. Verified members earn trust badges curated by your parish admin." },
            ].map((f) => (
              <div key={f.t} className="card-surface p-6">
                <f.icon size={22} className="text-[var(--brand-accent)]" />
                <div className="font-display text-xl mt-3 text-[var(--brand-primary)]">{f.t}</div>
                <p className="text-sm mt-2 text-[var(--text-secondary)]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choir block */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
        <img src={CHOIR_IMG} alt="Choir" className="rounded-2xl border border-[var(--border-default)] w-full object-cover aspect-[4/3]" data-testid="choir-img" />
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-4">For every voice</div>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">A digital home for parish life — designed with reverence.</h2>
          <p className="mt-5 text-[var(--text-secondary)]">Roles, approvals, and moderation are baked in. Parish admins manage members, badges, choir verification, and announcements. Super admin controls ranks, badges, categories, and the worldwide parish directory.</p>
          <Link to="/auth" data-testid="choir-cta" className="inline-block mt-6 btn-primary">Join the family</Link>
        </div>
      </section>

      <footer className="bg-[var(--brand-primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-display text-2xl">CelestialPeopleMeeet</div>
            <p className="text-sm mt-2 text-white/70">Built for the Celestial Church of Christ family worldwide.</p>
          </div>
          <div className="text-sm text-white/70">
            <div className="font-medium text-white mb-2">Community</div>
            <div>Parishes • Prayer Wall • Choir • Service</div>
          </div>
          <div className="text-sm text-white/70">
            <div className="font-medium text-white mb-2">Stay reverent</div>
            <div>Strong moderation. Member privacy. Admin-managed trust.</div>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs text-white/50 py-4">© {new Date().getFullYear()} CelestialPeopleMeeet. All rights reserved.</div>
      </footer>
    </div>
  );
}
