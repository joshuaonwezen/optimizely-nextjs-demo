import type { RedirectRule } from "@/lib/graphql/queries/GetRedirectRules";

// Edge-safe. Mirrors datafile.ts: a dependency-free helper shared by middleware
// and route handlers. No import of graphqlFetch (type-only import above).

const TTL_MS = 30_000;

// Best-effort in-memory guard so the hot path does zero I/O. A cold worker just
// does the subrequest; correctness never depends on this global surviving
// (Next 16 proxy "don't rely on globals" caution respected).
let cache: { at: number; rules: RedirectRule[] } | null = null;

export async function loadRedirectRules(origin: string): Promise<RedirectRule[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  try {
    const res = await fetch(`${origin}/api/redirects`, {
      headers: { "x-mw-redirects": "1" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return cache?.rules ?? [];
    const body = (await res.json()) as { rules?: RedirectRule[] };
    cache = { at: Date.now(), rules: body.rules ?? [] };
    return cache.rules;
  } catch {
    return cache?.rules ?? [];
  }
}

function norm(p: string): string {
  let s = (p || "/").replace(/\/{2,}/g, "/");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s.toLowerCase();
}

const isAbsolute = (s: string) => /^https?:\/\//i.test(s);

export function matchRedirect(
  pathname: string,
  rules: RedirectRule[]
): { toPath: string; status: 307 | 308 } | null {
  const inPath = norm(pathname);

  for (const rule of rules) {
    const from = norm(rule.fromPath);
    let dest: string | null = null;

    if (rule.matchSubpaths) {
      if (inPath === from) {
        dest = rule.toPath;
      } else if (inPath.startsWith(from + "/")) {
        // Append the extra path segments to the destination, keeping their casing.
        const fromLen = rule.fromPath.replace(/\/+$/, "").length;
        const remainder = pathname.slice(fromLen).replace(/\/+$/, "");
        const base = rule.toPath === "/" && !isAbsolute(rule.toPath)
          ? ""
          : rule.toPath.replace(/\/+$/, "");
        dest = base + remainder;
      }
    } else if (inPath === from) {
      dest = rule.toPath;
    }

    if (!dest) continue;
    // Self-loop guard: an internal destination equal to the incoming path.
    if (!isAbsolute(dest) && norm(dest) === inPath) continue;

    return { toPath: dest, status: rule.permanent ? 308 : 307 };
  }

  return null;
}
