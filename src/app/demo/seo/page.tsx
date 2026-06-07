import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO & Metadata",
};

const RESPONSIBILITY_SNIPPET = `// In a traditional CMS (WordPress, Drupal) the platform generates <title>,
// meta description, and sitemap.xml automatically.
// In a headless setup that responsibility moves entirely to the app layer.
//
// Next.js App Router provides three dedicated export points:
//
//   generateMetadata()  → <head> tags for a specific page
//   generateSitemap()   → /sitemap.xml (app/sitemap.ts)
//   generateRobots()    → /robots.txt (app/robots.ts)
//
// All three are server functions that can fetch from Graph.
// None are provided automatically - you must implement them.`;

const GENERATE_METADATA_SNIPPET = `// src/app/[[...slug]]/page.tsx
//
// generateMetadata() runs before the page component renders.
// Return a Metadata object - Next.js writes the <head> tags.

import type { Metadata } from "next";
import { graphqlFetch } from "@/lib/optimizely/client";

const GET_PAGE_SEO_QUERY = /* GraphQL */ \`
  query GetPageSeo($url: String!) {
    _Content(
      where: { _metadata: { url: { default: { eq: $url } } } }
      limit: 1
    ) {
      items {
        _metadata { displayName url { default } }
        ... on LandingPage {
          metaTitle
          metaDescription
          ogImage { _metadata { url { default } } }
        }
        ... on ArticlePage {
          metaTitle
          metaDescription
          heroImage { _metadata { url { default } } }
        }
      }
    }
  }
\`;

export async function generateMetadata(
  { params }: { params: { slug?: string[] } }
): Promise<Metadata> {
  const url = \`/\${params.slug?.join("/") ?? ""}\`;
  const res = await graphqlFetch(GET_PAGE_SEO_QUERY, { url }, { next: { revalidate: 60 } });
  const page = res.data?._Content?.items?.[0];

  const title       = page?.metaTitle ?? page?._metadata?.displayName ?? "Mosey Bank";
  const description = page?.metaDescription ?? undefined;
  const imageUrl    = page?.ogImage?._metadata?.url?.default
                   ?? page?.heroImage?._metadata?.url?.default;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    page?._metadata?.url?.default,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}`;

const SITEMAP_SNIPPET = `// src/app/sitemap.ts
//
// Next.js calls this function and serves the result as /sitemap.xml.
// Use the same GetAllPagePaths query used by generateStaticParams.

import type { MetadataRoute } from "next";
import { graphqlFetch } from "@/lib/optimizely/client";
import { GET_ALL_PAGE_PATHS_QUERY } from "@/lib/graphql/queries/GetAllPagePaths";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const res   = await graphqlFetch(GET_ALL_PAGE_PATHS_QUERY, {}, { next: { revalidate: 3600 } });
  const pages = res.data?._Page?.items ?? [];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moseyfin.com";

  return pages
    .filter((p) => p._metadata?.url?.default)
    .map((p) => ({
      url:          \`\${baseUrl}\${p._metadata.url.default}\`,
      lastModified: p._metadata.published ? new Date(p._metadata.published) : new Date(),
      changeFrequency: "weekly" as const,
      priority: p._metadata.url.default === "/" ? 1 : 0.8,
    }));
}

// Output at /sitemap.xml:
// <urlset>
//   <url>
//     <loc>https://moseyfin.com/en/about</loc>
//     <lastmod>2025-06-01T00:00:00.000Z</lastmod>
//     <changefreq>weekly</changefreq>
//     <priority>0.8</priority>
//   </url>
//   ...
// </urlset>`;

const JSON_LD_SNIPPET = `// Structured data (JSON-LD) helps search engines understand page content.
// Add it as a <script type="application/ld+json"> tag in generateMetadata
// or inline in the page component.

// src/app/[[...slug]]/page.tsx - Article structured data
import Script from "next/script";

export default async function CmsPage({ params }) {
  const page = await fetchPage(params);

  const jsonLd = page.__typename === "ArticlePage" ? {
    "@context":     "https://schema.org",
    "@type":        "Article",
    headline:       page._metadata.displayName,
    description:    page.metaDescription,
    datePublished:  page._metadata.published,
    dateModified:   page._metadata.changed,
    image:          page.heroImage?._metadata?.url?.default,
    author: {
      "@type": "Organization",
      name:    "Mosey Bank",
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <Script
          id="article-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <OptimizelyComponent content={page} />
    </>
  );
}

// Breadcrumb structured data - great for navigational pages:
const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type":    "BreadcrumbList",
  itemListElement: ancestors.map((a, i) => ({
    "@type":    "ListItem",
    position:  i + 1,
    name:      a.displayName,
    item:      \`https://moseyfin.com\${a.url}\`,
  })),
};`;

const IMAGE_SNIPPET = `// Next.js <Image> requires all remote domains to be allowlisted in next.config.
// Optimizely DAM images come from the CMS domain - add it to remotePatterns.

// next.config.mjs
export default {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cms.optimizely.com" },
      { protocol: "https", hostname: "*.opticdn.net" },   // DAM CDN
    ],
  },
};

// In a component - use the SDK's damAssets helper for responsive images:
import { damAssets } from "@optimizely/cms-sdk";
import Image from "next/image";

export default function HeroBlock({ content }) {
  const { getSrcset, getAlt, isDamImageAsset } = damAssets(content);

  if (!isDamImageAsset(content.backgroundImage)) return null;

  return (
    <Image
      src={content.backgroundImage._metadata.url.default}
      srcSet={getSrcset(content.backgroundImage, [480, 800, 1200, 1600])}
      alt={getAlt(content.backgroundImage, "Hero image")}
      fill
      sizes="100vw"
      priority
    />
  );
}

// In preview/edit mode, use src() from getPreviewUtils to append the preview token:
const { pa, src } = getPreviewUtils(content);
<Image src={src(content.backgroundImage)} ... />`;

const ROBOTS_SNIPPET = `// src/app/robots.ts - served at /robots.txt by Next.js

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moseyfin.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/preview",       // editorial preview route - not for bots
          "/api/",          // API routes
          "/_next/",        // internal Next.js assets
        ],
      },
    ],
    sitemap: \`\${siteUrl}/sitemap.xml\`,
    host:    siteUrl,
  };
}

// Canonical URLs - add to generateMetadata for every page:
alternates: {
  canonical: \`\${siteUrl}\${page._metadata.url.default}\`,
  // For multi-locale pages, add hreflang:
  languages: {
    en: \`\${siteUrl}/en\${slug}\`,
    fr: \`\${siteUrl}/fr\${slug}\`,
  },
},`;

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

export default function SeoDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            SEO &amp; Metadata
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How a headless CMS shifts full SEO responsibility to the app layer - and how to implement
            metadata, sitemaps, structured data, and optimized images in Next.js.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="responsibility">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            SEO is the app&apos;s responsibility in headless
            <SectionAnchor id="responsibility" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A traditional CMS generates <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;title&gt;</code>,
            meta description, and <code className="bg-surface-low px-1 rounded font-mono text-xs">sitemap.xml</code>{" "}
            automatically from its page schema. In a headless setup the CMS only provides content data - the
            app must read that data and write the HTML. Next.js App Router provides three dedicated
            export points for this: <code className="bg-surface-low px-1 rounded font-mono text-xs">generateMetadata()</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">app/sitemap.ts</code>, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">app/robots.ts</code>.
          </p>

          <CodeBlock code={RESPONSIBILITY_SNIPPET} label="The three SEO export points in Next.js App Router" />

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { label: "generateMetadata()", file: "src/app/[[...slug]]/page.tsx", desc: "Per-page - reads CMS content fields (title, description, OG image) and returns a Metadata object. Runs before the page renders." },
              { label: "app/sitemap.ts", file: "src/app/sitemap.ts", desc: "Site-wide - queries Graph for all published page URLs and returns them in the Next.js MetadataRoute.Sitemap format. Served at /sitemap.xml." },
              { label: "app/robots.ts", file: "src/app/robots.ts", desc: "Static - defines crawl rules and points to the sitemap. Served at /robots.txt. Can be a static file or a dynamic function." },
            ].map(({ label, file, desc }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-mono font-semibold text-on-surface mb-1">{label}</p>
                <p className="text-xs font-mono text-on-surface-variant mb-3">{file}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="metadata">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            <code className="font-mono text-xl">generateMetadata()</code> from CMS fields
            <SectionAnchor id="metadata" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded font-mono text-xs">generateMetadata()</code> is
            a server function that runs before the page component. It receives the same{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">params</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">searchParams</code> as the
            page and can fetch from Graph. Keep the query small - only fetch the fields you need for
            metadata, not the full page composition.
          </p>
          <CodeBlock code={GENERATE_METADATA_SNIPPET} label="generateMetadata() reading CMS SEO fields" />
        </section>

        <section id="sitemap">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Sitemap from Graph
            <SectionAnchor id="sitemap" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The sitemap generator reuses{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">GET_ALL_PAGE_PATHS_QUERY</code>{" "}
            - the same query already used by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">generateStaticParams()</code>{" "}
            in the catch-all route. Set a long revalidate (3600s) - sitemap regeneration is expensive
            and sitemaps don&apos;t need to be real-time.
          </p>
          <CodeBlock code={SITEMAP_SNIPPET} label="src/app/sitemap.ts" />
        </section>

        <section id="json-ld">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Structured data (JSON-LD)
            <SectionAnchor id="json-ld" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            JSON-LD structured data helps search engines interpret page content as Articles,
            BreadcrumbLists, FAQs, and other typed schemas. Inject it as a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;script type=&quot;application/ld+json&quot;&gt;</code>{" "}
            tag in the page component (not in{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">generateMetadata()</code>{" "}
            - that&apos;s for standard meta tags). Use Next.js{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;Script&gt;</code> with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">id</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">dangerouslySetInnerHTML</code>{" "}
            - values come from the CMS, not from user input, so XSS risk is low but you should
            still validate CMS content before serializing.
          </p>
          <CodeBlock code={JSON_LD_SNIPPET} label="Article and Breadcrumb structured data from CMS fields" />
        </section>

        <section id="images">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Next.js <code className="font-mono text-xl">&lt;Image&gt;</code> with CMS-hosted assets
            <SectionAnchor id="images" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js requires all remote image domains to be allowlisted in{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">next.config</code> before{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;Image&gt;</code> will
            accept them. Optimizely DAM images come from the CMS domain plus the DAM CDN. The SDK&apos;s{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">damAssets()</code> helper
            builds a responsive srcset from the DAM image URL and extracts AltText from the DAM
            asset metadata - both are important for Core Web Vitals and accessibility.
          </p>
          <CodeBlock code={IMAGE_SNIPPET} label="next.config domain allowlist + damAssets for responsive images" />
        </section>

        <section id="robots">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            <code className="font-mono text-xl">robots.ts</code> and canonical URLs
            <SectionAnchor id="robots" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Block crawlers from internal routes (
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/preview</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/api/</code>) via{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">app/robots.ts</code>.
            Always set a canonical URL in{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">generateMetadata()</code> using{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.default</code>{" "}
            from Graph - this is the CMS&apos;s authoritative URL for the content. For multi-locale sites,
            add <code className="bg-surface-low px-1 rounded font-mono text-xs">hreflang</code> alternates
            to tell search engines about language variants.
          </p>
          <CodeBlock code={ROBOTS_SNIPPET} label="src/app/robots.ts + canonical + hreflang" />
        </section>

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">Headless shifts all SEO work to the app layer.</strong> The CMS provides raw field data. generateMetadata(), sitemap.ts, and robots.ts are yours to implement - nothing is automatic.</>,
              <><strong className="text-on-surface">Use a separate, small query in generateMetadata().</strong> Fetch only the SEO fields - don&apos;t reuse the full page composition query. This keeps the metadata fetch fast and independently cacheable.</>,
              <><strong className="text-on-surface">Sitemap revalidate should be long (3600s+).</strong> Sitemaps are read infrequently by crawlers. Regenerating on every request wastes Graph quota with no SEO benefit.</>,
              <><strong className="text-on-surface">Inject JSON-LD in the page component, not in generateMetadata.</strong> Next.js only writes standard meta tags from the Metadata object. Use a &lt;Script&gt; tag for structured data.</>,
              <><strong className="text-on-surface">Allowlist CMS image domains in next.config before using &lt;Image&gt;.</strong> Missing domains cause a 400 error at runtime, not at build time - easy to miss in dev but visible in production.</>,
              <><strong className="text-on-surface">Use _metadata.url.default as the canonical URL.</strong> This is the CMS&apos;s authoritative URL for the content. Don&apos;t reconstruct it from params - they can diverge if the CMS URL is updated.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand font-bold shrink-0">→</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
