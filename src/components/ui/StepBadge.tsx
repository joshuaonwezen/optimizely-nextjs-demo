import type { ReactNode } from "react";

type StepBadgeSize = "sm" | "md" | "lg" | "xl";
type StepBadgeVariant = "solid" | "soft" | "custom";

const SIZE_CLASSES: Record<StepBadgeSize, string> = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-6 h-6 text-xs",
  lg: "w-7 h-7 text-xs",
  xl: "w-8 h-8 text-sm font-display",
};

// "custom" applies no color classes at all - for call sites whose badge color
// is data-driven (e.g. a per-row `bg-tertiary`/`bg-error` passed via className)
// and would otherwise collide with a variant's own bg-*/text-* classes.
const VARIANT_CLASSES: Record<StepBadgeVariant, string> = {
  solid: "bg-brand text-white dark:text-on-brand",
  soft: "bg-brand/10 text-brand",
  custom: "",
};

export interface StepBadgeProps {
  size?: StepBadgeSize;
  variant?: StepBadgeVariant;
  className?: string;
  /** The badge contents - a step number, an index, an icon glyph, or initials. */
  children: ReactNode;
}

export function StepBadge({
  size = "md",
  variant = "solid",
  className = "",
  children,
}: StepBadgeProps) {
  const classes = [
    "rounded-full inline-flex items-center justify-center font-bold shrink-0",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span data-component="StepBadge" className={classes}>
      {children}
    </span>
  );
}
