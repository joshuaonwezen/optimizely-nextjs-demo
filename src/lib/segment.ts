import { useSyncExternalStore } from "react";

// Browsing-derived audience segment. Reuses the existing `persona` FX attribute
// (the middleware, visitor.ts, useFxDecision and FxBucketingEvent all read the
// `demo_persona` cookie into `persona`), so nothing else needs new wiring: as the
// visitor browses a section we set demo_persona and FX serves the matching homepage
// variation. `new_visitor` is the default before any section has been visited.
export const PERSONA_SEGMENTS = [
  "personal",
  "business",
  "mortgages",
  "investments",
  "new_visitor",
] as const;

export type Persona = (typeof PERSONA_SEGMENTS)[number];

export const PERSONA_LABELS: Record<Persona, string> = {
  personal: "Personal",
  business: "Business",
  mortgages: "Mortgages",
  investments: "Investments",
  new_visitor: "New visitor",
};

// First path segment (locale-stripped) -> persona. The /en/mortgage route maps to
// the `mortgages` persona/variation on purpose - the route is singular, the segment
// name is plural. Add new product routes here as they are created.
const SECTION_TO_PERSONA: Record<string, Persona> = {
  personal: "personal",
  "current-account": "personal",
  savings: "personal",
  loans: "personal",
  "credit-cards": "personal",
  overdrafts: "personal",
  "mobile-app": "personal",

  business: "business",
  "business-banking": "business",
  "business-lending": "business",
  "merchant-services": "business",
  "international-payments": "business",
  "business-credit-cards": "business",

  mortgage: "mortgages",
  mortgages: "mortgages",
  remortgaging: "mortgages",
  "buy-to-let": "mortgages",
  "first-time-buyers": "mortgages",
  overpayments: "mortgages",

  investments: "investments",
  pensions: "investments",
  "stocks-isa": "investments",
  "junior-isa": "investments",
  "general-investment": "investments",
};

// Derives the persona a visitor qualifies for from the path they are on. Returns
// null for paths that should NOT change the segment (home, help, about, demo,
// unknown) so the last qualified segment is preserved as they keep browsing.
export function personaFromPath(pathname: string | null | undefined): Persona | null {
  if (!pathname) return null;
  // Strip a leading locale segment (/en, /nl) then take the first path segment.
  const segments = pathname.replace(/^\/(en|nl)(?=\/|$)/, "").split("/").filter(Boolean);
  const first = segments[0];
  if (!first) return null;
  return SECTION_TO_PERSONA[first] ?? null;
}

// Shared client store for the current segment. sessionStorage is the realtime
// source of truth (and the future ODP staging point); the demo_persona cookie is
// mirrored from it so the edge middleware / server can read it. The cookie is
// session-scoped (no Max-Age) to match sessionStorage - a new browser session
// resets to new_visitor.
export const SEGMENT_STORAGE_KEY = "mb_segment";
const SEGMENT_EVENT = "mb:segment";

const listeners = new Set<() => void>();

function isPersona(value: string): value is Persona {
  return (PERSONA_SEGMENTS as readonly string[]).includes(value);
}

export function readSegment(): Persona {
  if (typeof window === "undefined") return "new_visitor";
  try {
    const stored = window.sessionStorage.getItem(SEGMENT_STORAGE_KEY);
    if (stored && isPersona(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return "new_visitor";
}

// Persists the segment to sessionStorage + the demo_persona cookie and notifies
// subscribers (the live indicator). Returns true when the value actually changed.
export function writeSegment(persona: Persona): boolean {
  if (typeof window === "undefined") return false;
  if (readSegment() === persona) return false;
  try {
    window.sessionStorage.setItem(SEGMENT_STORAGE_KEY, persona);
  } catch {
    /* storage unavailable */
  }
  // Session cookie (no Max-Age) so the middleware reads it on the next request.
  document.cookie = `demo_persona=${persona}; Path=/; SameSite=Lax`;
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent(SEGMENT_EVENT, { detail: persona }));
  return true;
}

// Resets to the default (new_visitor) state: clears sessionStorage and expires the
// demo_persona cookie so FX serves the default homepage variation to unmatched
// traffic (matching the pre-existing "no persona" behavior). Used by the manual
// "New visitor" override - the browsing signal itself never resets to new_visitor.
export function clearSegment(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SEGMENT_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  document.cookie = "demo_persona=; Path=/; SameSite=Lax; Max-Age=0";
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent(SEGMENT_EVENT, { detail: "new_visitor" }));
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

// Reconciles sessionStorage (per-tab source of truth) with the demo_persona
// cookie (per browser session) on mount. If this tab has no stored segment yet
// but a segment cookie exists (e.g. opened from another tab in the same session),
// adopt it so a new tab keeps the browser-session segment instead of resetting.
// Otherwise ensure the cookie matches the stored value.
export function reconcileSegment(): void {
  if (typeof window === "undefined") return;
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(SEGMENT_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  if (stored && isPersona(stored)) {
    if (getCookie("demo_persona") !== stored) {
      document.cookie = `demo_persona=${stored}; Path=/; SameSite=Lax`;
    }
    return;
  }
  const cookie = getCookie("demo_persona");
  if (cookie && isPersona(cookie)) writeSegment(cookie);
}

// React hook for the live indicator - re-renders whenever writeSegment runs.
export function useCurrentSegment(): Persona {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener(SEGMENT_EVENT, cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener(SEGMENT_EVENT, cb);
      };
    },
    readSegment,
    () => "new_visitor"
  );
}
