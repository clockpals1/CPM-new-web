import React, { useState } from "react";
import { Music2, ExternalLink, Play, Radio, Headphones, Star, ChevronRight } from "lucide-react";

const CPM_WAVE_URL = "https://cpmwave.com";

const FEATURED_PLAYLISTS = [
  { id: 1, title: "Sunday Worship Essentials", tracks: 18, mood: "Uplifting", thumb: null },
  { id: 2, title: "Morning Devotion", tracks: 12, mood: "Peaceful", thumb: null },
  { id: 3, title: "Praise & Adoration", tracks: 24, mood: "Joyful", thumb: null },
  { id: 4, title: "Harvest & Thanksgiving", tracks: 15, mood: "Grateful", thumb: null },
];

const HIGHLIGHTS = [
  { label: "Official Celestial hymns, songs, and spiritual music", icon: Music2 },
  { label: "Choir recordings from parishes worldwide", icon: Radio },
  { label: "Curated playlists for worship, prayer, and devotion", icon: Headphones },
  { label: "New releases and featured artists every week", icon: Star },
];

function PlaylistCard({ playlist }) {
  const colors = ["bg-[var(--brand-primary)]", "bg-[var(--brand-accent)]", "bg-emerald-700", "bg-blue-800"];
  const color = colors[(playlist.id - 1) % colors.length];

  return (
    <a
      href={CPM_WAVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="card-surface p-4 flex gap-4 items-center hover:shadow-md transition-shadow group"
      data-testid={`playlist-${playlist.id}`}
    >
      <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center text-white shrink-0`}>
        <Music2 size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--brand-primary)] group-hover:text-[var(--brand-accent)] transition-colors truncate">{playlist.title}</div>
        <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{playlist.tracks} tracks · {playlist.mood}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={12} fill="white" />
        </div>
        <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
      </div>
    </a>
  );
}

export default function Music() {
  const [activeTab, setActiveTab] = useState("discover");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="card-surface overflow-hidden">
        <div className="bg-gradient-to-br from-[var(--brand-primary)] to-[#1a3260] p-8 text-white relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #C5A028 0%, transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-accent)] grid place-items-center">
                <Music2 size={16} />
              </div>
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)] font-semibold">CPM Wave</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight">Music for the Celestial Soul</h1>
            <p className="text-white/70 mt-3 text-sm max-w-xl">
              CPM Wave is the official music companion to CelestialPeopleMeet — authentic Celestial Church worship, praise, hymns, and devotional music curated for your spirit.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href={CPM_WAVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[var(--brand-accent)] text-[var(--brand-primary)] font-semibold px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
                data-testid="cpmwave-open"
              >
                <Play size={16} fill="currentColor" /> Open CPM Wave
              </a>
              <a
                href={CPM_WAVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/30 text-white px-5 py-2.5 rounded-lg hover:bg-white/10 transition-all text-sm"
              >
                <ExternalLink size={14} /> Visit cpmwave.com
              </a>
            </div>
          </div>
        </div>

        {/* Highlights strip */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-default)] bg-[var(--bg-paper)]">
          {HIGHLIGHTS.map(({ label, icon: Icon }, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 grid place-items-center shrink-0 mt-0.5">
                <Icon size={14} className="text-[var(--brand-accent)]" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {["discover", "playlists"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md border text-sm capitalize ${activeTab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Now playing CTA */}
          <div className="card-surface p-5 flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] grid place-items-center shrink-0">
              <Radio size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-display text-xl text-[var(--brand-primary)]">Listen to CPM Wave Live</div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Continuous Celestial worship — hymns, anthems, and praise streams available 24/7 on CPM Wave.</p>
            </div>
            <a
              href={CPM_WAVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 shrink-0"
            >
              <Headphones size={15} /> Listen now
            </a>
          </div>

          {/* About CPM Wave */}
          <div className="card-surface p-6 space-y-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">About CPM Wave</div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              CPM Wave (<strong>cpmwave.com</strong>) is the dedicated music platform of the Celestial People family — purpose-built for authentic Celestial Church of Christ music and worship audio. 
              It hosts official recordings, choir uploads from parishes around the world, curated playlists, and spiritual audio content designed to keep you connected to the music of the church.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Whether you're preparing for Sunday service, in personal devotion, or simply wanting to carry the spirit of CCC with you through the day — CPM Wave is your companion.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
                Explore cpmwave.com <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === "playlists" && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">Featured playlists — click any to open in CPM Wave.</div>
          <div className="space-y-3">
            {FEATURED_PLAYLISTS.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
          <div className="card-surface p-5 text-center space-y-3 mt-4">
            <Music2 size={28} className="mx-auto text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">Explore hundreds more playlists, choir recordings, and devotional albums on CPM Wave.</p>
            <a
              href={CPM_WAVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ExternalLink size={14} /> Browse CPM Wave
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
