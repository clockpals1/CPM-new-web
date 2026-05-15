import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { http, formatErr } from "../lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await http.post("/auth/forgot-password", { email, origin: window.location.origin });
      setSent(true);
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "linear-gradient(180deg, #FDFBF7 0%, #F3EFE9 100%)" }}>
      <div className="w-full max-w-md card-surface p-8">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">Account recovery</div>
        <h1 className="font-display text-3xl text-[var(--brand-primary)] mt-1">Reset your password</h1>
        {sent ? (
          <div className="mt-6">
            <p className="text-sm text-[var(--text-secondary)]">If <strong>{email}</strong> is registered, we've sent a reset link. Check your inbox (and spam).</p>
            <Link to="/auth" className="btn-primary inline-block mt-5" data-testid="forgot-back">Back to sign in</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Enter the email associated with your account.</p>
            <input className="input-clean mt-4" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email" />
            <button onClick={submit} disabled={busy || !email} className="btn-primary mt-4 inline-flex items-center gap-2" data-testid="forgot-submit">{busy && <Loader2 size={16} className="animate-spin" />} Send reset link</button>
            <div className="mt-4 text-sm"><Link to="/auth" className="text-[var(--brand-accent)] underline">Back to sign in</Link></div>
          </>
        )}
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      await http.post("/auth/reset-password", { token, password: pw });
      toast.success("Password reset. Please sign in.");
      navigate("/auth");
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "linear-gradient(180deg, #FDFBF7 0%, #F3EFE9 100%)" }}>
      <div className="w-full max-w-md card-surface p-8">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--brand-accent)]">New password</div>
        <h1 className="font-display text-3xl text-[var(--brand-primary)] mt-1">Set a new password</h1>
        <input type="password" className="input-clean mt-4" placeholder="New password (min 6 chars)" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="reset-password" />
        <button onClick={submit} disabled={busy || !token} className="btn-primary mt-4 inline-flex items-center gap-2" data-testid="reset-submit">{busy && <Loader2 size={16} className="animate-spin" />} Reset password</button>
        {!token && <div className="text-sm text-red-700 mt-3">Invalid or missing token. Request a fresh link.</div>}
      </div>
    </div>
  );
}
