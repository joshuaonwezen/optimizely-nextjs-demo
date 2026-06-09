import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const globalBannerTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/GlobalBanner/index.tsx"),
  "utf8"
);
const getSiteBannerTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/graphql/queries/GetSiteBanner.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Global Settings & Singletons",
};

const SINGLETON_PATTERN_SNIPPET = `// A singleton is a content type where editors create exactly one item.
// Query it with limit: 1 - you only ever want the first (and only) result.
//
// Common singletons:
//   SiteBanner     - the global announcement bar (message, variant, link)
//   SiteSettings   - default OG image, contact email, social links
//   CookieBanner   - cookie consent text and button labels
//   FooterContent  - footer columns, legal links, copyright text

const GET_SITE_SETTINGS_QUERY = /* GraphQL */ \`
  query GetSiteSettings {
    SiteSettings(limit: 1) {
      items {
        defaultOgImage { _metadata { url { default } } }
        contactEmail
        twitterHandle
        linkedInUrl
      }
    }
  }
\`;

export async function getSiteSettings() {
  try {
    const res = await graphqlFetch(GET_SITE_SETTINGS_QUERY, {}, {
      next: { revalidate: 300, tags: ["site-settings"] },
    });
    return res.data?.SiteSettings?.items?.[0] ?? null;
  } catch {
    return null;   // ← never crash the page if settings are unavailable
  }
}`;

const THREE_QUERY_PATTERNS_SNIPPET = `// Three ways to fetch a singleton from Graph:

// 1. By type with limit: 1  (most common - no key needed)
SiteBanner(limit: 1, where: { enabled: { eq: true } }) {
  items { message variant linkText linkUrl }
}

// 2. By _metadata.key  (use when you know the exact key)
_Content(where: { _metadata: { key: { eq: "site-banner-abc123" } } }, limit: 1) {
  items {
    ... on SiteBanner { message variant }
  }
}

// 3. By _metadata.url  (use when the item has a known URL)
_Content(
  where: { _metadata: { url: { default: { eq: "/global/site-banner" } } } }
  limit: 1
) {
  items {
    ... on SiteBanner { message variant }
  }
}`;

const CACHE_SNIPPET = `// Cache strategy for global settings - long TTL + revalidation tag.
//
// Singletons change rarely but are fetched on every page load (they live in the
// root layout). Use a longer TTL than page content to reduce Graph round-trips.
//
// The "banner" tag lets the publish webhook bust ONLY the banner cache
// without invalidating every other cached query on the site.

// src/lib/graphql/queries/GetSiteBanner.ts
export async function getSiteBanner(): Promise<SiteBannerItem | null> {
  try {
    const result = await graphqlFetch(GET_SITE_BANNER_QUERY, {}, {
      next: {
        revalidate: 60,           // re-fetch at most once per minute
        tags: ["banner"],         // webhook calls revalidateTag("banner") on publish
      },
    });
    return result.data?.SiteBanner?.items?.[0] ?? null;
  } catch {
    return null;  // Graph unavailable → banner absent → page still renders
  }
}

// src/app/api/webhooks/route.ts - bust on publish:
revalidateTag("banner");
revalidateTag("navigation");
revalidatePath("/", "layout");`;

const FX_PRIORITY_SNIPPET = `// src/components/layout/GlobalBanner/index.tsx
//
// Pattern: Feature Experimentation flag takes priority over the CMS item.
// This lets the marketing team run banner experiments without deploying code.
// When the FX flag is disabled, the CMS-managed banner is the fallback.

export default async function GlobalBanner() {
  const user = await getOptimizelyUser();

  // 1. Check FX flag first
  const fxDecision = user.decide("banner");
  if (fxDecision.enabled) {
    const message = fxDecision.variables.title as string;
    if (!message) return null;
    void user.decide("banner", []);   // fire impression
    return <div className="bg-gradient-brand">{message}</div>;
  }

  // 2. Fall back to CMS-managed singleton
  const banner = await getSiteBanner();
  if (!banner?.enabled || !banner.message) return null;

  return <div className={variantClass}>{banner.message}</div>;
}`;

const SINGLETON_TYPE_SNIPPET = `// Define a singleton content type the same as any other -
// the "singleton" constraint is editorial convention, not enforced by the SDK.
// Editors simply agree to create only one item of this type.
//
// For stricter enforcement, set mayContainTypes on a parent folder:
export const SiteSettingsType = contentType({
  key: "SiteSettings",
  displayName: "Site Settings",
  baseType: "_component",    // or "_page" if it needs a URL
  properties: {
    defaultOgImage: { type: "contentReference", allowedTypes: ["_image"], displayName: "Default OG Image" },
    contactEmail:   { type: "string",           displayName: "Contact Email" },
    twitterHandle:  { type: "string",           displayName: "Twitter / X Handle" },
    linkedInUrl:    { type: "string",           displayName: "LinkedIn URL" },
    cookieBannerText: { type: "richText",       displayName: "Cookie Banner Text" },
  },
});

// Query - always use limit: 1 and handle null gracefully:
const settings = await getSiteSettings() ?? DEFAULT_SETTINGS;`;


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

export default function GlobalSettingsDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Global Settings &amp; Singletons
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How to model site-wide configuration as a singleton content item - queried once, cached
            for all visitors, busted by webhook on publish. The{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">GlobalBanner</code> at
            the top of this page is a live example.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="pattern">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The singleton pattern
            <SectionAnchor id="pattern" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A singleton is a content type where exactly one item exists. The CMS doesn&apos;t enforce
            this - it&apos;s an editorial convention. The app queries with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">limit: 1</code> and handles
            the case where no item exists (returning a hardcoded default). Common singletons: site banner,
            site settings, cookie consent text, footer content.
          </p>
          <CodeBlock code={SINGLETON_PATTERN_SNIPPET} label="Singleton content type + fetch function" />
          <p className="mt-4 text-sm text-on-surface-variant">
            The <code className="bg-surface-low px-1 rounded font-mono text-xs">defaultOgImage</code> field
            on <code className="bg-surface-low px-1 rounded font-mono text-xs">SiteSettings</code> is read
            by <code className="bg-surface-low px-1 rounded font-mono text-xs">generateMetadata()</code> as
            the site-wide OG image fallback when a page has no image of its own.{" "}
            <Link href="/demo/seo#metadata" className="text-brand hover:underline font-medium">
              See how generateMetadata() uses it →
            </Link>
          </p>
        </section>

        <section id="query-patterns">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Three ways to query a singleton
            <SectionAnchor id="query-patterns" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Query by type (most common), by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.key</code> (if you
            know the CMS key at deploy time), or by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url</code> (if the
            item has a canonical URL). The type-with-limit approach is the most flexible - no hardcoded
            key needed, and it naturally returns nothing if the editor hasn&apos;t created the item yet.
          </p>
          <CodeBlock code={THREE_QUERY_PATTERNS_SNIPPET} label="Singleton query options" />
        </section>

        <section id="cache">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Cache strategy - long TTL + revalidation tag
            <SectionAnchor id="cache" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Global settings live in the root layout and are fetched on every page load. Use a longer
            ISR TTL than page content (60–300s) and assign a named tag so the publish webhook can
            invalidate only this query - not every cached query on the site. Always wrap the fetch in
            try-catch: if Graph is unavailable, the banner being absent is acceptable; the page
            crashing is not.
          </p>
          <CodeBlock code={CACHE_SNIPPET} label="ISR + tag for targeted webhook revalidation" />
        </section>

        <section id="fx-priority">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Feature Experimentation priority over CMS
            <SectionAnchor id="fx-priority" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The <code className="bg-surface-low px-1 rounded font-mono text-xs">GlobalBanner</code>{" "}
            component at the top of this page uses a layered priority pattern: check the FX flag first,
            fall back to the CMS singleton. This gives the marketing team a fast path to experiment with
            banner messaging without waiting for a CMS publish - and gives developers a clean way to
            hand off banner control to editors when no experiment is running.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={FX_PRIORITY_SNIPPET} label="FX flag → CMS singleton fallback" />
            <CodeBlock code={SINGLETON_TYPE_SNIPPET} label="SiteSettings content type definition" />
          </div>
        </section>

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">Always query singletons with limit: 1.</strong> The CMS doesn&apos;t prevent editors from creating multiple items. Your query must be defensive.</>,
              <><strong className="text-on-surface">Always wrap singleton fetches in try-catch.</strong> Singletons live in the root layout. An unhandled error here blanks every page on the site.</>,
              <><strong className="text-on-surface">Use a named revalidation tag for targeted cache busting.</strong> revalidateTag(&quot;banner&quot;) only busts the banner - not the navigation, page content, or other ISR caches.</>,
              <><strong className="text-on-surface">FX flag → CMS singleton is a clean layered pattern.</strong> Experiments run via FX; when disabled, editors own the content via CMS. No code deploy needed to switch between them.</>,
              <><strong className="text-on-surface">Return a null/default when the singleton doesn&apos;t exist.</strong> Editors might not have created it yet. getSiteBanner() returns null - the component renders nothing rather than crashing.</>,
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
            { label: "GlobalBanner/index.tsx", path: "src/components/layout/GlobalBanner/index.tsx", content: globalBannerTs },
            { label: "GetSiteBanner.ts", path: "src/lib/graphql/queries/GetSiteBanner.ts", content: getSiteBannerTs },
          ]}
        />

      </div>
    </div>
  );
}
