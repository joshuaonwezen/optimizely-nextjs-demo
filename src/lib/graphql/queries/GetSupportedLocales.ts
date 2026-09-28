import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

// Introspect the Locales enum rather than querying `_SiteDefinition`, which does
// not exist in ANY Graph deployment we have (verified 2026-09-28 against personal,
// vacms, apjcms and toddcms - it 400s with `Cannot query field "_SiteDefinition"`
// on all of them). That made this module always return its hardcoded fallback,
// which used to be [en, nl] - and callers loop over every non-en locale to prefetch
// localized nav/footer/settings. A locale missing from the enum is not a missing-
// content case that degrades gracefully; it is a GraphQL *validation* error, so
// those prefetches 400'd on any instance without `nl`. (The English nav/footer were
// never affected - they fetch with locale ["en"]. The cost was three failed queries
// per uncached render and a locale menu offering NL where no Dutch content exists.)
//
//   personal ALL,NEUTRAL,en,nl     apjcms  ALL,NEUTRAL,en          (nl 400s)
//   vacms    ALL,NEUTRAL,en        toddcms ALL,NEUTRAL,en,de,es,sv (nl 400s)
//
// The enum is the authoritative per-instance list, so it fixes the 400s and also
// surfaces toddCMS's de/es/sv, which the hardcoded pair never offered.
const GET_SUPPORTED_LOCALES_QUERY = /* GraphQL */ `
  query GetSupportedLocales {
    __type(name: "Locales") {
      enumValues {
        name
      }
    }
  }
`;

export interface SupportedLocale {
  code: string;
  label: string;
}

// `en` is the primary locale on every instance, so it is the one safe fallback.
const FALLBACK: SupportedLocale[] = [{ code: "en", label: "EN" }];

// Graph's Locales enum carries two non-locale sentinels alongside the real codes.
const NOT_A_LOCALE = new Set(["ALL", "NEUTRAL"]);

interface LocalesEnumResult {
  __type?: { enumValues?: Array<{ name: string }> | null } | null;
}

// Reached from layout.tsx (NavigationHeader + Footer), so it MUST go through
// graphClient() - getClient() throws where config() has not run. Cached at the
// function because the SDK's request() does not forward next: { revalidate, tags }.
//
// This is the one module that catches INSIDE the cache boundary, against the usual
// rule. Introspection is a permanent property of the deployment rather than a
// transient outage, so caching the empty result is correct rather than risky.
// It also has to be caught here: a rejected promise inside a cache scope fails
// static generation outright ("Error occurred prerendering page"), which a
// try/catch at the call site cannot rescue.
async function fetchSupportedLocales(): Promise<LocalesEnumResult> {
  "use cache";
  cacheTag(CACHE_TAGS.navigation);
  cachePublishedContent();

  try {
    // request() takes variables as a required positional - pass {}, not undefined.
    return await graphClient().request(GET_SUPPORTED_LOCALES_QUERY, {});
  } catch {
    // Introspection disabled or unreachable - the caller falls back to FALLBACK.
    return {};
  }
}

export async function getSupportedLocales(): Promise<SupportedLocale[]> {
  const result = await fetchSupportedLocales();
  const codes = (result?.__type?.enumValues ?? [])
    .map((v) => v.name)
    .filter((name) => !NOT_A_LOCALE.has(name));
  if (codes.length === 0) return FALLBACK;

  // Keep `en` first so the locale menu leads with the primary locale regardless
  // of the order Graph happens to declare the enum in.
  codes.sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)));
  return codes.map((code) => ({ code, label: code.toUpperCase() }));
}
