import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { Music2, ExternalLink, Play, Radio, Headphones, Star, ChevronRight, Loader2, RefreshCw } from "lucide-react";

const CPM_WAVE_URL = "https://cpmwave.com";

const CATEGORY_COLORS = {
  hymn:     "bg-[var(--brand-primary)]",
  praise:   "bg-[var(--brand-accent)]",
  devotion: "bg-emerald-700",
  choir:    "bg-blue-800",
  oldies:   "bg-rose-800",
  worship:  "bg-purple-800",
};
const catColor = (c) => CATEGORY_COLORS[c] || "bg-[var(--brand-primary)]";

const HIGHLIGHTS = [
  { label: "Official Celestial hymns, songs, and spiritual music", icon: Music2 },
  { label: "Choir recordings from parishes worldwide", icon: Radio },
  { label: "Curated playlists for worship, prayer, and devotion", icon: Headphones },
  { label: "New releases and featured artists every week", icon: Star },
];

const FALLBACK_TRACKS = [
  { id: "f1", title: "Oluwa Po Loore", artist: "CCC Makoko Choir", category: "hymn", url: "https://cpmwave.com/music/track/oluwa-po-loore-by-ccc-makoko" },
  { id: "f2", title: "Ijo Mimo", artist: "Seyi Solagbade", category: "praise", url: "https://cpmwave.com/music/track/seyi_solagbade-ijo_mimo-ijo_mimo" },
  { id: "f3", title: "Celestial Oldies", artist: "HOD", category: "oldies", url: "https://cpmwave.com/music/track/celestial-oldies" },
  { id: "f4", title: "Moti Moyin Tele Oluwa Olugbala", artist: "Bro Bro (Steve Pelemo)", category: "worship", url: "https://cpmwave.com/music/track/bro_bro_-_steve_pelemo-moti_moyin_tele-oluwa_olugbala" },
];

function TrackCard({ track }) {
  return (
    <a
      href={track.url || CPM_WAVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="card-surface p-4 flex gap-4 items-center hover:shadow-md transition-shadow group"
      data-testid={`track-${track.id}`}
    >
      <div className={`w-14 h-14 rounded-xl ${catColor(track.category)} flex items-center justify-center text-white shrink-0`}>
        <Music2 size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--brand-primary)] group-hover:text-[var(--brand-accent)] transition-colors truncate">{track.title}</div>
        <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
          {track.artist && <span>{track.artist}</span>}
          {track.artist && track.category && <span className="mx-1">·</span>}
          {track.category && <span className="capitalize">{track.category}</span>}
        </div>
        {track.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{track.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-full bg-[var(--brand-accent)] text-[var(--brand-primary)] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
          <Play size={13} fill="currentColor" />
        </div>
        <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
      </div>
    </a>
  );
}

export default function Music() {
  const [activeTab, setActiveTab] = useState("discover");
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const loadTracks = () => {
    setLoadingTracks(true);
    http.get("/cpmwave/tracks")
      .then((r) => setTracks(r.data?.length ? r.data : FALLBACK_TRACKS))
      .catch(() => setTracks(FALLBACK_TRACKS))
      .finally(() => setLoadingTracks(false));
  };
  useEffect(() => { loadTracks(); }, []);

  const featured = tracks.filter((t) => t.featured);
  const allTracks = tracks;
  const categories = [...new Set(tracks.map((t) => t.category).filter(Boolean))];

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
              CPM Wave is the official music companion — authentic Celestial Church worship, praise, hymns, and devotional music curated for your spirit.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[var(--brand-accent)] text-[var(--brand-primary)] font-semibold px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
                data-testid="cpmwave-open">
                <Play size={16} fill="currentColor" /> Open CPM Wave
              </a>
              <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/30 text-white px-5 py-2.5 rounded-lg hover:bg-white/10 transition-all text-sm">
                <ExternalLink size={14} /> Visit cpmwave.com
              </a>
            </div>
          </div>
        </div>
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
        {["discover", "library"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md border text-sm capitalize ${activeTab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
            {t === "library" ? `Library${tracks.length ? ` (${tracks.length})` : ""}` : "Discover"}
          </button>
        ))}
      </div>

      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Listen live CTA */}
          <div className="card-surface p-5 flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] grid place-items-center shrink-0">
              <Radio size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-display text-xl text-[var(--brand-primary)]">Listen to CPM Wave</div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Authentic Celestial Church hymns, anthems, and devotional music — available on CPM Wave.</p>
            </div>
            <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 shrink-0">
              <Headphones size={15} /> Listen now
            </a>
          </div>

          {/* Featured tracks */}
          {(featured.length > 0 ? featured : allTracks.slice(0, 4)).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  {featured.length ? "Featured Tracks" : "From the Library"}
                </div>
                <button onClick={() => setActiveTab("library")} className="text-xs text-[var(--brand-accent)] hover:underline">
                  View all →
                </button>
              </div>
              {(featured.length ? featured : allTracks.slice(0, 4)).map((t) => (
                <TrackCard key={t.id} track={t} />
              ))}
            </div>
          )}

          {/* About */}
          <div className="card-surface p-6 space-y-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">About CPM Wave</div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong>cpmwave.com</strong> is the dedicated music platform of the Celestial People family — purpose-built for authentic Celestial Church of Christ music. It hosts official recordings, choir uploads from parishes worldwide, curated playlists, and spiritual audio designed to keep you connected to the music of the church.
            </p>
            <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer"
              className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
              Explore cpmwave.com <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              {allTracks.length} track{allTracks.length !== 1 ? "s" : ""} — click any to open on CPM Wave
            </p>
            <button onClick={loadTracks} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-accent)] inline-flex items-center gap-1">
              {loadingTracks ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
            </button>
          </div>

          {/* Category filter chips */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span key={c} className={`text-xs px-2.5 py-1 rounded-full capitalize text-white ${catColor(c)}`}>{c}</span>
              ))}
            </div>
          )}

          {loadingTracks ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((n) => <div key={n} className="card-surface h-20 rounded-xl" />)}
            </div>
          ) : allTracks.length === 0 ? (
            <div className="card-surface p-10 text-center space-y-3">
              <Music2 size={28} className="mx-auto text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-secondary)]">No tracks in the library yet. Admin can add tracks from the Admin → CPM Wave tab.</p>
              <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm">
                <ExternalLink size={14} /> Browse CPM Wave directly
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {allTracks.map((t) => <TrackCard key={t.id} track={t} />)}
            </div>
          )}

          <div className="card-surface p-5 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">Discover hundreds more Celestial songs on CPM Wave.</p>
            <a href={CPM_WAVE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
              <ExternalLink size={14} /> Browse CPM Wave
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
