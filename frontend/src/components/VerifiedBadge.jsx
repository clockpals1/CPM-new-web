import React from "react";

/**
 * Verified tick badge — navy circle with white check.
 * size: "xs" | "sm" (default) | "md" | "lg"
 */
export default function VerifiedBadge({ size = "sm", reason, className = "" }) {
  const dims = { xs: "w-3.5 h-3.5", sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  return (
    <span
      title={reason ? `Verified: ${reason}` : "Verified member"}
      aria-label="Verified member"
      data-testid="verified-badge"
      className={`inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shrink-0 ${dims[size] || dims.sm} ${className}`}
    >
      <svg viewBox="0 0 12 12" fill="none" className="w-[58%] h-[58%]">
        <path
          d="M2 6l2.5 2.5L10 3.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
