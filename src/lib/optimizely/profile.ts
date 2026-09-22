import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Persona } from "@/lib/segment";
import { DEMO_PERSONA_COOKIE, READ_CATEGORIES_COOKIE } from "./cookieNames";
import { queryOdpSegments, resolveVariationKey } from "./odp";
import { emptyProfile, type VisitorProfile } from "./profileTypes";
import { getVisitorContext } from "./visitor";

// One visitor, as every Optimizely product sees them. Composes the existing
// readers rather than replacing any of them: getVisitorContext() for identity and
// FX attributes, the demo_persona cookie, the read-categories cookie, and odp.ts
// for audience membership.
//
// CACHING RULE, and it is the one thing to get right here:
// these functions call cookies(). Per CLAUDE.md, cookies() inside a "use cache"
// function throws, and reading it makes the route segment dynamic. Today exactly
// one page route is dynamic - "/" - via the noStore() branch in the catch-all.
// NEVER call these from anything rendered on an ISR route, or that route silently
// stops being cached. Permitted call sites:
//   - route handlers declaring `export const dynamic = "force-dynamic"`
//   - the existing homepage branch in src/app/[[...slug]]/page.tsx
//   - /demo/* pages, which are already excluded from bucketing and caching concerns
//   - client components, via GET /api/profile
// A block that wants the profile on a CMS page must fetch /api/profile from the
// browser instead. That is why RecommendationBlock renders a server shell plus a
// client child.

const PERSONAS = new Set<Persona>([
  "personal",
  "business",
  "mortgages",
  "investments",
  "new_visitor",
]);

function toPersona(value: string | undefined): Persona {
  return value && PERSONAS.has(value as Persona) ? (value as Persona) : "new_visitor";
}

// Term keys only, so a malformed or oversized cookie cannot reach a Graph filter.
// Cap mirrors the writer in lib/personalization/readCategories.ts.
function parseReadCategories(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => /^[a-z0-9_]{1,64}$/.test(key))
    .slice(0, 3);
}

/** Cookie-only profile. No network calls, so it is safe to call freely. */
export const getVisitorProfile = cache(async (): Promise<VisitorProfile> => {
  const [context, cookieStore] = await Promise.all([getVisitorContext(), cookies()]);
  const { userId, attributes, bucketingId } = context;

  return {
    ...emptyProfile(),
    visitorId: userId,
    ...(bucketingId ? { bucketingId } : {}),
    attributes,
    persona: toPersona(cookieStore.get(DEMO_PERSONA_COOKIE)?.value),
    loggedIn: attributes.logged_in === true,
    device: attributes.device === "mobile" ? "mobile" : "desktop",
    readCategories: parseReadCategories(cookieStore.get(READ_CATEGORIES_COOKIE)?.value),
    resolved: "cookies",
  };
});

/**
 * Cookie profile plus live ODP audience membership. One ODP call, already fetch-cached
 * at 5 minutes in odp.ts, and the React cache() collapses repeat callers in a request.
 * `fresh` bypasses that cache for the verification surfaces that must show current state.
 */
export const getVisitorProfileWithSegments = cache(
  async (fresh = false): Promise<VisitorProfile> => {
    const base = await getVisitorProfile();
    if (base.visitorId === "anonymous") return base;

    const odpSegments = await queryOdpSegments(base.visitorId, fresh);
    return {
      ...base,
      odpSegments,
      odpVariation: resolveVariationKey(odpSegments) ?? null,
      resolved: "cookies+odp",
    };
  },
);
