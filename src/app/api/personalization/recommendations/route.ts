import { NextResponse } from "next/server";
import { getArticles } from "@/lib/graphql/queries/GetArticles";
import { getTaxonomyTerms } from "@/lib/graphql/queries/GetTaxonomyTerms";
import { getVisitorProfile, getVisitorProfileWithSegments } from "@/lib/optimizely/profile";
import { ODP_SEGMENT_TO_VARIATION } from "@/lib/optimizely/odp";
import { expandToUris } from "@/lib/taxonomy";

// Articles chosen from what this visitor reads, resolved through Graph.
//
// The whole loop is: CMS taxonomy -> mb_content_viewed -> the mb_read_categories
// cookie -> this route -> the EXISTING getArticles({ category }) filter. No new Graph
// query and no schema change.
//
// force-dynamic because the profile reads cookies. Clients fetch this from the browser
// so a page carrying a recommendations rail keeps its ISR entry.
export const dynamic = "force-dynamic";

const MAX_LIMIT = 12;
// Only the top two terms reach the Graph filter. getArticles() delegates to a
// "use cache" function whose ARGS ARE THE CACHE KEY, so a visitor-derived value going
// in unbounded would mint a permanent entry per distinct combination that is never
// read again (CLAUDE.md: "nothing keyed on unbounded user input goes inside a
// boundary"). Two terms out of a closed 55-term vocabulary caps the key space at
// roughly C(55,2), and the sort below means [a,b] and [b,a] are one entry, not two.
const MAX_FILTER_TERMS = 2;

// Persona is a coarser signal than read categories, but it is populated from the first
// navigation, so it covers a visitor who has not opened an article yet.
const PERSONA_TO_TERM: Record<string, string> = {
  personal: "personal_finance",
  business: "business_banking",
  mortgages: "mortgages",
  investments: "investments",
};

type Source = "readCategories" | "odp" | "persona" | "latest";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 3, 1), MAX_LIMIT);
  const useOdp = params.get("useOdp") === "1";
  // Paths the caller already showed the visitor, so a rail never recommends the
  // article being read. Over-fetch by the exclusion count to keep `limit` honest.
  const exclude = new Set(
    (params.get("exclude") ?? "")
      .split(",")
      .map((path) => normalizePath(path))
      .filter(Boolean),
  );
  const fetchLimit = Math.min(limit + exclude.size, MAX_LIMIT + exclude.size);

  // The ODP round trip is opt-in: the cookie signals alone answer most requests, and
  // a rail on a busy page should not pay for a segment lookup it will not use.
  const profile = useOdp ? await getVisitorProfileWithSegments() : await getVisitorProfile();

  // Ordered fallback chain. A demo rail must never render empty, and returning the
  // source lets the UI say which signal actually fired.
  const candidates: { source: Source; keys: string[] }[] = [
    { source: "readCategories", keys: profile.readCategories },
    { source: "odp", keys: odpTerms(profile.odpSegments) },
    { source: "persona", keys: personaTerms(profile.persona) },
  ];

  const chosen = candidates.find((c) => c.keys.length > 0);

  const latest = async (categories: string[]) => {
    const res = await getArticles({ limit: fetchLimit, facets: false });
    return json({ items: prune(res.items, exclude, limit), source: "latest", categories, profile });
  };

  if (!chosen) return latest([]);

  const keys = [...chosen.keys].sort().slice(0, MAX_FILTER_TERMS);

  // Roll the chosen terms down to their descendants: content is tagged on leaves, so
  // filtering by a parent term alone would match nothing.
  const taxonomy = await getTaxonomyTerms();
  const uris = expandToUris(taxonomy.terms, keys);
  const filter = uris.length > 0 ? uris.sort() : null;

  const result = await getArticles({ limit: fetchLimit, category: filter, facets: false });
  const items = prune(result.items, exclude, limit);

  // A deep leaf term can match only the article the visitor is already reading, so an
  // empty result here is normal rather than exceptional. Fall back instead of
  // rendering an empty rail.
  if (items.length === 0) return latest(keys);

  return json({ items, source: chosen.source, categories: keys, profile });
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function prune<T extends { _metadata?: { url?: { default?: string | null } | null } | null }>(
  items: T[],
  exclude: Set<string>,
  limit: number,
): T[] {
  return items
    .filter((item) => !exclude.has(normalizePath(item._metadata?.url?.default ?? "")))
    .slice(0, limit);
}

function odpTerms(segments: string[]): string[] {
  // An ODP audience maps to a CMS variation name today; where that name is also a
  // taxonomy term (business, mortgages, investments) it doubles as a content signal.
  return segments
    .map((segment) => ODP_SEGMENT_TO_VARIATION[segment])
    .filter((variation): variation is string => Boolean(variation))
    .map((variation) => PERSONA_TO_TERM[variation])
    .filter(Boolean);
}

function personaTerms(persona: string): string[] {
  const term = PERSONA_TO_TERM[persona];
  return term ? [term] : [];
}

function json(payload: {
  items: unknown[];
  source: Source;
  categories: string[];
  profile: { visitorId: string; readCategories: string[]; odpSegments: string[]; persona: string };
}) {
  return NextResponse.json(
    {
      items: payload.items,
      source: payload.source,
      categories: payload.categories,
      // Echoed so the demo surfaces can show WHY these articles were chosen.
      signals: {
        readCategories: payload.profile.readCategories,
        odpSegments: payload.profile.odpSegments,
        persona: payload.profile.persona,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
