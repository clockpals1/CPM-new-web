import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight, Loader2, Search, X, CheckCircle2, Church, MapPin,
  Phone, User, Plus, AlertCircle, Building2,
} from "lucide-react";

const ranksForMen = [
  "Brother", "Elder Brother", "Prophet", "Cape Elder Brother", "Full Elder Brother", "Senior Elder Brother",
  "Assistant Leader", "Woleader", "Leader", "Senior Woleader", "Senior Leader", "Superior Senior Leader",
  "Superior Senior Woleader", "Honorary Assistant Evangelist", "Assistant Evangelist",
  "Honorary Evangelist", "Evangelist", "Honorary Senior Evangelist", "Senior Evangelist", "Most Senior Evangelist",
  "Superior Evangelist", "Most Superior Evangelist", "Supreme Evangelist", "Other",
];

const ranksForWomen = [
  "Sister", "Prophetess", "Wolima", "Cape Elder Sister", "Senior Prophetess", "Senior Elder Sister",
  "Superior Senior Prophetess", "Superior Senior Elder Sister", "Lace Superior Senior Prophetess",
  "Lace Superior Senior Elder Sister", "Other",
];

// parish_info step removed — details are now collected inline in the create-parish form
const STEPS_NEW = [
  { key: "welcome",       type: "intro" },
  { key: "name",          type: "text",         q: "Beautiful. What name should we call you?",          placeholder: "Full name" },
  { key: "sex",           type: "sex",          q: "Are you joining as a brother or a sister in the Lord?" },
  { key: "ccc_rank",      type: "rank_select",  q: "What is your CCC rank or title?",                   skippable: true },
  { key: "country",       type: "text",         q: "Which country are you currently in?",               placeholder: "e.g., Nigeria" },
  { key: "city",          type: "text",         q: "And which city or state?",                          placeholder: "e.g., Lagos" },
  { key: "parish_search", type: "parish_search",q: "Let's find your parish.",                           skippable: true },
  { key: "choir",         type: "yesno",        q: "Are you part of the choir, or interested in joining?" },
  { key: "email",         type: "email",        q: "What email should we use to reach you?" },
  { key: "password",      type: "password",     q: "Create a password to secure your account." },
];

const STEPS_RETURN = [
  { key: "email",    type: "email",    q: "Welcome back. What is your email?" },
  { key: "password", type: "password", q: "And your password?" },
];

const AUTO_ADVANCE = new Set(["sex", "yesno"]);
const SHOW_FOOTER  = new Set(["text", "email", "password", "rank_select"]);

// Parish sub-phases
const PH = { SEARCH: "search", CONFIRM: "confirm", CREATE: "create", DUP: "dup", DONE: "done" };

// ── Parish sub-component ──────────────────────────────────────────────────────
function ParishStep({ data, setField }) {
  const [ph, setPh] = useState(PH.SEARCH);
  const [pq, setPq] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [dups, setDups] = useState([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [pform, setPform] = useState({
    name: "", city: "", country: "", state: "", address: "", shepherd_name: "", phone: "",
  });

  // Debounced live search
  useEffect(() => {
    if (ph !== PH.SEARCH || !pq.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: res } = await http.get("/parishes", {
          params: { q: pq, country: data.country, city: data.city },
        });
        setResults(res);
      } catch { setResults([]); }
      setSearching(false);
    }, 380);
    return () => clearTimeout(t);
  }, [pq, ph, data.country, data.city]);

  // Pre-fill create form from search context + user's location
  const enterCreatePhase = (prefillName) => {
    setPform({
      name:          prefillName || pq || "",
      city:          data.city || "",
      country:       data.country || "",
      state:         "",
      address:       "",
      shepherd_name: "",
      phone:         "",
    });
    setErr("");
    setPh(PH.CREATE);
  };

  const handleCreate = async (forceCreate = false) => {
    if (!pform.name.trim() || !pform.city.trim() || !pform.country.trim()) {
      setErr("Parish name, city and country are required."); return;
    }
    setCreating(true); setErr("");
    try {
      const { data: res } = await http.post("/parishes/lookup-or-create", {
        ...pform,
        force_create:   forceCreate,
        contributed_by: data.name || "",
      });
      if (!forceCreate && res.matches?.length > 0) {
        setDups(res.matches);
        setPh(PH.DUP);
      } else {
        setField("parish_id", res.parish.id);
        setField("parish_name_display", res.parish.name);
        setField("parish_is_new", true);
        setCandidate(res.parish);
        setPh(PH.DONE);
      }
    } catch (e) { setErr(formatErr(e)); }
    setCreating(false);
  };

  const confirmExisting = (parish) => {
    setField("parish_id", parish.id);
    setField("parish_name_display", parish.name);
    setField("parish_is_new", false);
    setCandidate(parish);
    setPh(PH.DONE);
  };

  const clearSelection = () => {
    setField("parish_id", null);
    setField("parish_name_display", null);
    setField("parish_is_new", null);
    setCandidate(null);
    setPq("");
    setResults([]);
    setDups([]);
    setPh(PH.SEARCH);
  };

  const pf = (k) => (e) => setPform((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      {/* ── DONE — parish confirmed ────────────────── */}
      {ph === PH.DONE && candidate && (
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {data.parish_is_new
              ? "Your parish has been added to the CCC directory and will be reviewed by an admin shortly."
              : "Perfect — you'll be joined to this parish after sign-up."}
          </p>
          <div className={`rounded-2xl p-4 border-2 ${data.parish_is_new ? "border-[var(--brand-accent)]/50 bg-amber-50/40" : "border-emerald-300 bg-emerald-50/40"}`}>
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${data.parish_is_new ? "bg-[var(--brand-accent)]/10" : "bg-emerald-100"}`}>
                <Church size={19} className={data.parish_is_new ? "text-[var(--brand-accent)]" : "text-emerald-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--brand-primary)] text-sm leading-snug">{candidate.name}</div>
                {(candidate.city || candidate.country) && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <MapPin size={10} className="shrink-0" />
                    {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {candidate.shepherd_name && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <User size={10} className="shrink-0" /> {candidate.shepherd_name}
                  </div>
                )}
                {data.parish_is_new && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] font-semibold uppercase tracking-wide">
                    Pending admin review
                  </span>
                )}
              </div>
              <button onClick={clearSelection} className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] shrink-0 mt-0.5" title="Change parish">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM — "Is this your parish?" ──────── */}
      {ph === PH.CONFIRM && candidate && (
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Is this the right parish?</p>
          <div className="rounded-2xl border-2 border-[var(--brand-primary)]/15 bg-[var(--bg-subtle)] p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0">
                <Church size={22} className="text-[var(--brand-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl text-[var(--brand-primary)] leading-snug">{candidate.name}</div>
                {(candidate.city || candidate.country) && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mt-1.5">
                    <MapPin size={11} className="shrink-0" />
                    {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {candidate.shepherd_name && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <User size={11} className="shrink-0" /> Shepherd: {candidate.shepherd_name}
                  </div>
                )}
                {candidate.address && (
                  <div className="flex items-start gap-1 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <MapPin size={11} className="shrink-0 mt-0.5" /> {candidate.address}
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <Phone size={11} className="shrink-0" /> {candidate.phone}
                  </div>
                )}
                {candidate.status === "pending_review" && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                    Added by community — awaiting admin review
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => confirmExisting(candidate)} className="btn-primary flex items-center justify-center gap-2 py-3">
              <CheckCircle2 size={15} /> Yes, this is mine
            </button>
            <button
              onClick={() => { setCandidate(null); setPh(PH.SEARCH); }}
              className="px-4 py-3 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--brand-primary)] transition-colors"
            >
              No, not this one
            </button>
          </div>
        </div>
      )}

      {/* ── DUP — similar found during creation ───── */}
      {ph === PH.DUP && (
        <div>
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 mb-4">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-800">Similar parishes found</div>
              <div className="text-xs text-amber-700 mt-0.5">Could any of these be your parish? Selecting an existing one avoids duplicates.</div>
            </div>
          </div>
          <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
            {dups.map((p) => (
              <button
                key={p.id}
                onClick={() => confirmExisting(p)}
                className="w-full text-left p-3.5 rounded-xl border border-[var(--border-default)] hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Church size={14} className="text-[var(--brand-primary)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--brand-primary)]">{p.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {[p.city, p.state, p.country].filter(Boolean).join(", ")}
                      {p.shepherd_name && ` · Shep. ${p.shepherd_name}`}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 shrink-0">Use this →</span>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => handleCreate(true)}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--brand-accent)]/40 bg-amber-50/50 hover:bg-amber-50 text-sm text-[var(--brand-primary)] font-medium transition-colors"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              None of these — add my parish anyway
            </button>
            <button onClick={() => setPh(PH.CREATE)} className="w-full text-center text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] py-1">
              ← Edit parish details
            </button>
          </div>
          {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
        </div>
      )}

      {/* ── CREATE — new parish form ───────────────── */}
      {ph === PH.CREATE && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-accent)]/10 flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-[var(--brand-accent)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--brand-primary)]">Add your parish to the CCC directory</div>
              <div className="text-xs text-[var(--text-tertiary)]">Help grow the worldwide map — admin will verify it shortly.</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">
                Parish Name <span className="text-red-500">*</span>
              </label>
              <input className="input-clean" placeholder="e.g., CCC Morning Star Parish" value={pform.name} onChange={pf("name")} autoFocus data-testid="parish-create-name" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">City <span className="text-red-500">*</span></label>
                <input className="input-clean" placeholder="e.g., Lagos" value={pform.city} onChange={pf("city")} data-testid="parish-create-city" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">Country <span className="text-red-500">*</span></label>
                <input className="input-clean" placeholder="e.g., Nigeria" value={pform.country} onChange={pf("country")} data-testid="parish-create-country" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">State / Region</label>
                <input className="input-clean" placeholder="Optional" value={pform.state} onChange={pf("state")} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">Contact Number</label>
                <input className="input-clean" placeholder="+234 801…" value={pform.phone} onChange={pf("phone")} data-testid="parish-create-phone" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">Shepherd / Pastor in Charge</label>
              <input className="input-clean" placeholder="e.g., Snr. Apostle E. Adeyemi" value={pform.shepherd_name} onChange={pf("shepherd_name")} data-testid="parish-create-shepherd" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] block mb-1">Full Address</label>
              <textarea
                className="input-clean min-h-[60px] resize-none text-sm"
                placeholder="Street, area, city…"
                value={pform.address}
                onChange={pf("address")}
                data-testid="parish-create-address"
              />
            </div>
            {err && <div className="text-xs text-red-600">{err}</div>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setPh(PH.SEARCH)} className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--brand-primary)] transition-colors">
                ← Back
              </button>
              <button
                onClick={() => handleCreate(false)}
                disabled={!pform.name.trim() || !pform.city.trim() || !pform.country.trim() || creating}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
                data-testid="parish-create-submit"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Add my parish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH — initial search phase ─────────── */}
      {ph === PH.SEARCH && (
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Type your parish name to search the worldwide CCC directory. Not listed? We'll help you add it.
          </p>

          {/* Live search input */}
          <div className="relative mb-3">
            <input
              className="input-clean pr-10"
              placeholder="e.g., CCC Heavenly Light Parish, Lagos"
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              autoFocus
              data-testid="parish-search-input"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </div>
          </div>

          {/* Results */}
          {pq.trim() && results.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 mb-3">
              {results.map((p) => (
                <button
                  key={p.id}
                  data-testid={`parish-result-${p.id}`}
                  onClick={() => { setCandidate(p); setPh(PH.CONFIRM); }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-accent)] hover:bg-[var(--bg-subtle)] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <Church size={14} className="text-[var(--brand-primary)] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--brand-primary)] truncate">{p.name}</div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                        {[p.city, p.state, p.country].filter(Boolean).join(", ")}
                        {p.shepherd_name && ` · Shep. ${p.shepherd_name}`}
                        {p.status === "pending_review" && (
                          <span className="ml-1.5 text-amber-600 font-medium">(awaiting review)</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--brand-accent)] font-semibold opacity-0 group-hover:opacity-100 shrink-0">Tap →</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* "Add my parish" CTA — always shown when query has text */}
          {pq.trim() && !searching && (
            <button
              onClick={() => enterCreatePhase(pq)}
              className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-dashed border-[var(--brand-accent)]/35 bg-amber-50/20 hover:bg-amber-50/60 hover:border-[var(--brand-accent)]/60 transition-all text-left"
              data-testid="parish-add-new"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Plus size={14} className="text-[var(--brand-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--brand-primary)] truncate">
                  {results.length > 0 ? `My parish isn't listed — add it` : `Add "${pq}" to the directory`}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Help grow the worldwide CCC parish map</div>
              </div>
            </button>
          )}

          {/* Empty state */}
          {!pq.trim() && (
            <div className="flex flex-col items-center py-8 text-center">
              <Church size={36} className="text-[var(--brand-primary)]/15 mb-3" />
              <div className="text-sm text-[var(--text-tertiary)]">Start typing to find your parish</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">or help us add it to the directory</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ConversationalAuth component ─────────────────────────────────────────
export default function ConversationalAuth({ mode: initialMode = "auto" }) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const steps = mode === "returning" ? STEPS_RETURN : STEPS_NEW;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const next = () => { setErr(""); setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const back = () => { setErr(""); setStep((s) => Math.max(s - 1, 0)); };
  const skip = () => next();
  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const ranks = data.sex === "female" ? ranksForWomen : ranksForMen;

  const submitAll = async () => {
    setBusy(true); setErr("");
    try {
      if (mode === "returning") {
        await login(data.email, data.password);
        try {
          const { data: mems } = await http.get("/me/memberships");
          navigate(mems && mems.length > 0 ? "/app/my-parish" : "/app");
        } catch { navigate("/app"); }
      } else {
        await register({
          email:              data.email,
          password:           data.password,
          name:               data.name,
          sex:                data.sex || null,
          ccc_rank:           data.ccc_rank || null,
          country:            data.country || null,
          city:               data.city || null,
          parish_id:          data.parish_id || null,
          interested_in_choir: !!data.choir,
        });
        navigate(data.parish_id ? "/app/my-parish" : "/app");
      }
    } catch (e) {
      setErr(formatErr(e));
    } finally { setBusy(false); }
  };

  const handleContinue = async () => {
    if (current.type === "text" && !data[current.key]) return setErr("Please fill this in.");
    if (current.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || "")) return setErr("Enter a valid email.");
    if (current.type === "password" && (data.password || "").length < 6) return setErr("Password must be at least 6 characters.");
    if (isLast) return submitAll();
    next();
  };

  return (
    <div className="min-h-screen w-full grid place-items-center px-4 py-10" style={{ background: "linear-gradient(180deg, #FDFBF7 0%, #F3EFE9 100%)" }}>
      <div className="w-full max-w-xl">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center" data-testid="auth-logo">
          <div className="w-10 h-10 rounded-md bg-[var(--brand-primary)] text-white grid place-items-center font-display text-2xl">C</div>
          <div className="text-[var(--brand-primary)] font-display text-xl leading-tight">CelestialPeopleMeeet</div>
        </Link>

        <div className="card-surface p-7 md:p-10 fade-in" key={step}>
          {/* Step progress bar */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--brand-accent)]" : "bg-[var(--bg-subtle)]"}`} />
            ))}
          </div>

          {/* ── INTRO ────────────────────────────────── */}
          {current.type === "intro" && (
            <div className="text-center slide-up">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-accent)] mb-3">Peace be with you</div>
              <h1 className="font-display text-4xl sm:text-5xl text-[var(--brand-primary)] leading-tight">Welcome home, beloved.</h1>
              <p className="mt-4 text-[var(--text-secondary)]">A worldwide family of Celestial Church members — to pray, gather, and serve together.</p>
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                <button data-testid="onb-new" onClick={() => { setMode("new"); setStep(1); }} className="btn-primary">
                  I'm joining for the first time
                </button>
                <button data-testid="onb-returning" onClick={() => { setMode("returning"); setStep(0); }} className="btn-accent">
                  I'm returning — sign me in
                </button>
              </div>
            </div>
          )}

          {/* ── TEXT / EMAIL / PASSWORD ──────────────── */}
          {(current.type === "text" || current.type === "email" || current.type === "password") && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-6">{current.q}</h2>
              <input
                autoFocus
                data-testid={`onb-input-${current.key}`}
                className="input-clean"
                type={current.type === "password" ? "password" : current.type === "email" ? "email" : "text"}
                placeholder={current.placeholder || ""}
                value={data[current.key] || ""}
                onChange={(e) => setField(current.key, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              />
            </div>
          )}

          {/* ── SEX ──────────────────────────────────── */}
          {current.type === "sex" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-2">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">This determines which CCC rank list will be shown to you.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <button data-testid="sex-male"
                  onClick={() => { setField("sex", "male"); next(); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${data.sex === "male" ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"}`}>
                  <span className="text-4xl">♂</span>
                  <div className="text-center">
                    <div className="font-display text-xl text-[var(--brand-primary)]">Brother</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Male — brotherhood ranks</div>
                  </div>
                </button>
                <button data-testid="sex-female"
                  onClick={() => { setField("sex", "female"); next(); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${data.sex === "female" ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"}`}>
                  <span className="text-4xl">♀</span>
                  <div className="text-center">
                    <div className="font-display text-xl text-[var(--brand-primary)]">Sister</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Female — sisterhood ranks</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── RANK SELECT ───────────────────────────── */}
          {current.type === "rank_select" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-1">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {data.sex === "female" ? "Sisterhood" : "Brotherhood"} ranks — tap yours to continue.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {ranks.map((r) => (
                  <button key={r} data-testid={`rank-${r}`}
                    onClick={() => { setField("ccc_rank", r); next(); }}
                    className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${data.ccc_rank === r ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)] font-medium text-[var(--brand-primary)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"}`}
                  >{r}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── PARISH SEARCH (rich sub-flow) ─────────── */}
          {current.type === "parish_search" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-1">{current.q}</h2>
              <ParishStep data={data} setField={setField} />
            </div>
          )}

          {/* ── YES/NO (choir) ────────────────────────── */}
          {current.type === "yesno" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-6">{current.q}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <button data-testid="choir-yes" onClick={() => { setField("choir", true); next(); }} className="btn-primary">Yes, count me in</button>
                <button data-testid="choir-no" onClick={() => { setField("choir", false); next(); }} className="btn-accent">Not at this time</button>
              </div>
            </div>
          )}

          {err && <div className="mt-4 text-sm text-red-700" data-testid="onb-error">{err}</div>}

          {/* ── FOOTER NAV ───────────────────────────── */}
          {SHOW_FOOTER.has(current.type) && (
            <div className="mt-7 flex items-center justify-between gap-3">
              <button onClick={back} data-testid="onb-back" disabled={step <= 1} className="text-sm text-[var(--text-secondary)] disabled:opacity-40">
                ← Back
              </button>
              <div className="flex items-center gap-3">
                {current.skippable && (
                  <button onClick={skip} data-testid="onb-skip" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors">
                    Skip →
                  </button>
                )}
                <button onClick={handleContinue} data-testid="onb-continue" disabled={busy} className="btn-primary inline-flex items-center gap-2">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : isLast ? "Finish" : "Continue"}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Parish step footer — skip + continue */}
          {current.type === "parish_search" && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={back} data-testid="onb-back" disabled={step <= 1} className="text-sm text-[var(--text-secondary)] disabled:opacity-40">
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <button onClick={skip} data-testid="onb-skip" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors">
                  Skip for now →
                </button>
                <button onClick={next} data-testid="onb-continue" className="btn-primary inline-flex items-center gap-2">
                  {data.parish_id ? "Continue" : "Continue without parish"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-[var(--text-tertiary)]">
          By continuing you agree to our community guidelines. Built with reverence for the Celestial Church of Christ family.
        </div>
        {mode === "returning" && (
          <div className="text-center mt-2">
            <Link to="/forgot-password" className="text-xs text-[var(--brand-accent)] underline" data-testid="forgot-link">Forgot your password?</Link>
          </div>
        )}
      </div>
    </div>
  );
}
