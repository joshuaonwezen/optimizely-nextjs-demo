import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const clientTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/client.ts"),
  "utf8"
);
const getSiteBannerTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetSiteBanner.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Error Handling & Graceful Degradation",
};

const GRAPHQL_FETCH_ERRORS_SNIPPET = `// src/lib/optimizely/client.ts - two distinct error cases

// Case 1: HTTP error (non-2xx response) → graphqlFetch THROWS
//   When: network issue, Graph is down, invalid API key, rate limit
//   Result: unhandled Error propagates up the call stack
//   Caller responsibility: wrap in try-catch if absence is acceptable

const response = await fetch(GRAPH_ENDPOINT, fetchOptions);
if (!response.ok) {
  throw new Error(
    \`GraphQL request failed: \${response.status} \${response.statusText}\`
  );
}

// Case 2: GraphQL errors (200 OK but errors[] in body) → graphqlFetch RETURNS
//   When: invalid query, unknown field, permission error on a field
//   Result: { data: null, errors: [{message: "..."}] } - does not throw
//   Caller responsibility: check result.errors if needed, handle data: null

const result: GraphQLResponse<T> = await response.json();
if (result.errors?.length) {
  console.error("[GraphQL Errors]", result.errors);
  // still returns - data may be partially populated
}
return result;`;

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

// Strategy 2: fallback key query via graphqlFetch
if (!page) {
  const res = await graphqlFetch(KEY_QUERY, { url });
  page = res.data?._Page?.items?.[0] ?? null;
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
export async function getSiteBanner(): Promise<SiteBannerItem | null> {
  try {
    const result = await graphqlFetch(GET_SITE_BANNER_QUERY, {}, {
      next: { revalidate: 60, tags: ["banner"] },
    });
    return result.data?.SiteBanner?.items?.[0] ?? null;  // null if empty
  } catch {
    return null;   // Graph down → no banner → page still renders normally
  }
}

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

export async function getNavigation() {
  try {
    const res = await graphqlFetch(GET_NAV_QUERY, {}, {
      next: { revalidate: 300, tags: ["navigation"] },
    });
    return res.data?.Navigation?.items?.[0] ?? FALLBACK_NAV;
  } catch {
    return FALLBACK_NAV;   // Graph down → minimal hardcoded nav
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

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-ghost-border">
      {label && (
        <div className="bg-surface-low border-b border-ghost-border px-4 py-2">
          <span className="text-xs font-mono text-on-surface-variant">{label}</span>
        </div>
      )}
      <pre className="bg-surface-lowest p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionAnchor({ id, label }: { id: string; label: string }) {
  return (
    <a href={`#${id}`} className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">
      {label}
    </a>
  );
}

export default function ErrorHandlingDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Error Handling &amp; Graceful Degradation
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How this project handles missing content, Graph failures, and block-level errors -
            without blanking the page or surfacing stack traces to visitors.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="graphql-fetch-errors">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two error cases in <code className="font-mono text-xl">graphqlFetch</code>
            <SectionAnchor id="graphql-fetch-errors" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code> behaves
            differently depending on where the error occurs. An HTTP error (non-2xx status) throws an
            unhandled <code className="bg-surface-low px-1 rounded font-mono text-xs">Error</code>.
            A GraphQL error (200 OK with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">errors[]</code> in the body)
            logs to console and returns the response - it does not throw. Callers must handle both
            cases explicitly.
          </p>

          <CodeBlock code={GRAPHQL_FETCH_ERRORS_SNIPPET} label="src/lib/optimizely/client.ts - HTTP error vs GraphQL error" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              {
                label: "HTTP error (throws)",
                causes: "Graph is down, network timeout, invalid API key, rate limit (429)",
                result: "Error propagates up. Unhandled → Next.js 500 page.",
                handle: "Wrap in try-catch and return fallback data, or let it 500.",
                color: "border-orange-200",
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

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">graphqlFetch throws on HTTP errors, returns on GraphQL errors.</strong> HTTP errors (Graph down, rate limit) throw; GraphQL errors (bad field, permission) return <code className="bg-surface-low px-1 rounded font-mono text-xs">{"{ data: null, errors: [...] }"}</code>. Handle both paths.</>,
              <><strong className="text-on-surface">notFound() is for missing content, not Graph errors.</strong> A 404 tells search engines the URL is gone. Don&apos;t call it in a catch block - let Graph errors become 500s.</>,
              <><strong className="text-on-surface">Wrap layout component fetches in try-catch.</strong> An unhandled error in the root layout blanks every page on the site. Return null and let the component render nothing.</>,
              <><strong className="text-on-surface">Use hardcoded fallbacks for navigation.</strong> Navigation is critical - if Graph is down, a minimal hardcoded nav keeps the site usable.</>,
              <><strong className="text-on-surface">Error boundaries prevent one broken block from blanking the page.</strong> Wrap blocks in the composition renderer so render errors are isolated.</>,
              <><strong className="text-on-surface">Preview failures should redirect, not 500.</strong> Expired token → redirect to published version. Deleted content → redirect to CMS editor. Never show a blank preview page.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand font-bold shrink-0">→</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            { label: "client.ts", path: "src/lib/optimizely/client.ts", content: clientTs },
            { label: "GetSiteBanner.ts", path: "src/lib/graphql/queries/GetSiteBanner.ts", content: getSiteBannerTs },
          ]}
        />

      </div>
    </div>
  );
}
