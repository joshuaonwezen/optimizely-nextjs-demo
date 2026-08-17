import type { MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "surface" | "custom";
type ButtonSize = "compact" | "default" | "large";

// "custom" applies no color classes at all - for call sites whose color is
// computed at runtime (e.g. an FX-decided button color) and would otherwise
// collide with a variant's own bg-*/text-* classes in the generated CSS.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-fill text-on-brand hover:bg-brand-fill-dim",
  secondary: "bg-surface-container-highest text-on-surface hover:bg-surface-high",
  ghost: "bg-transparent border-2 border-current/25 hover:bg-current/10",
  surface: "bg-surface-lowest text-brand hover:opacity-90",
  custom: "",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  compact: "px-5 py-2 text-sm",
  default: "px-6 py-3 text-base",
  large: "px-10 py-4 text-lg",
};

export interface ButtonProps {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  pill?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: MouseEventHandler;
  className?: string;
  /** Overrides the default label typeface - e.g. to respect a block's own
   *  editor-facing FONT_STYLE setting instead of the brand default. */
  fontClassName?: string;
  target?: string;
  rel?: string;
  title?: string;
  "data-track-event"?: string;
  "data-track-tags"?: string;
  children: ReactNode;
}

export function Button({
  href,
  variant = "primary",
  size = "default",
  fullWidth = false,
  pill = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  fontClassName = "font-display",
  target,
  rel,
  title,
  children,
  ...trackingAttrs
}: ButtonProps) {
  const classes = [
    "hover-lift inline-flex items-center justify-center gap-2 font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-brand/30",
    fontClassName,
    pill ? "rounded-full" : "rounded-control",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    fullWidth ? "w-full" : "",
    disabled ? "opacity-60 pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link
        data-component="Button"
        href={href}
        target={target}
        rel={rel}
        title={title}
        className={classes}
        {...trackingAttrs}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      data-component="Button"
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={classes}
      {...trackingAttrs}
    >
      {children}
    </button>
  );
}
