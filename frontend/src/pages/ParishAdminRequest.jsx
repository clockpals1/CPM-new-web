import React, { useEffect, useState } from "react";
import { http, formatErr } from "../lib/api";
import { useNavigate } from "react-router-dom";
import {
  Loader2, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight,
  Info, ArrowLeft, Send, Building2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META = {
  pending:    { label: "Awaiting Review",    color: "bg-amber-50 text-amber-700 border-amber-200",    icon: Clock },
  approved:   { label: "Approved",           color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected:   { label: "Not Approved",       color: "bg-red-50 text-red-700 border-red-200",            icon: XCircle },
  needs_info: { label: "More Info Needed",   color: "bg-blue-50 text-blue-700 border-blue-200",         icon: Info },
  deferred:   { label: "Deferred",           color: "bg-gray-100 text-gray-600 border-gray-200",        icon: AlertCircle },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${meta.color}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

export default function ParishAdminRequest() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [parishes, setParishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ parish_id: "", note: "", reason: "", comments: "" });

  const load = () => {
    setLoading(true);
    Promise.all([
      http.get("/me/parish-admin-requests"),
      http.get("/parishes"),
    ]).then(([r, p]) => {
      setRequests(r.data);
      setParishes(p.data.filter((p) => p.status === "active"));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!form.parish_id) return toast.error("Please select a parish.");
    if (!form.note.trim()) return toast.error("Please write a brief request note.");
    if (!form.reason.trim()) return toast.error("Please tell us why you'd like to be Parish Admin.");
    setBusy(true);
    try {
      await http.post("/me/parish-admin-request", form);
      toast.success("Request submitted. Super Admin will review it.");
      setForm({ parish_id: "", note: "", reason: "", comments: "" });
      setShowForm(false);
      load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };

  const hasPending = requests.some((r) => r.status === "pending");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-accent)] mb-1">Parish Management</div>
        <h1 className="font-display text-3xl text-[var(--brand-primary)]">Apply for Parish Admin</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-lg">
          Parish Admin requests are reviewed and approved by Super Admin. You will receive a notification once a decision is made.
        </p>
      </div>

      {/* Info banner */}
      <div className="card-surface p-4 border-l-4 border-[var(--brand-accent)] flex items-start gap-3">
        <Info size={16} className="text-[var(--brand-accent)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--brand-primary)]">Super Admin review required.</span>{" "}
          The platform is still growing, so all parish admin approvals go through Super Admin directly. Your request will enter a review queue and you'll be notified of the outcome.
        </div>
      </div>

      {/* My previous requests */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((n) => <div key={n} className="card-surface h-20 rounded-xl" />)}
        </div>
      ) : requests.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-tertiary)]">Your Requests</div>
          {requests.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="card-surface p-4" data-testid={`my-request-${r.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Building2 size={14} className="text-[var(--brand-accent)] shrink-0" />
                      <span className="font-medium text-[var(--brand-primary)] text-sm">{r.parish_name || r.parish_id}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{r.note}</p>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                {r.review_note && (
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs border ${meta.color}`}>
                    <span className="font-semibold">Admin note: </span>{r.review_note}
                  </div>
                )}
                {r.status === "needs_info" && (
                  <div className="mt-2 text-xs text-blue-600">
                    Please update your request or contact Super Admin with the additional information requested.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New request form */}
      {!showForm && !hasPending && (
        <button
          onClick={() => setShowForm(true)}
          data-testid="open-request-form"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Send size={14} /> Apply to become Parish Admin <ChevronRight size={14} />
        </button>
      )}

      {hasPending && !showForm && (
        <div className="card-surface p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <Clock size={14} className="shrink-0" />
          You have a pending request. You can apply for a different parish or wait for the current review to complete.
        </div>
      )}

      {showForm && (
        <div className="card-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-[var(--brand-primary)]">New Parish Admin Request</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">Cancel</button>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Parish *</label>
            <select value={form.parish_id} onChange={f("parish_id")} className="input-clean" data-testid="req-parish">
              <option value="">Select a parish…</option>
              {parishes.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {[p.city, p.country].filter(Boolean).join(", ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">
              Why do you want to be Parish Admin? *
            </label>
            <textarea
              value={form.reason}
              onChange={f("reason")}
              rows={3}
              className="input-clean resize-none"
              placeholder="Describe your motivation, experience, or connection to this parish…"
              data-testid="req-reason"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">
              Request note *
            </label>
            <textarea
              value={form.note}
              onChange={f("note")}
              rows={2}
              className="input-clean resize-none"
              placeholder="Brief note to Super Admin (e.g. 'I am the current shepherd and want to manage the parish profile')…"
              data-testid="req-note"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">
              Supporting comments <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
            </label>
            <textarea
              value={form.comments}
              onChange={f("comments")}
              rows={2}
              className="input-clean resize-none"
              placeholder="Any additional context or supporting details…"
              data-testid="req-comments"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-md text-[var(--text-secondary)]">
              Cancel
            </button>
            <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="req-submit">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
