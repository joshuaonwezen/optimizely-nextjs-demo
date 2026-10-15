import { stableKey } from "./_shared";

// The savings_offer Variation Container content, shared by seed-variation-container.ts
// (which creates it) and seed-homepage-variation-container.ts (which places the same
// container at the bottom of the homepage). The variation keys must match the
// savings_offer flag's variation keys in scripts/maintenance/seed-fx-flags.ts exactly.

export const NAMESPACE = "mb-experiments";
export const FLAG_KEY = "savings_offer";

// Order matters: the first variation is the container's fallback.
export const VARIATIONS = [
  {
    key: "control",
    heading: "Put your savings to work",
    subheading: "A flexible Easy Saver with instant access, no fees and no notice period.",
    cta: "Open an Easy Saver",
  },
  {
    key: "rate_led",
    heading: "Earn 5.10% AER on every penny",
    subheading: "Our best instant-access rate, variable. No withdrawal limits, interest paid monthly.",
    cta: "Start earning 5.10%",
  },
  {
    key: "bonus_led",
    heading: "Get £150 when you switch",
    subheading: "Open an Easy Saver and move your salary to Mosey Bank within 60 days - we'll add £150.",
    cta: "Claim my £150",
  },
] as const;

/** Stable key of the shared VariationItemBlock for one variation. */
export function variationItemKey(variation: string): string {
  return stableKey(NAMESPACE, `${FLAG_KEY}:${variation}`);
}

/** Content-area value referencing every Variation, in fallback-first order. */
export function variationRefs(): Array<{ reference: string }> {
  return VARIATIONS.map((v) => ({ reference: `cms://content/${variationItemKey(v.key)}` }));
}
