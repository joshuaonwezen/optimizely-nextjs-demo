import { cacheTag } from "next/cache";
import { cachePublishedContent } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

const GET_SUPPORTED_LOCALES_QUERY = /* GraphQL */ `
  query GetSupportedLocales {
    _SiteDefinition {
      items {
        Languages {
          DisplayName
          Name
        }
      }
    }
  }
`;

export interface SupportedLocale {
  code: string;
  label: string;
}

const FALLBACK: SupportedLocale[] = [
  { code: "en", label: "EN" },
  { code: "nl", label: "NL" },
];

interface SiteDefinitionResult {
  _SiteDefinition?: {
    items?: Array<{ Languages?: Array<{ DisplayName: string; Name: string }> | null } | null> | null;
  } | null;
}

// Reached from layout.tsx (NavigationHeader + Footer), so it MUST go through
// graphClient() - getClient() throws where config() has not run. Cached at the
// function because the SDK's request() does not forward next: { revalidate, tags }.
//
// This is the one module that catches INSIDE the cache boundary, against the usual
// rule. `_SiteDefinition` is not present in every Graph deployment, and where it is
// missing the query 400s on every call - a permanent property of the instance, not
// a transient outage, so caching the empty result is correct rather than risky.
// It also has to be caught here: a rejected promise inside a cache scope fails
// static generation outright ("Error occurred prerendering page"), which a
// try/catch at the call site cannot rescue.
async function fetchSupportedLocales(): Promise<SiteDefinitionResult> {
  "use cache";
  cacheTag("navigation");
  cachePublishedContent();

  try {
    // request() takes variables as a required positional - pass {}, not undefined.
    return await graphClient().request(GET_SUPPORTED_LOCALES_QUERY, {});
  } catch {
    // Instance has no _SiteDefinition type - the caller falls back to FALLBACK.
    return {};
  }
}

export async function getSupportedLocales(): Promise<SupportedLocale[]> {
  const result = await fetchSupportedLocales();
  const langs = result?._SiteDefinition?.items?.[0]?.Languages ?? [];
  if (langs.length > 0) {
    return langs.map((l) => ({ code: l.Name, label: l.DisplayName }));
  }
  return FALLBACK;
}
