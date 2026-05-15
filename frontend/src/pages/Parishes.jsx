import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { http } from "../lib/api";
import {
  Search, MapPin, Church, Users, Clock, Phone, Navigation,
  Globe, Filter, LocateFixed, Loader2, ChevronRight, Star,
  Info, XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function StatusBadge({ status }) {
  const map = { active: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Active"], inactive: ["bg-amber-50 text-amber-700 border-amber-200", "Inactive"] };
  const [cls, label] = map[status] || ["bg-gray-50 text-gray-600 border-gray-200", status];
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-semibold ${cls}`}>{label}</span>;
}

function JoinModeBadge({ mode }) {
  const map = { open: ["text-emerald-600", "Open Join"], location_based: ["text-blue-600", "Location-based"], request_only: ["text-amber-600", "By Request"] };
  const [cls, label] = map[mode] || ["text-gray-500", mode];
  return <span className={`text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{label}</span>;
}

function ParishCard({ p }) {
  return (
    <Link
      to={`/app/parishes/${p.id}`}
      data-testid={`parish-card-${p.id}`}
      className="card-surface p-5 hover:border-[var(--brand-accent)] hover:shadow-md transition-all duration-200 group flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[var(--bg-subtle)] grid place-items-center text-[var(--brand-primary)] flex-shrink-0">
            <Church size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-display text-lg leading-snug text-[var(--brand-primary)] group-hover:text-[var(--brand-secondary)] transition-colors line-clamp-2">{p.name}</div>
            <StatusBadge status={p.status} />
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
            <MapPin size={11} /> {[p.city, p.state, p.country].filter(Boolean).join(", ")}
          </div>
        </div>
      </div>

      {p.description && <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{p.description}</p>}

      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-tertiary)]">
        {p.shepherd_name && <span className="flex items-center gap-1"><Star size={11} className="text-[var(--brand-accent)]" /> {p.shepherd_name}</span>}
        {p.service_times && <span className="flex items-center gap-1"><Clock size={11} /> {p.service_times}</span>}
        {typeof p.member_count === "number" && <span className="flex items-center gap-1"><Users size={11} /> {p.member_count} member{p.member_count !== 1 ? "s" : ""}</span>}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]">
        <JoinModeBadge mode={p.join_mode} />
        <span className="text-xs text-[var(--brand-accent)] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          View Parish <ChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="col-span-full card-surface p-10 text-center space-y-3" data-testid="parish-empty">
      <div className="w-14 h-14 rounded-full bg-[var(--bg-subtle)] grid place-items-center mx-auto">
        <Church size={24} className="text-[var(--text-tertiary)]" />
      </div>
      <div className="font-display text-xl text-[var(--brand-primary)]">No parishes found</div>
      {hasFilters ? (
        <>
          <p className="text-sm text-[var(--text-secondary)]">Try a broader search or remove some filters.</p>
          <button onClick={onClear} className="text-sm text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1">
            <XCircle size={14} /> Clear all filters
          </button>
        </>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">No parishes are listed yet. Check back soon.</p>
      )}
    </div>
  );
}

export default function Parishes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [searched, setSearched] = useState(false);

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = !!(q || country || state || city || statusFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (country) params.country = country;
      if (state) params.state = state;
      if (city) params.city = city;
      if (statusFilter) params.status = statusFilter;
      const { data } = await http.get("/parishes", { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [q, country, state, city, statusFilter]);

  const clearFilters = () => {
    setQ(""); setCountry(""); setState(""); setCity(""); setStatusFilter("");
  };

  const loadNearby = () => {
    if (!navigator.geolocation) {
      setNearbyError("Geolocation is not supported by your browser.");
      return;
    }
    setNearbyLoading(true);
    setNearbyError("");
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const params = {};
          if (user?.country) params.country = user.country;
          if (user?.city) params.city = user.city;
          const { data } = await http.get("/parishes/nearby", { params });
          setNearby(data);
        } catch {
          setNearbyError("Could not load nearby parishes.");
        } finally {
          setNearbyLoading(false);
        }
      },
      () => {
        // fallback to profile location
        const params = {};
        if (user?.country) params.country = user.country;
        if (user?.city) params.city = user.city;
        http.get("/parishes/nearby", { params })
          .then((r) => setNearby(r.data))
          .catch(() => setNearbyError("Could not load nearby parishes."))
          .finally(() => setNearbyLoading(false));
      },
      { timeout: 6000 }
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const handleKeyDown = (e) => { if (e.key === "Enter") load(); };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Worldwide Directory</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)] mt-1">Find your parish</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Search for a Celestial Church of Christ parish worldwide. View the parish profile, get worship directions, and join directly when eligible.
        </p>
      </div>

      {/* Search bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-[var(--border-default)] rounded-md bg-white">
            <Search size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by parish name, shepherd, address, or city…"
              className="bg-transparent outline-none w-full text-sm"
              data-testid="parish-search-q"
            />
            {q && <button onClick={() => setQ("")} className="text-[var(--text-tertiary)] hover:text-red-500"><XCircle size={14} /></button>}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md border text-sm flex items-center gap-1.5 transition-colors ${showFilters || hasFilters ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
            data-testid="toggle-filters"
          >
            <Filter size={14} /> Filters {hasFilters && <span className="w-4 h-4 rounded-full bg-[var(--brand-accent)] text-white text-[9px] grid place-items-center">✓</span>}
          </button>
          <button onClick={load} disabled={loading} className="btn-primary px-5 inline-flex items-center gap-2" data-testid="parish-search-btn">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search
          </button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-default)]" data-testid="parish-filters">
            <input value={country} onChange={(e) => setCountry(e.target.value)} onKeyDown={handleKeyDown} placeholder="Country" className="input-clean" data-testid="parish-search-country" />
            <input value={state} onChange={(e) => setState(e.target.value)} onKeyDown={handleKeyDown} placeholder="State / Region" className="input-clean" data-testid="parish-search-state" />
            <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={handleKeyDown} placeholder="City" className="input-clean" data-testid="parish-search-city" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-clean" data-testid="parish-search-status">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* Nearby parishes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2">
            <LocateFixed size={18} className="text-[var(--brand-accent)]" /> Parishes near you
          </h2>
          {nearby.length === 0 && !nearbyLoading && (
            <button onClick={loadNearby} className="text-xs text-[var(--brand-accent)] hover:underline flex items-center gap-1" data-testid="load-nearby">
              <Globe size={13} /> Use my location
            </button>
          )}
        </div>
        {nearbyLoading && (
          <div className="card-surface p-5 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <Loader2 size={16} className="animate-spin text-[var(--brand-accent)]" /> Finding parishes near you…
          </div>
        )}
        {nearbyError && (
          <div className="card-surface p-4 text-sm text-[var(--text-secondary)] flex items-center gap-2" data-testid="nearby-error">
            <Info size={15} className="text-amber-500 flex-shrink-0" /> {nearbyError}
          </div>
        )}
        {nearby.length === 0 && !nearbyLoading && !nearbyError && (
          <div className="card-surface p-5 border-dashed text-sm text-[var(--text-tertiary)] flex items-center gap-3" data-testid="nearby-empty">
            <LocateFixed size={16} className="flex-shrink-0" />
            <span>Click <strong>Use my location</strong> to see parishes near you, or browse the full directory below.</span>
          </div>
        )}
        {nearby.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="nearby-results">
            {nearby.map((p) => (
              <Link key={p.id} to={`/app/parishes/${p.id}`} data-testid={`nearby-card-${p.id}`}
                className="card-surface p-4 hover:border-[var(--brand-accent)] transition-colors group flex flex-col gap-1.5">
                <div className="font-medium text-[var(--brand-primary)] text-sm group-hover:text-[var(--brand-secondary)] line-clamp-2">{p.name}</div>
                <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><MapPin size={10} /> {p.city}, {p.country}</div>
                {p.service_times && <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><Clock size={10} /> {p.service_times}</div>}
                <div className="mt-auto pt-2 flex gap-2">
                  <span className="text-[10px] text-[var(--brand-accent)] font-semibold flex items-center gap-1">View <ChevronRight size={11} /></span>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 hover:text-[var(--brand-primary)]">
                      <Phone size={10} /> Call
                    </a>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Full directory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-[var(--brand-primary)]">
            {searched && hasFilters ? `Search results` : "All parishes"}
            {searched && !loading && <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">({items.length})</span>}
          </h2>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-[var(--text-tertiary)] hover:text-red-600 flex items-center gap-1">
              <XCircle size={12} /> Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card-surface p-5 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--bg-subtle)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-subtle)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--bg-subtle)] rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-[var(--bg-subtle)] rounded w-full" />
                <div className="h-3 bg-[var(--bg-subtle)] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => <ParishCard key={p.id} p={p} />)}
            {items.length === 0 && <EmptyState hasFilters={hasFilters} onClear={clearFilters} />}
          </div>
        )}
      </div>

      {/* CTA for no parish yet */}
      {!loading && !hasFilters && items.length > 0 && (
        <div className="card-surface p-6 bg-[var(--bg-subtle)] border-[var(--brand-accent)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg text-[var(--brand-primary)]">Haven't found your parish?</div>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Use the search above to filter by country, state, or city — or use your location to find nearby parishes.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={loadNearby} className="btn-primary text-sm inline-flex items-center gap-2">
              <Navigation size={14} /> Near me
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
