import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";

export const metadata: Metadata = {
  title: "Localization & Multi-Language",
};

const LOCALE_DIMENSION_SNIPPET = `# The CMS stores content per locale as a dimension, not as separate copies.
#
# When an editor opens a page in Visual Builder and switches locale,
# they are editing the same content item - just its locale variant.
# The same content key (e.g. "abc123") resolves to different field values
# depending on the locale requested.
#
# Graph exposes this through _metadata.locale:
query GetAllLocales {
  _Content(limit: 5) {
    items {
      _metadata {
        key           # same key across all locales
        locale        # "en", "fr", "de", etc.
        displayName   # locale-specific title
        url { default }
      }
    }
  }
}

# Result - same page key, two locale variants:
# { key: "abc123", locale: "en", displayName: "About Us", url: "/en/about" }
# { key: "abc123", locale: "fr", displayName: "À propos", url: "/fr/about" }`;

const GRAPH_LOCALE_SNIPPET = `# Add a locale filter to any query to get content in a specific language.
# Use the _metadata.locale field with the 'eq' or 'in' operator.

query GetLocalizedPage($url: String!, $locale: [Locales]) {
  _Content(
    where: {
      _metadata: {
        url:    { default: { eq: $url } }
        locale: { in: $locale }          # e.g. ["fr", "fr-CA"]
      }
    }
  ) {
    items {
      _metadata { locale displayName url { default } }
      ... on LandingPage {
        headline
        body { json }
      }
    }
  }
}

# In graphqlFetch - pass locale from the request:
const locale = params.lang ?? "en";
const res = await graphqlFetch(GET_LOCALIZED_PAGE, { url, locale: [locale] });`;

const ROUTING_SNIPPET = `// Option A - [lang] URL segment (recommended for most projects)
// URL structure: /en/about, /fr/about, /de/about
// The lang param is always explicit in the URL - no ambiguity.

// src/app/[lang]/[[...slug]]/page.tsx
export default async function Page({ params }) {
  const { lang, slug } = params;
  const url = \`/\${slug?.join("/") ?? ""}\`;

  const res = await graphqlFetch(GET_LOCALIZED_PAGE, {
    url: \`/\${lang}/\${slug?.join("/")}\`,
    locale: [lang],
  });
  return <OptimizelyComponent content={res.data._Content.items[0]} />;
}

// Middleware generates the lang segment from Accept-Language:
// src/middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || !pathname.match(/^\/(en|fr|de)/)) {
    const lang = request.headers.get("Accept-Language")?.split(",")[0]?.split("-")[0] ?? "en";
    return NextResponse.redirect(new URL(\`/\${lang}\${pathname}\`, request.url));
  }
}`;

const SUBDOMAIN_SNIPPET = `// Option B - Subdomain per locale
// URL structure: en.site.com/about, fr.site.com/about
// Requires middleware to read the hostname and map it to a locale.

// src/middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const locale   = hostname.startsWith("fr.") ? "fr"
                 : hostname.startsWith("de.") ? "de"
                 : "en";

  const res = NextResponse.next();
  res.headers.set("x-locale", locale);  // pass to server component via header
  return res;
}

// Then read it in the page:
import { headers } from "next/headers";
const locale = (await headers()).get("x-locale") ?? "en";`;

const FALLBACK_SNIPPET = `# Fallback locale chain - request the most specific locale first,
# then progressively broader locales, then the default.
#
# If a page hasn't been translated into fr-CA yet, the fr version
# (or the en fallback) should be shown instead of a 404.
#
# Graph returns the first match from the array - ordered by specificity.

query GetPageWithFallback($url: String!) {
  _Content(
    where: {
      _metadata: {
        url:    { default: { eq: $url } }
        locale: { in: ["fr-CA", "fr", "en"] }   # ← priority order
      }
    }
    limit: 1   # only want the best match
  ) {
    items {
      _metadata { locale displayName url { default } }
      ... on LandingPage { headline body { json } }
    }
  }
}

// Build the fallback chain from the request locale in code:
function buildLocaleChain(locale: string): string[] {
  const [lang, region] = locale.split("-");
  const chain = region ? [\`\${lang}-\${region}\`, lang] : [lang];
  if (!chain.includes("en")) chain.push("en");  // always fall back to default
  return chain;
}
// buildLocaleChain("fr-CA") → ["fr-CA", "fr", "en"]`;

const MIXED_LOCALE_SNIPPET = `// Headless CMS + i18n: two separate translation sources
//
// CMS content:    body copy, headlines, page content → translated in CMS per-locale
// UI strings:     button labels, navigation, error messages → translated by the app
//
// Keep them separate. Don't store UI strings in the CMS - they change at deploy
// time, not at publish time, and they shouldn't require a CMS publish to update.

// src/app/[lang]/layout.tsx
import { getTranslations } from "next-intl/server";  // or i18next, etc.

export default async function Layout({ children, params }) {
  const t = await getTranslations({ locale: params.lang });

  return (
    <html lang={params.lang}>
      <body>
        <nav>
          <a href={\`/\${params.lang}\`}>{t("nav.home")}</a>      {/* UI string */}
          <a href={\`/\${params.lang}/contact\`}>{t("nav.contact")}</a>
        </nav>
        <main>{children}</main>   {/* CMS content rendered here */}
      </body>
    </html>
  );
}

// The CMS page component gets its content from Graph with the locale filter -
// body copy, hero headline, FAQs - all from the CMS per-locale.
// The layout chrome (nav labels, footer links) comes from the app's i18n files.`;

const GENERATE_STATIC_SNIPPET = `// generateStaticParams for multi-locale pages
// Enumerate all locale + slug combinations to pre-render at build time.

export async function generateStaticParams() {
  const res = await graphqlFetch(GET_ALL_PAGE_PATHS_QUERY);
  const pages = res.data._Page.items ?? [];

  return pages
    .filter((p) => p._metadata?.url?.default && p._metadata?.locale)
    .map((p) => {
      const url    = p._metadata.url.default;
      const locale = p._metadata.locale;        // "en", "fr", etc.
      const slug   = url.replace(\`/\${locale}/\`, "").split("/").filter(Boolean);
      return { lang: locale, slug };
    });
}`;

export default function LocalizationDemoPage() {
  return (
    <>
      <DemoHero
        title="Localization & Multi-Language"
        description="How Optimizely CMS stores content per locale, how Graph returns locale-specific variants, and how Next.js routes requests to the right language."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="locale-dimension">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Locale as a dimension, not a copy
            <SectionAnchor id="locale-dimension" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The CMS does not create a separate content item for each language. Instead, locale is a{" "}
            <strong>dimension</strong> on a single content item - the same content key resolves to
            different field values depending on which locale is requested. This means editors translate
            content in-place inside Visual Builder without creating duplicates, and a content update
            doesn&apos;t require translating every language before it can be published.
          </p>

          <CodeBlock code={LOCALE_DIMENSION_SNIPPET} label="Same key, different locale variants in Graph" />

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { label: "Same content key", desc: "All locale variants share the same key in the CMS. Update the structure once and all languages inherit the change." },
              { label: "Independent publication", desc: "Each locale variant can be drafted and published independently. English can go live while French is still in review." },
              { label: "Selective translation", desc: "If a locale hasn't been translated, Graph returns nothing for that key+locale combination - you fall back to the default locale." },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-on-surface mb-2">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="graph-filter">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Filtering by locale in Graph
            <SectionAnchor id="graph-filter" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Add{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata: &#123; locale: &#123; in: $locale &#125; &#125;</code>{" "}
            to any query to get content in a specific language. Pass the locale from the request - URL
            segment, header, or cookie. Without a locale filter, Graph returns all locale variants for
            a given URL, which means you&apos;d get both the English and French version of a page in
            one response.
          </p>
          <CodeBlock code={GRAPH_LOCALE_SNIPPET} label="Locale filter in a page query" />
        </section>

        <section id="routing">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Next.js locale routing patterns
            <SectionAnchor id="routing" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Two common approaches: a <code className="bg-surface-low px-1 rounded font-mono text-xs">[lang]</code>{" "}
            URL segment (<code className="bg-surface-low px-1 rounded font-mono text-xs">/en/about</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/fr/about</code>) or
            a subdomain per locale (<code className="bg-surface-low px-1 rounded font-mono text-xs">fr.site.com/about</code>).
            The segment approach is simpler - all routing is in one Next.js app, the locale is always
            visible in the URL (good for SEO), and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">hreflang</code> links are
            easy to generate. Subdomains are better when different locales need separate deployments or
            CDN regions.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Option A - URL segment (recommended)</p>
              <CodeBlock code={ROUTING_SNIPPET} label="src/app/[lang]/[[...slug]]/page.tsx" />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2">Option B - Subdomain routing</p>
              <CodeBlock code={SUBDOMAIN_SNIPPET} label="src/middleware.ts - hostname-based locale detection" />
            </div>
          </div>
        </section>

        <section id="fallback">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Fallback locale chains
            <SectionAnchor id="fallback" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Not all content will be translated into every locale. A fallback chain ensures users
            always see <em>something</em> rather than a blank page or 404. Pass an ordered array of
            locales to Graph&apos;s{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">in:</code> filter - most
            specific first, default locale last. Graph returns the first match.
          </p>
          <CodeBlock code={FALLBACK_SNIPPET} label="Fallback chain: fr-CA → fr → en" />
        </section>

        <section id="mixed">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Mixed-locale pages - CMS content vs. UI strings
            <SectionAnchor id="mixed" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A localized page has two sources of translated text. <strong>Body content</strong> - headlines,
            copy, FAQs - comes from the CMS and is translated by editors. <strong>UI strings</strong> - button
            labels, form placeholders, navigation items - are owned by the app and live in translation files
            managed by developers. Keep these separate: don&apos;t store UI strings in the CMS (they change
            on deploy, not on publish) and don&apos;t hard-code body copy in the app.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={MIXED_LOCALE_SNIPPET} label="Two translation sources in one layout" />
            <CodeBlock code={GENERATE_STATIC_SNIPPET} label="generateStaticParams for multi-locale routes" />
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Locale is a dimension, not a copy.</strong> The same content key has multiple locale variants. Editors translate in-place - no duplicate content items to keep in sync.</>,
          <><strong className="text-on-surface">Always add a locale filter to Graph queries.</strong> Without it you get all locale variants in one response. Filter by <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.locale</code> using the locale from the request.</>,
          <><strong className="text-on-surface">Use an ordered fallback chain.</strong> Graph returns the first match from an <code className="bg-surface-low px-1 rounded font-mono text-xs">in:</code> array. Put the most specific locale first ("fr-CA"), then the language ("fr"), then the default ("en").</>,
          <><strong className="text-on-surface">URL segment routing is simpler than subdomains.</strong> The lang param is available in server components without middleware header reads, and hreflang/canonical URLs are straightforward to generate.</>,
          <><strong className="text-on-surface">Separate CMS content from UI strings.</strong> Body copy belongs in the CMS (translated by editors). Button labels and nav items belong in translation files (deployed with the app). Don&apos;t mix them.</>,
          <><strong className="text-on-surface">Include locale in generateStaticParams</strong> to pre-render all language variants at build time. Each lang+slug combination is a separate static route.</>,
        ]} />

      </div>
    </>
  );
}
