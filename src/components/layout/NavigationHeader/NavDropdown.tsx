"use client";

import { useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Renders the trigger. Spread `triggerProps` onto a <button> (or <a>) so it
   * gets the ARIA wiring; `open` drives the chevron.
   */
  trigger: (triggerProps: {
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick?: () => void;
  }, open: boolean) => ReactNode;
  /** Set for triggers that are links: a click navigates instead of opening. */
  triggerIsLink?: boolean;
  className?: string;
  panelClassName: string;
  children: ReactNode;
}

/**
 * A header dropdown that works with a mouse (hover), a keyboard (keyboard focus
 * opens it, Tab moves into the panel, leaving or Escape closes it) and touch (a tap
 * opens it). The parent owns `open` so only one menu is open at a time.
 *
 * A click only ever opens: hover (or the emulated hover of a tap) has already
 * opened the menu by the time the click lands, so toggling would close it again.
 */
export function NavDropdown({ open, onOpenChange, trigger, triggerIsLink, className = "relative", panelClassName, children }: Props) {
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  return (
    <div
      ref={wrapperRef}
      className={className}
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
      onFocus={(e) => {
        // Keyboard focus only (mouse focus is covered by hover), and not the focus
        // Escape hands back to the trigger while closing.
        if (!closingRef.current && e.target.matches(":focus-visible")) onOpenChange(true);
      }}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) onOpenChange(false);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.stopPropagation();
        onOpenChange(false);
        closingRef.current = true;
        wrapperRef.current?.querySelector<HTMLElement>("[aria-controls]")?.focus();
        closingRef.current = false;
      }}
    >
      {trigger(
        {
          "aria-expanded": open,
          "aria-controls": panelId,
          ...(triggerIsLink ? {} : { onClick: () => onOpenChange(true) }),
        },
        open
      )}
      {open && (
        <div id={panelId} className={panelClassName}>
          {children}
        </div>
      )}
    </div>
  );
}
