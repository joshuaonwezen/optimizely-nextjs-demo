import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const getNavigationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetNavigation.ts"),
  "utf8"
);
const getSiteBannerTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetSiteBanner.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Error Handling & Graceful Degradation",
};

const GRAPHQL_FETCH_ERRORS_SNIPPET = `// How graphClient().request() fails - three distinct cases.
// Paraphrased from the SDK: node_modules/@optimizely/cms-sdk/dist/esm/graph/index.js

// Case 1: fetch() itself rejects (DNS failure, connection refused, bad Graph URL)
//   Result: THROWS OptimizelyGraphError, with the original TypeError as .cause
//   Caller responsibility: try-catch if absence is acceptable

// Case 2: non-2xx response (Graph down, invalid API key, rate limit, bad query)
//   Result: THROWS - GraphContentResponseError when the body carries errors[],
//           otherwise GraphHttpResponseError. Both include the status and the
//           { query, variables } that caused it, which is what you want in a log.
if (!response.ok) {
  const json = JSON.parse(text);           // may not be JSON at all
  if (json.errors) throw new GraphContentResponseError(json.errors, { status, request });
  throw new GraphHttpResponseError(response.statusText, { status, request });
}

// Case 3: 200 OK carrying errors[] (a partially-resolved query)
//   Result: does NOT throw, and the errors are DISCARDED - request() returns
//           json.data only. Fields that failed to resolve arrive as null with
//           no explanation anywhere.
const json = await response.json();
return json.data;        // ← errors[] never reaches the caller

// Case 3 is the trap: a partial failure is indistinguishable from genuinely
// empty content. If a field is mysteriously null, query it directly against
// Graph to see the errors[] the client swallowed.`;

const NOT_FOUND_SNIPPET = `// src/app/[[...slug]]/page.tsx - the catch-all CMS route
//
// notFound() is called only when BOTH lookup strategies come up empty.
// This triggers Next.js to render the nearest not-found.tsx page (404).
// It is NOT called on Graph errors - those propagate as 500s.

import { notFound } from "next/navigation";

// Strategy 1: URL-based lookup via getContentByPath
let page = null;
for (const candidateUrl of candidateUrls) {
  const [result] = await client.getContentByPath(candidateUrl, variationFilter);
  if (result) { page = result; break; }
}

// Strategy 2: fallback key query via a raw request()
if (!page) {
  const res = await graphClient().request(KEY_QUERY, { url });
  page = res?._Page?.items?.[0] ?? null;
}

// Only if both return nothing → 404
if (!page) notFound();

// ✅ 404 - content genuinely doesn't exist
// ❌ DON'T call notFound() on catch - a Graph error should be a 500, not a 404`;

const COMPONENT_FALLBACK_SNIPPET = `// Per-component graceful degradation - never crash the page for missing data.
//
// Pattern: wrap the Graph call in try-catch and return null (render nothing)
// rather than throwing. The component is optional - its absence is acceptable.
// A broken banner should not blank the whole site.

// src/lib/graphql/queries/GetSiteBanner.ts
async function fetchSiteBanner(locale: string) {
  "use cache";
  cacheTag("banner");
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  try {
    return await graphClient().request(GET_SITE_BANNER_QUERY, { locale: [locale] });
  } catch {
    return {};   // Graph down → empty → caller's fallback path runs
  }
}

export async function getSiteBanner(locale = "en"): Promise<SiteBannerItem | null> {
  try {
    const data = await fetchSiteBanner(locale);
    return data?.SiteBanner?.items?.[0] ?? null;  // null if empty
  } catch {
    return null;   // mapping errors only - Graph errors were handled above
  }
}
// The catch MUST go INSIDE the cached function, which is the opposite of the
// instinct. A rejected promise inside "use cache" fails static generation
// outright and no try/catch at the call site can rescue it.
//
// The cost is real and worth stating: a Graph outage during a render gets
// written into the cache entry and served for the rest of the revalidate
// window. Where an hour of "no banner" is worse than an hour of stale banner,
// shorten cacheLife rather than moving the catch.

// src/components/layout/GlobalBanner/index.tsx
export default async function GlobalBanner() {
  const banner = await getSiteBanner();
  if (!banner?.enabled || !banner.message) return null;  // silent absence
  return <div>{banner.message}</div>;
}`;

const ERROR_BOUNDARY_SNIPPET = `// React Error Boundaries catch render errors in subtrees.
// Use them to isolate block-level failures - a broken chart block
// should not blank the entire page composition.

// src/components/cms/BlockErrorBoundary.tsx
"use client";
import { Component, type ReactNode } from "react";

export class BlockErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Block render error]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;   // render nothing by default
    }
    return this.props.children;
  }
}

// Wrap individual blocks in the composition renderer:
<BlockErrorBoundary key={node.key}>
  <OptimizelyComponent content={node} />
</BlockErrorBoundary>`;

const FALLBACK_DATA_SNIPPET = `// Hardcoded fallback data for critical layout components.
//
// Navigation and footer are essential - if Graph is unavailable,
// return a minimal hardcoded version rather than nothing.
// This keeps the site usable during outages.

const FALLBACK_NAV = {
  items: [
    { label: "Home",     href: "/" },
    { label: "About",    href: "/en/about" },
    { label: "Contact",  href: "/en/contact" },
  ],
};

async function fetchNavigationCached(locale: string) {
  "use cache";
  cacheTag("navigation");
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  try {
    return await graphClient().request(GET_NAV_QUERY, { locale: [locale] });
  } catch (error) {
    // Inside the boundary, because a rejection here would fail the prerender.
    console.error("[fetchNavigationCached] Graph query failed:", error);
    return {};
  }
}

export async function getNavigation(locale = "en") {
  try {
    const data = await fetchNavigationCached(locale);
    return data?.Navigation?.items?.[0] ?? FALLBACK_NAV;
  } catch (error) {
    console.error("[getNavigation] Falling back:", error);
    return FALLBACK_NAV;   // empty result or mapping error → hardcoded nav
  }
}

// For pages: returning null from a layout component
// is preferable to an unhandled exception in the root layout.`;

const PREVIEW_ERRORS_SNIPPET = `// Preview mode edge cases - common sources of confusing errors.

// 1. Expired preview token
//    When: editor's CMS session times out while they have the preview open
//    Symptom: page renders with no content, or Graph returns 401
//    Fix: redirect to the CMS login page, or show a "Session expired" message

// src/app/preview/page.tsx
const previewToken = searchParams.get("token");
if (!previewToken) redirect("/");

const content = await getPreviewContent(url, previewToken);
if (!content) {
  // Token may be expired or the content item was deleted
  redirect(\`/en\${url}\`);   // fall back to published version
}

// 2. Preview of a deleted item
//    getPreviewContent returns null → redirect to published URL

// 3. Preview of a new item with no published version
//    Published URL doesn't exist yet → redirect to CMS editor
//    (you can detect this by checking if the published content exists)`;

export default function ErrorHandlingDemoPage() {
  return (
    <>
      <DemoHero
        title="Error Handling & Graceful Degradation"
        description="How this project handles missing content, Graph failures, and block-level errors - without blanking the page or surfacing stack traces to visitors."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="graphql-fetch-errors">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How a Graph query fails
            <SectionAnchor id="graphql-fetch-errors" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">request()</code> behaves
            differently depending on where the error occurs. A failed connection or any non-2xx status
            throws  -  a typed{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GraphContentResponseError</code>{" "}
            when the body carries{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">errors[]</code>, otherwise{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GraphHttpResponseError</code>,
            both carrying the status and the offending query. A 200 that carries{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">errors[]</code> does{" "}
            <strong>not</strong> throw: the client returns{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">json.data</code> and discards
            the errors, so a partially-resolved query looks exactly like empty content. That third case is
            the one that wastes an afternoon.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <CodeBlock code={GRAPHQL_FETCH_ERRORS_SNIPPET} label="The three failure modes of graphClient().request()" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              {
                label: "HTTP error (throws)",
                causes: "Graph is down, network timeout, invalid API key, rate limit (429)",
                result: "Error propagates up. Unhandled → Next.js 500 page.",
                handle: "Wrap in try-catch and return fallback data, or let it 500.",
                color: "border-error/30",
              },
              {
                label: "GraphQL error (returns)",
                causes: "Unknown field, type mismatch, partial data with permission error on one field",
                result: "{ data: null, errors: [...] } returned. Does not throw.",
                handle: "Check result.errors if needed. Always handle data: null with ?? fallback.",
                color: "border-ghost-border",
              },
            ].map(({ label, causes, result, handle, color }) => (
              <div key={label} className={`bg-surface-lowest border rounded-2xl p-5 ${color}`}>
                <p className="text-xs font-semibold text-on-surface mb-3">{label}</p>
                <div className="space-y-2 text-xs text-on-surface-variant">
                  <p><span className="font-medium">When: </span>{causes}</p>
                  <p><span className="font-medium">Result: </span>{result}</p>
                  <p><span className="font-medium">Handle it: </span>{handle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="not-found">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            404 vs. 500 - <code className="font-mono text-xl">notFound()</code> only for missing content
            <SectionAnchor id="not-found" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">notFound()</code> is for
            content that genuinely doesn&apos;t exist - the URL has never had content, or the editor
            unpublished it. It triggers Next.js to render the nearest{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">not-found.tsx</code> (HTTP 404).
            A Graph error is not a 404 - the content may exist but the service is temporarily unavailable.
            Calling <code className="bg-surface-low px-1 rounded font-mono text-xs">notFound()</code> on
            catch would falsely tell search engines the URL is gone.
          </p>
          <CodeBlock code={NOT_FOUND_SNIPPET} label="src/app/[[...slug]]/page.tsx - when notFound() is called" />
        </section>

        <section id="component-fallback">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Per-component graceful degradation
            <SectionAnchor id="component-fallback" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Layout components (banner, navigation, footer) live in the root layout and run on every
            page. An unhandled error in any one of them blanks the entire site. Wrap their Graph calls
            in try-catch and return{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">null</code> on failure.
            The component renders nothing - the page still works.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={COMPONENT_FALLBACK_SNIPPET} label="getSiteBanner() - try-catch returns null on error" />
            <CodeBlock code={FALLBACK_DATA_SNIPPET} label="Hardcoded fallback for critical components (nav)" />
          </div>
        </section>

        <section id="error-boundaries">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Block-level error boundaries
            <SectionAnchor id="error-boundaries" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A render error in one block should not blank the whole page. React Error Boundaries
            catch errors in their subtree and render a fallback instead. Wrap each block in the
            composition renderer with a boundary - if a TeamGridBlock throws during render, the rest
            of the page continues to display normally.
          </p>
          <CodeBlock code={ERROR_BOUNDARY_SNIPPET} label="BlockErrorBoundary - isolate render errors per block" />
        </section>

        <section id="preview-errors">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Preview mode edge cases
            <SectionAnchor id="preview-errors" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The preview route has its own failure modes: expired preview tokens, deleted content, and
            new items with no published version. In each case the right response is a redirect, not
            a blank page or 500.
          </p>
          <CodeBlock code={PREVIEW_ERRORS_SNIPPET} label="Preview token expiry + deleted content handling" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">request() throws on HTTP errors and swallows GraphQL errors.</strong> A connection failure or non-2xx status throws a typed Graph error carrying the status and query; a 200 with <code className="bg-surface-low px-1 rounded font-mono text-xs">errors[]</code> returns <code className="bg-surface-low px-1 rounded font-mono text-xs">json.data</code> and drops the errors, so partial failures read as empty content.</>,
          <><strong className="text-on-surface">notFound() is for missing content, not Graph errors.</strong> A 404 tells search engines the URL is gone. Don&apos;t call it in a catch block - let Graph errors become 500s.</>,
          <><strong className="text-on-surface">Wrap layout component fetches in try-catch.</strong> An unhandled error in the root layout blanks every page on the site. Return null and let the component render nothing.</>,
          <><strong className="text-on-surface">Use hardcoded fallbacks for navigation.</strong> Navigation is critical - if Graph is down, a minimal hardcoded nav keeps the site usable.</>,
          <><strong className="text-on-surface">Error boundaries prevent one broken block from blanking the page.</strong> Wrap blocks in the composition renderer so render errors are isolated.</>,
          <><strong className="text-on-surface">Preview failures should redirect, not 500.</strong> Expired token → redirect to published version. Deleted content → redirect to CMS editor. Never show a blank preview page.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "GetNavigation.ts", path: "src/lib/graphql/queries/GetNavigation.ts", content: getNavigationTs },
            { label: "GetSiteBanner.ts", path: "src/lib/graphql/queries/GetSiteBanner.ts", content: getSiteBannerTs },
          ]}
        />

      </div>
    </>
  );
}
