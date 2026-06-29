export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="state-container">
      <div className="spinner" />
      <span className="text-muted text-sm">{message}</span>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-container">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        style={{ color: "var(--gw-text-subtle)" }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-primary font-semibold" style={{ marginBottom: 4 }}>
          {title}
        </p>
        {description && <p className="text-muted text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-container">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      <p className="text-sm" style={{ color: "#fca5a5" }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

import React from "react";
