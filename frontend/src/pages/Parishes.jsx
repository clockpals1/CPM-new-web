import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { http } from "../lib/api";
import {
  Search, MapPin, Church, Users, Clock, Phone, Navigation,
  Globe, Filter, LocateFixed, Loader2, ChevronRight, Star,
  Info, XCircle, UserPlus, ArrowRight, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function StatusBadge({ status }) {
  const map = {
    active: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Active"],
    inactive: ["bg-amber-50 text-amber-700 border-amber-200", "Inactive"],
  };
  const [cls, label] = map[status] || ["bg-gray-50 text-gray-600 border-gray-200", status];
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-semibold ${cls}`}>{label}</span>;
}

function JoinModePill({ mode, status }) {
  if (status !== "active") return null;
  const map = {
    open: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Open to join"],
    location_based: ["bg-blue-50 text-blue-700 border-blue-200", "Location-based"],
    request_only: ["bg-amber-50 text-amber-700 border-amber-200", "By Request"],
    invite_only: ["bg-gray-50 text-gray-600 border-gray-200", "Invite only"],
  };
  const [cls, label] = map[mode] || ["bg-gray-50 text-gray-500 border-gray-200", mode || "Open"];
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function ParishCard({ p }) {
  const canJoin = p.status === "active" && p.join_mode !== "invite_only";
  return (
    <div className="card-surface flex flex-col hover:border-[var(--brand-accent)] hover:shadow-md transition-all duration-200 overflow-hidden group" data-testid={`parish-card-${p.id}`}>
      {p.image_url && (
        <div className="h-32 overflow-hidden bg-[var(--bg-subtle)]">
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start gap-3">
          {!p.image_url && (
            <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/10 grid place-items-center shrink-0">
              <Church size={20} className="text-[var(--brand-primary)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg leading-snug text-[var(--brand-primary)] group-hover:text-[var(--brand-secondary)] transition-colors line-clamp-2">{p.name}</h3>
              <StatusBadge status={p.status} />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
              <MapPin size={10} className="shrink-0" /> {[p.city, p.state, p.country].filter(Boolean).join(", ")}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)]">
          {p.shepherd_name && (
            <span className="flex items-center gap-1.5">
              <Star size={11} className="text-[var(--brand-accent)] shrink-0" /> Shepherd: <span className="font-medium text-[var(--text-primary)]">{p.shepherd_name}</span>
            </span>
          )}
          {p.service_times && (
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="text-[var(--brand-accent)] shrink-0" /> {p.service_times}
            </span>
          )}
          {typeof p.member_count === "number" && (
            <span className="flex items-center gap-1.5">
              <Users size={11} className="text-[var(--brand-accent)] shrink-0" /> {p.member_count} member{p.member_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {p.description && <p className="text-sm text-[var(--text-secondary)] line-clamp-2 flex-1">{p.description}</p>}

        <div className="mt-auto pt-3 border-t border-[var(--border-default)] space-y-2">
          <JoinModePill mode={p.join_mode} status={p.status} />
          <div className="flex gap-2">
            {canJoin ? (
              <>
                <Link
                  to={`/app/parishes/${p.id}`}
                  className="flex-1 btn-primary flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium"
                  data-testid={`join-btn-${p.id}`}
                >
                  <UserPlus size={14} /> Join Parish
                </Link>
                <Link
                  to={`/app/parishes/${p.id}`}
                  className="px-3 py-2.5 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1 shrink-0"
                  data-testid={`view-btn-${p.id}`}
                >
                  <Info size={13} />
                </Link>
              </>
            ) : (
              <Link
                to={`/app/parishes/${p.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-[var(--brand-accent)] font-medium rounded-lg border border-[var(--brand-accent)]/30 hover:bg-[var(--brand-accent)]/5 transition-colors"
              >
                View Parish <ChevronRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NearbyCard({ p }) {
  const canJoin = p.status === "active" && p.join_mode !== "invite_only";
  return (
    <div className="card-surface p-4 hover:border-[var(--brand-accent)] transition-all group flex flex-col gap-2" data-testid={`nearby-card-${p.id}`}>
      <div className="font-medium text-[var(--brand-primary)] text-sm group-hover:text-[var(--brand-secondary)] line-clamp-2 leading-snug">{p.name}</div>
      <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><MapPin size={10} /> {[p.city, p.country].filter(Boolean).join(", ")}</div>
      {p.service_times && <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><Clock size={10} /> {p.service_times}</div>}
      <div className="mt-auto pt-2 border-t border-[var(--border-default)] flex gap-2">
        {canJoin ? (
          <Link to={`/app/parishes/${p.id}`} className="flex-1 btn-primary flex items-center justify-center gap-1 py-1.5 text-xs">
            <UserPlus size={11} /> Join
          </Link>
        ) : (
          <Link to={`/app/parishes/${p.id}`} className="flex-1 text-center text-xs text-[var(--brand-accent)] font-medium flex items-center justify-center gap-1 py-1.5 rounded-md border border-[var(--brand-accent)]/30">
            View <ChevronRight size={11} />
          </Link>
        )}
        {p.phone && (
          <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()} className="px-2.5 py-1.5 rounded-md border border-[var(--border-default)] text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] flex items-center gap-1">
            <Phone size={10} />
          </a>
        )}
      </div>
    </div>
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

function SkeletonCard() {
  return (
    <div className="card-surface p-5 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--bg-subtle)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--bg-subtle)] rounded w-3/4" />
          <div className="h-3 bg-[var(--bg-subtle)] rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-[var(--bg-subtle)] rounded w-full" />
      <div className="h-3 bg-[var(--bg-subtle)] rounded w-2/3" />
      <div className="h-9 bg-[var(--bg-subtle)] rounded-lg w-full mt-2" />
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
    setNearbyLoading(true);
    setNearbyError("");
    const doFetch = () => {
      const params = {};
      if (user?.country) params.country = user.country;
      if (user?.city) params.city = user.city;
      http.get("/parishes/nearby", { params })
        .then((r) => setNearby(r.data))
        .catch(() => setNearbyError("Could not load nearby parishes."))
        .finally(() => setNearbyLoading(false));
    };
    if (!navigator.geolocation) { doFetch(); return; }
    navigator.geolocation.getCurrentPosition(() => doFetch(), () => doFetch(), { timeout: 6000 });
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
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl">
          Search the worldwide Celestial Church of Christ parish directory. Open parishes can be joined instantly — no approval needed.
        </p>
      </div>

      {/* Search bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-[var(--border-default)] rounded-lg bg-white">
            <Search size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, shepherd, city, or country…"
              className="bg-transparent outline-none w-full text-sm"
              data-testid="parish-search-q"
            />
            {q && <button onClick={() => setQ("")} className="text-[var(--text-tertiary)] hover:text-red-500"><XCircle size={14} /></button>}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${showFilters || hasFilters ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
            data-testid="toggle-filters"
          >
            <Filter size={14} /> Filters {hasFilters && <span className="w-4 h-4 rounded-full bg-[var(--brand-accent)] text-white text-[9px] grid place-items-center">✓</span>}
          </button>
          <button onClick={load} disabled={loading} className="btn-primary px-5 inline-flex items-center gap-2 rounded-lg" data-testid="parish-search-btn">
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

      {/* Parishes near you */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-[var(--brand-primary)] flex items-center gap-2">
            <LocateFixed size={18} className="text-[var(--brand-accent)]" /> Parishes near you
          </h2>
          {!nearbyLoading && (
            <button onClick={loadNearby} className="text-xs text-[var(--brand-accent)] hover:underline flex items-center gap-1" data-testid="load-nearby">
              <Globe size={13} /> {nearby.length > 0 ? "Refresh" : "Use my location"}
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
            <LocateFixed size={16} className="shrink-0" />
            <span>Tap <strong>Use my location</strong> to discover CCC parishes closest to you.</span>
          </div>
        )}
        {nearby.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="nearby-results">
            {nearby.map((p) => <NearbyCard key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {/* Full directory */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[var(--brand-primary)]">
            {searched && hasFilters ? "Search results" : "All parishes"}
            {searched && !loading && (
              <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">({items.length})</span>
            )}
          </h2>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-[var(--text-tertiary)] hover:text-red-600 flex items-center gap-1">
              <XCircle size={12} /> Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => <ParishCard key={p.id} p={p} />)}
            {items.length === 0 && <EmptyState hasFilters={hasFilters} onClear={clearFilters} />}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {!loading && items.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[var(--brand-accent)]/30">
          <div className="h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-accent)] to-[var(--brand-primary)]" />
          <div className="bg-[var(--bg-subtle)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-display text-lg text-[var(--brand-primary)]">Can't find your parish?</div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Filter by country, state, or city — or tap Near me to search by your location.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={loadNearby} disabled={nearbyLoading} className="btn-primary text-sm inline-flex items-center gap-2">
                {nearbyLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />} Near me
              </button>
              <Link to="/app/my-parish" className="text-sm px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)] inline-flex items-center gap-1.5 transition-colors">
                <CheckCircle2 size={14} /> My Parish <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
