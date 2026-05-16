import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2, Search, X, CheckCircle2 } from "lucide-react";

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

const STEPS_NEW = [
  { key: "welcome",       type: "intro" },
  { key: "name",          type: "text",         q: "Beautiful. What name should we call you?",          placeholder: "Full name" },
  { key: "sex",           type: "sex",          q: "Are you joining as a brother or a sister in the Lord?" },
  { key: "ccc_rank",      type: "rank_select",  q: "What is your CCC rank or title?",                   skippable: true },
  { key: "country",       type: "text",         q: "Which country are you currently in?",               placeholder: "e.g., Nigeria" },
  { key: "city",          type: "text",         q: "And which city or state?",                          placeholder: "e.g., Lagos" },
  { key: "parish_search", type: "parish_search",q: "Search for your parish.",                           skippable: true },
  { key: "parish_info",   type: "parish_info",  q: "Tell us about your parish (all optional).",         skippable: true },
  { key: "choir",         type: "yesno",        q: "Are you part of the choir, or interested in joining?" },
  { key: "email",         type: "email",        q: "What email should we use to reach you?" },
  { key: "password",      type: "password",     q: "Create a password to secure your account." },
];

const STEPS_RETURN = [
  { key: "email",    type: "email",    q: "Welcome back. What is your email?" },
  { key: "password", type: "password", q: "And your password?" },
];

const AUTO_ADVANCE = new Set(["sex", "yesno"]);
const SHOW_FOOTER  = new Set(["text", "email", "password", "parish_search", "parish_info", "rank_select"]);

export default function ConversationalAuth({ mode: initialMode = "auto" }) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [parishQ, setParishQ] = useState("");
  const [parishResults, setParishResults] = useState([]);
  const [parishSearchBusy, setParishSearchBusy] = useState(false);
  const [parishSearched, setParishSearched] = useState(false);
  const [showManualParish, setShowManualParish] = useState(false);

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

  const searchParishes = useCallback(async () => {
    if (!parishQ.trim()) return;
    setParishSearchBusy(true);
    setParishSearched(true);
    try {
      const { data: res } = await http.get("/parishes", {
        params: { q: parishQ, country: data.country, city: data.city },
      });
      setParishResults(res);
    } catch {
      setParishResults([]);
    } finally {
      setParishSearchBusy(false);
    }
  }, [parishQ, data.country, data.city]);

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
          email: data.email,
          password: data.password,
          name: data.name,
          sex: data.sex || null,
          ccc_rank: data.ccc_rank || null,
          country: data.country || null,
          city: data.city || null,
          parish_id: data.parish_id || null,
          parish_request: data.parish_request || null,
          parish_shepherd_name: data.parish_shepherd_name || null,
          parish_phone: data.parish_phone || null,
          parish_address: data.parish_address || null,
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

          {/* ── INTRO ──────────────────────────────────────── */}
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

          {/* ── TEXT / EMAIL / PASSWORD ─────────────────────── */}
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

          {/* ── SEX ────────────────────────────────────────── */}
          {current.type === "sex" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-2">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">This determines which CCC rank list will be shown to you.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  data-testid="sex-male"
                  onClick={() => { setField("sex", "male"); next(); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    data.sex === "male" ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                  }`}
                >
                  <span className="text-4xl">♂</span>
                  <div className="text-center">
                    <div className="font-display text-xl text-[var(--brand-primary)]">Brother</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Male — brotherhood ranks</div>
                  </div>
                </button>
                <button
                  data-testid="sex-female"
                  onClick={() => { setField("sex", "female"); next(); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    data.sex === "female" ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                  }`}
                >
                  <span className="text-4xl">♀</span>
                  <div className="text-center">
                    <div className="font-display text-xl text-[var(--brand-primary)]">Sister</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Female — sisterhood ranks</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── RANK SELECT ────────────────────────────────── */}
          {current.type === "rank_select" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-1">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {data.sex === "female" ? "Sisterhood" : "Brotherhood"} ranks — tap yours to continue.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {ranks.map((r) => (
                  <button
                    key={r}
                    data-testid={`rank-${r}`}
                    onClick={() => { setField("ccc_rank", r); next(); }}
                    className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                      data.ccc_rank === r
                        ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)] font-medium text-[var(--brand-primary)]"
                        : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── PARISH SEARCH ──────────────────────────────── */}
          {current.type === "parish_search" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-1">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Type your parish name and search the worldwide directory. You can skip and join a parish later.</p>

              {data.parish_id && !showManualParish ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-emerald-700 truncate">{data.parish_name_display || "Parish selected"}</div>
                    <div className="text-xs text-emerald-600">Found in the CCC directory</div>
                  </div>
                  <button onClick={() => { setField("parish_id", null); setField("parish_name_display", null); }} className="text-emerald-400 hover:text-emerald-700 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="input-clean flex-1"
                      placeholder="e.g., CCC Heavenly Light Parish, Lagos"
                      value={parishQ}
                      onChange={(e) => setParishQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchParishes()}
                      data-testid="parish-search-input"
                    />
                    <button
                      onClick={searchParishes}
                      disabled={parishSearchBusy || !parishQ.trim()}
                      className="btn-primary px-4 flex items-center gap-1.5 shrink-0"
                      data-testid="parish-search-go"
                    >
                      {parishSearchBusy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                  </div>

                  {parishSearched && parishResults.length > 0 && (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mb-2">
                      {parishResults.map((p) => (
                        <button
                          key={p.id}
                          data-testid={`parish-result-${p.id}`}
                          onClick={() => {
                            setField("parish_id", p.id);
                            setField("parish_name_display", p.name);
                            setField("parish_request", null);
                            setShowManualParish(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                            data.parish_id === p.id
                              ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]"
                              : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                          }`}
                        >
                          <div className="font-medium text-sm text-[var(--brand-primary)]">{p.name}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {[p.city, p.state, p.country].filter(Boolean).join(", ")}
                            {p.shepherd_name && ` · Shep. ${p.shepherd_name}`}
                          </div>
                        </button>
                      ))}
                      {!showManualParish && (
                        <button
                          onClick={() => { setShowManualParish(true); setField("parish_id", null); }}
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] pt-1"
                          data-testid="parish-not-listed"
                        >
                          My parish isn't in this list →
                        </button>
                      )}
                    </div>
                  )}

                  {parishSearched && parishResults.length === 0 && !parishSearchBusy && (
                    <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-xl px-4 py-3 mb-3">
                      No matching parish found. Enter your parish name manually below.
                    </div>
                  )}

                  {(showManualParish || (parishSearched && parishResults.length === 0)) && (
                    <div className="mt-2 space-y-1">
                      <label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">Parish name (manual entry)</label>
                      <input
                        className="input-clean"
                        placeholder="e.g., CCC Morning Star Parish, Accra"
                        value={data.parish_request || ""}
                        onChange={(e) => setField("parish_request", e.target.value)}
                        data-testid="parish-manual-input"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PARISH INFO (optional) ─────────────────────── */}
          {current.type === "parish_info" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-1">{current.q}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                {data.parish_id
                  ? "Your parish was found in the directory. You can add extra details below."
                  : "Help us register your parish. Fill in as much as you know — all fields are optional."}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Shepherd in Charge</label>
                  <input
                    className="input-clean"
                    placeholder="e.g., Snr. Apostle Emmanuel Adeyemi"
                    value={data.parish_shepherd_name || ""}
                    onChange={(e) => setField("parish_shepherd_name", e.target.value)}
                    data-testid="parish-shepherd-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Contact Number</label>
                  <input
                    className="input-clean"
                    placeholder="e.g., +234 801 234 5678"
                    value={data.parish_phone || ""}
                    onChange={(e) => setField("parish_phone", e.target.value)}
                    data-testid="parish-phone-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Parish Address</label>
                  <textarea
                    className="input-clean min-h-[68px] resize-none"
                    placeholder="Street, city, state…"
                    value={data.parish_address || ""}
                    onChange={(e) => setField("parish_address", e.target.value)}
                    data-testid="parish-address-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── YES/NO (choir) ─────────────────────────────── */}
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

          {/* ── FOOTER NAV ─────────────────────────────────── */}
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
