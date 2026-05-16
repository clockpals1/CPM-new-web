import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Conversational onboarding. Each step renders ONE prompt.
 */
const STEPS_NEW = [
  { key: "welcome", type: "intro" },
  { key: "mode", type: "choice", q: "Are you joining for the first time, or returning?" },
  { key: "name", type: "text", q: "Beautiful. What name should we call you?", placeholder: "Full name" },
  { key: "ccc_rank", type: "select_setting", setting: "ccc_ranks", q: "What is your CCC rank or title?" },
  { key: "country", type: "text", q: "Which country are you currently in?", placeholder: "e.g., Nigeria" },
  { key: "city", type: "text", q: "And which city or state?", placeholder: "e.g., Lagos" },
  { key: "parish_id", type: "parish", q: "Pick your parish — you’ll be joined instantly as a member." },
  { key: "choir", type: "yesno", q: "Are you part of the choir, or interested in joining?" },
  { key: "email", type: "email", q: "What email should we use to reach you?" },
  { key: "password", type: "password", q: "Create a password to secure your account." },
];

const STEPS_RETURN = [
  { key: "email", type: "email", q: "Welcome back. What is your email?" },
  { key: "password", type: "password", q: "And your password?" },
];

export default function ConversationalAuth({ mode: initialMode = "auto" }) {
  const [mode, setMode] = useState(initialMode); // 'new' | 'returning' | 'auto'
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [settings, setSettings] = useState([]);
  const [parishes, setParishes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const steps = mode === "returning" ? STEPS_RETURN : STEPS_NEW;
  const current = steps[step];

  useEffect(() => {
    if (mode !== "new") return;
    if (current?.type === "select_setting") {
      http.get(`/settings/${current.setting}`).then((r) => setSettings(r.data)).catch(() => {});
    }
    if (current?.type === "parish") {
      http.get(`/parishes/nearby`, { params: { country: data.country, city: data.city } }).then((r) => setParishes(r.data)).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mode]);

  const next = () => { setErr(""); setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const back = () => { setErr(""); setStep((s) => Math.max(s - 1, 0)); };

  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const submitAll = async () => {
    setBusy(true); setErr("");
    try {
      if (mode === "returning") {
        await login(data.email, data.password);
        try {
          const { data: mems } = await http.get("/me/memberships");
          navigate(mems && mems.length > 0 ? "/app/my-parish" : "/app");
        } catch (_) { navigate("/app"); }
      } else {
        await register({
          email: data.email,
          password: data.password,
          name: data.name,
          ccc_rank: data.ccc_rank,
          country: data.country,
          city: data.city,
          parish_id: data.parish_id || null,
          parish_request: data.parish_request || null,
          interested_in_choir: !!data.choir,
        });
        navigate(data.parish_id ? "/app/my-parish" : "/app");
      }
    } catch (e) {
      setErr(formatErr(e));
    } finally { setBusy(false); }
  };

  const isLast = step === steps.length - 1;

  const handleContinue = async () => {
    // validation per step
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
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--brand-accent)]" : "bg-[var(--bg-subtle)]"}`}
              />
            ))}
          </div>

          {/* Welcome / mode pick */}
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

          {current.type === "choice" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-6">{current.q}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <button data-testid="choice-new" onClick={() => { setMode("new"); next(); }} className="btn-primary">Joining for the first time</button>
                <button data-testid="choice-returning" onClick={() => { setMode("returning"); setStep(0); }} className="btn-accent">Returning, sign me in</button>
              </div>
            </div>
          )}

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

          {current.type === "select_setting" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-6">{current.q}</h2>
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {settings.map((s) => (
                  <button
                    key={s.id}
                    data-testid={`rank-${s.label}`}
                    onClick={() => { setField(current.key, s.label); next(); }}
                    className={`text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                      data[current.key] === s.label
                        ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]"
                        : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                    }`}
                  >{s.label}</button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-3">If your title isn't here, ask your parish admin to add it.</p>
            </div>
          )}

          {current.type === "parish" && (
            <div className="slide-up">
              <h2 className="font-display text-3xl text-[var(--brand-primary)] mb-6">{current.q}</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {parishes.map((p) => (
                  <button
                    key={p.id}
                    data-testid={`parish-pick-${p.id}`}
                    onClick={() => { setField("parish_id", p.id); next(); }}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      data.parish_id === p.id ? "border-[var(--brand-accent)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--brand-accent)]"
                    }`}
                  >
                    <div className="font-medium text-[var(--brand-primary)]">{p.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{p.city}, {p.country} • Shep. {p.shepherd_name}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-[var(--text-secondary)]">Can't find yours? Tell us the parish name:</label>
                <input
                  data-testid="parish-suggest"
                  className="input-clean mt-1"
                  placeholder="e.g., CCC Heavenly Light Parish, Ibadan"
                  value={data.parish_request || ""}
                  onChange={(e) => setField("parish_request", e.target.value)}
                />
              </div>
            </div>
          )}

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

          {current.type !== "intro" && current.type !== "choice" && current.type !== "yesno" && (
            <div className="mt-7 flex items-center justify-between gap-3">
              <button onClick={back} data-testid="onb-back" disabled={step === 0} className="text-sm text-[var(--text-secondary)] disabled:opacity-40">← Back</button>
              <button onClick={handleContinue} data-testid="onb-continue" disabled={busy} className="btn-primary inline-flex items-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : isLast ? "Finish" : "Continue"}
                {!busy && <ArrowRight size={16} />}
              </button>
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
