import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MapPin, Heart, Users, Globe, Music, Briefcase,
  HandHeart, MessageSquare, Star, ChevronRight, Shield,
} from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1543702404-38c2035462ad?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcGVvcGxlJTIwcHJheWluZyUyMHRvZ2V0aGVyJTIwY29tbXVuaXR5fGVufDB8fHx8MTc3ODg3NDI3M3ww&ixlib=rb-4.1.0&q=85";
const CHOIR_IMG = "https://images.unsplash.com/photo-1720186576697-24c1496a07e1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwY2h1cmNoJTIwY2hvaXIlMjBzaW5naW5nfGVufDB8fHx8MTc3ODg3NDI3M3ww&ixlib=rb-4.1.0&q=85";

const VALUE_CARDS = [
  { icon: MapPin,        title: "Find a parish near you",       desc: "Search by country or city — worldwide." },
  { icon: Globe,         title: "Get directions to worship",    desc: "Every parish has an address. Never miss a Sunday." },
  { icon: Users,         title: "Join your parish digitally",   desc: "Request membership, get approved, belong." },
  { icon: Heart,         title: "Share prayers & testimonies",  desc: "Global wall or just your parish — your choice." },
];

const FEATURE_ROWS = [
  { icon: MessageSquare, title: "Direct messages",      desc: "Private, reverential DMs between brethren." },
  { icon: Music,        title: "Choir groups",         desc: "Join and manage your parish choir online." },
  { icon: HandHeart,     title: "Service teams",        desc: "Ushering, media, welfare — sign up digitally." },
  { icon: Briefcase,     title: "Careers board",        desc: "Celestial jobs and opportunities, worldwide." },
  { icon: Star,          title: "Verified badges",      desc: "Parish admins award trust badges to members." },
  { icon: Shield,        title: "Admin controls",       desc: "Rank management, moderation, and oversight." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[var(--bg-default)]">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border-default)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-9 h-9 rounded-md bg-[var(--brand-primary)] text-white grid place-items-center font-display text-xl font-bold">C</div>
            <div>
              <div className="font-display text-lg leading-tight text-[var(--brand-primary)]">CelestialPeopleMeeet</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Worldwide Celestial Family</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app" data-testid="landing-go-app" className="btn-primary">Enter the app →</Link>
            ) : (
              <>
                <Link to="/auth" data-testid="landing-signin" className="hidden sm:inline text-sm text-[var(--brand-primary)] hover:underline font-medium">Sign in</Link>
                <Link to="/auth" data-testid="landing-get-started" className="btn-accent">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="slide-up">
          <div className="inline-block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-3 py-1 rounded-full mb-5">
            Alleluia — Welcome home
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-[var(--brand-primary)] leading-[1.04]">
            One worldwide<br />Celestial family.<br /><span className="italic text-[var(--brand-accent)]">Connected.</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-lg leading-relaxed">
            Find parishes. Get directions to worship. Pray, sing, serve, and share testimonies with brethren across every continent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" data-testid="hero-cta-join" className="btn-primary flex items-center gap-2">
              Join the family <ChevronRight size={16} />
            </Link>
            <Link to="/auth" data-testid="hero-cta-returning" className="btn-accent">I'm returning</Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm">
            <div><span className="font-display text-2xl text-[var(--brand-primary)] font-semibold">50+</span><div className="text-[var(--text-tertiary)] mt-0.5">Countries</div></div>
            <div className="w-px bg-[var(--border-default)]" />
            <div><span className="font-display text-2xl text-[var(--brand-primary)] font-semibold">∞</span><div className="text-[var(--text-tertiary)] mt-0.5">Parishes</div></div>
            <div className="w-px bg-[var(--border-default)]" />
            <div><span className="font-display text-2xl text-[var(--brand-primary)] font-semibold">1</span><div className="text-[var(--text-tertiary)] mt-0.5">Family</div></div>
          </div>
        </div>
        <div className="relative">
          <img
            src={HERO_IMG}
            alt="Celestial community praying together"
            className="rounded-2xl border border-[var(--border-default)] shadow-lg w-full object-cover aspect-[4/5]"
            data-testid="hero-img"
          />
          <div className="absolute -bottom-5 -left-5 bg-white border border-[var(--border-default)] rounded-2xl px-4 py-3 shadow-md hidden md:flex items-center gap-3">
            <Heart size={18} className="text-[var(--brand-accent)] fill-[var(--brand-accent)]" />
            <div className="text-sm"><div className="font-semibold text-[var(--brand-primary)]">23 brethren prayed</div><div className="text-xs text-[var(--text-tertiary)]">in the last hour</div></div>
          </div>
          <div className="absolute -top-5 -right-5 bg-[var(--brand-primary)] text-white rounded-2xl px-4 py-3 shadow-md hidden md:flex items-center gap-2">
            <MapPin size={16} />
            <div className="text-sm font-medium">147 parishes found nearby</div>
          </div>
        </div>
      </section>

      {/* ── Value Cards ── */}
      <section className="bg-[var(--bg-paper)] border-y border-[var(--border-default)] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-2">What you can do</div>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Built for Celestial parish life.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUE_CARDS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-surface p-6 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-accent)]/10 grid place-items-center">
                  <Icon size={20} className="text-[var(--brand-accent)]" />
                </div>
                <div className="font-display text-lg text-[var(--brand-primary)] leading-snug">{title}</div>
                <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parish Discovery ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-3">Parish discovery</div>
          <h2 className="font-display text-4xl sm:text-5xl text-[var(--brand-primary)] leading-tight">
            Find your nearest parish.<br /><span className="italic">Get directions. Worship.</span>
          </h2>
          <p className="mt-5 text-[var(--text-secondary)] text-base max-w-md">
            Search thousands of CCC parishes worldwide by country or city. Every parish has a verified address — tap to get directions and never miss a service.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { step: "01", text: "Search by country, city, or parish name" },
              { step: "02", text: "View address & shepherd details" },
              { step: "03", text: "Get directions — then join as a member" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full border-2 border-[var(--brand-accent)] grid place-items-center text-xs font-bold text-[var(--brand-accent)]">{step}</div>
                <p className="text-[var(--text-primary)] font-medium pt-1">{text}</p>
              </div>
            ))}
          </div>
          <Link to="/auth" className="inline-flex items-center gap-2 mt-8 btn-primary" data-testid="parish-cta">
            Find a parish <ChevronRight size={16} />
          </Link>
        </div>
        <div className="bg-[var(--bg-paper)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-1">Nearby Parishes</div>
          {[
            { name: "Holy Land Parish", city: "Lagos, Nigeria", dist: "1.2 km" },
            { name: "Mount Zion Parish", city: "London, UK", dist: "3.5 km" },
            { name: "Canaan Parish", city: "Houston, USA", dist: "8.0 km" },
          ].map(({ name, city, dist }) => (
            <div key={name} className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--brand-primary)]/10 rounded-lg grid place-items-center">
                  <MapPin size={16} className="text-[var(--brand-primary)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--brand-primary)]">{name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{city}</div>
                </div>
              </div>
              <div className="text-xs font-medium text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-2.5 py-1 rounded-full">{dist}</div>
            </div>
          ))}
          <div className="text-center pt-2">
            <Link to="/auth" className="text-xs text-[var(--brand-primary)] hover:underline font-medium">View all parishes →</Link>
          </div>
        </div>
      </section>

      {/* ── Community & Spiritual Growth ── */}
      <section className="bg-[var(--brand-primary)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-3">Community & spiritual growth</div>
            <h2 className="font-display text-4xl sm:text-5xl text-white">Pray. Share. Grow. Together.</h2>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">A reverent space to share your heart with your parish and the worldwide Celestial family.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Heart,          title: "Prayer Wall",   desc: "Post requests privately or globally. Brethren pray along with you." },
              { icon: Star,           title: "Testimonies",   desc: "Share answered prayers and spiritual victories with the family." },
              { icon: Globe,         title: "Global Feed",   desc: "See what Celestials worldwide are sharing, celebrating, and praying about." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 border border-white/10 rounded-2xl p-6 text-white">
                <Icon size={22} className="text-[var(--brand-accent)] mb-4" />
                <div className="font-display text-xl mb-2">{title}</div>
                <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Choir / Service / Careers ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <img
          src={CHOIR_IMG}
          alt="Church choir singing"
          className="rounded-2xl border border-[var(--border-default)] w-full object-cover aspect-[4/3] order-2 lg:order-1"
          data-testid="choir-img"
        />
        <div className="order-1 lg:order-2">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] mb-3">More than a social network</div>
          <h2 className="font-display text-4xl sm:text-5xl text-[var(--brand-primary)] leading-tight">
            Sing. Serve.<br /><span className="italic">Find opportunities.</span>
          </h2>
          <p className="mt-5 text-[var(--text-secondary)] max-w-md">
            A digital home for every ministry. Join choir groups, volunteer for service teams, and explore Celestial career opportunities — all in one place.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURE_ROWS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 card-surface rounded-xl">
                <Icon size={17} className="text-[var(--brand-accent)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[var(--brand-primary)]">{title}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/auth" data-testid="choir-cta" className="inline-flex items-center gap-2 mt-8 btn-primary">
            Get started <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[var(--brand-accent)]/10 border-y border-[var(--border-default)] py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="font-display text-5xl sm:text-6xl text-[var(--brand-primary)] mb-4">Alleluia.</div>
          <h2 className="font-display text-2xl sm:text-3xl text-[var(--brand-primary)] mb-4">Your Celestial family is waiting.</h2>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8">
            Join thousands of Celestial brethren already worshipping, praying, and serving together on CelestialPeopleMeeet.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth" data-testid="final-cta-join" className="btn-primary text-base px-8 py-3">
              Join the family — it's free
            </Link>
            <Link to="/auth" data-testid="final-cta-signin" className="btn-accent text-base px-8 py-3">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[var(--brand-primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="font-display text-2xl mb-2">CelestialPeopleMeeet</div>
            <p className="text-sm text-white/60 max-w-xs">The digital home of the Celestial Church of Christ worldwide family.</p>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white/90 mb-3 uppercase tracking-wide text-xs">Explore</div>
            <div className="space-y-2 text-white/60">
              <div>Parishes</div>
              <div>Prayer Wall</div>
              <div>Testimonies</div>
              <div>Events</div>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white/90 mb-3 uppercase tracking-wide text-xs">Community</div>
            <div className="space-y-2 text-white/60">
              <div>Choir</div>
              <div>Service Teams</div>
              <div>Careers</div>
              <div>Messages</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs text-white/40 py-5">
          © {new Date().getFullYear()} CelestialPeopleMeeet · Built for the CCC worldwide family · All rights reserved.
        </div>
      </footer>

    </div>
  );
}
