import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "../lib/api";
import { Search, MapPin, Church } from "lucide-react";

export default function Parishes() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const load = () => http.get("/parishes", { params: { q: q || undefined, country: country || undefined, city: city || undefined } }).then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Worldwide Directory</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--brand-primary)]">Find your parish</h1>
        <p className="text-[var(--text-secondary)] mt-2">Search by country, city, or parish name. Use this to find the nearest parish when traveling or relocating.</p>
      </div>

      <div className="card-surface p-4 grid sm:grid-cols-4 gap-3 items-center">
        <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 border border-[var(--border-default)] rounded-md">
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parish, shepherd, or address" className="bg-transparent outline-none w-full text-sm" data-testid="parish-search-q" />
        </div>
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="input-clean" data-testid="parish-search-country" />
        <div className="flex gap-2">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input-clean" data-testid="parish-search-city" />
          <button onClick={load} className="btn-primary" data-testid="parish-search-btn">Go</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Link key={p.id} to={`/app/parishes/${p.id}`} data-testid={`parish-card-${p.id}`} className="card-surface p-5 hover:border-[var(--brand-accent)] transition-colors group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] grid place-items-center text-[var(--brand-primary)]"><Church size={18} /></div>
              <div className="min-w-0">
                <div className="font-display text-lg text-[var(--brand-primary)] truncate">{p.name}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1"><MapPin size={12} /> {p.city}, {p.country}</div>
                <div className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{p.description}</div>
                <div className="text-xs mt-3 text-[var(--brand-accent)]">Shepherd: {p.shepherd_name || "—"}</div>
              </div>
            </div>
          </Link>
        ))}
        {items.length === 0 && <div className="card-surface p-6 col-span-full text-sm text-[var(--text-secondary)]">No parishes found.</div>}
      </div>
    </div>
  );
}
