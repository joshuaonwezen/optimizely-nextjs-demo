export interface PipelineStep {
  label: string;
  sub?: string;
  highlight?: boolean;
}

/** A left-to-right row of labelled steps joined by arrows. */
export function Pipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div
            className={`text-center rounded-xl px-4 py-3 min-w-[130px] ${
              step.highlight
                ? "bg-brand/10 border border-brand/30"
                : "bg-surface-low"
            }`}
          >
            <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
            {step.sub && (
              <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
            )}
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="text-on-surface-variant text-lg">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** A rounded tag for listing capabilities or tools. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-low border border-ghost-border text-on-surface">
      {children}
    </span>
  );
}
