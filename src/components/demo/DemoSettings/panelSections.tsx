"use client";

import type { ReactNode } from "react";

// A labelled group inside a settings tab. The tabs now separate the major areas,
// so these carry no divider of their own - just the mono caption and an optional
// action on the right (ODP's refresh).
export function SettingsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="px-4 py-3">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

// One live ODP audience the visitor qualifies for. Mapped audiences (those in
// ODP_SEGMENT_TO_VARIATION) drive a homepage variation and are highlighted.
export function AudienceRow({ name, mapped }: { name: string; mapped: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${mapped ? "bg-brand" : "bg-outline-variant"}`} />
      <span className={`text-xs font-mono truncate ${mapped ? "text-on-surface" : "text-on-surface-variant"}`}>{name}</span>
      {mapped && <span className="text-xs text-brand shrink-0">mapped</span>}
    </div>
  );
}

// Two-or-more mutually exclusive choices laid out as one equal-width row. Used by
// WX delivery and Auth State, which are the same control over different data.
export function SegmentedButtons<T extends string | boolean>({
  options,
  value,
  onSelect,
  disabled,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
            value === option.value
              ? "bg-brand text-on-brand"
              : "bg-surface-low text-on-surface hover:bg-surface"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className="w-full flex items-center justify-between gap-3 py-1.5 text-sm text-on-surface disabled:opacity-60"
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-outline-variant"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

// A mono key/value line in the pinned footer, with room for a trailing action.
export function IdRow({ label, value, muted, action }: { label: string; value: string; muted?: boolean; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-mono text-on-surface-variant shrink-0">{label}</span>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={`text-xs font-mono truncate text-right ${muted ? "text-on-surface-variant" : "text-on-surface"}`}>
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
