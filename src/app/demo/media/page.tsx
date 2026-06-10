import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const imageBlockTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/ImageBlock/index.tsx"),
  "utf8"
);
const logoGridTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/LogoGridBlock/index.tsx"),
  "utf8"
);
const renditionImageBlockTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/RenditionImageBlock/index.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Media & DAM Assets",
};

const IMAGE_PROPERTY_SNIPPET = `// Single image field on a content type.
// type: "contentReference" with allowedTypes: ["_image"] restricts the picker
// to image assets only. indexingType: "disabled" is required - Graph cannot
// index an image for full-text search, and omitting it wastes indexing overhead.

export const ImageBlockType = contentType({
  key: "ImageBlock",
  baseType: "_component",
  properties: {
    image:   { type: "contentReference", allowedTypes: ["_image"], indexingType: "disabled" },
    altText: { type: "string", displayName: "Alt Text" },
    caption: { type: "string", displayName: "Caption" },
  },
});

// Array of images (e.g. a logo grid):
// Use type: "array" with items: { type: "content", allowedTypes: ["_image"] }
// Graph inline-expands array items automatically - no extra fetch needed.
// indexingType: "disabled" is required here too.
logos: {
  type: "array",
  items: { type: "content", allowedTypes: ["_image"] },
  indexingType: "disabled",
}`;

const GRAPH_SHAPES_SNIPPET = `// Graph returns image references in two different shapes depending on context.

// Shape A - composition context (Visual Builder / content area array item):
// The image comes back nested under _metadata:
{
  _metadata: {
    url:         { default: "https://cms.optimizely.com/globalassets/hero.jpg" },
    displayName: "Hero background"
  }
}

// Shape B - page query context (contentReference field queried directly):
// The url object is at the top level of the reference:
{
  url: { default: "https://cms.optimizely.com/globalassets/hero.jpg" }
}

// A defensive helper handles both shapes in one place:
type ImageRef =
  | { url?: { default?: string | null } | null }
  | { _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

function resolveImageUrl(ref: ImageRef | undefined): string | null {
  if (!ref) return null;
  if ("url" in ref) return ref.url?.default ?? null;
  return ref._metadata?.url?.default ?? null;
}

// Usage in the component:
const avatarUrl = resolveImageUrl(data.avatar);`;

const NEXT_IMAGE_PATTERNS_SNIPPET = `// Three Next.js <Image> usage patterns for CMS images.

// 1. Fill - for images in a sized container (hero backgrounds, logo grids)
//    Parent must be position: relative and have explicit dimensions.
<div className="relative w-full h-64 overflow-hidden">
  <Image src={imageUrl} alt={altText} fill className="object-cover" />
</div>

// 2. Fixed size - for avatars and thumbnails where dimensions are known
<Image src={avatarUrl} alt={name} width={72} height={72} className="rounded-full object-cover" />

// 3. Natural editorial image - provide a maximum intrinsic size and let CSS flow the layout
<Image src={imageUrl} alt={altText} width={1200} height={675} className="w-full h-auto" />

// sizes prop - always provide it with fill to avoid downloading full-width images on mobile:
<Image
  src={logoUrl}
  alt={logoName}
  fill
  className="object-contain"
  sizes="(max-width: 768px) 96px, 128px"
/>`;

const REMOTE_PATTERNS_SNIPPET = `// next.config.ts - allowlist Optimizely domains before using next/image.
// Missing entries cause a 400 error at runtime, not at build time.

images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**.cms.optimizely.com",  // CMS-uploaded assets (globalassets, etc.)
    },
    {
      protocol: "https",
      hostname: "**.cmp.optimizely.com",  // DAM assets served from CMP (images1/2/3.cmp.optimizely.com)
    },
    {
      protocol: "https",
      hostname: "cg.optimizely.com",       // Graph CDN delivery
    },
  ],
},

// If editors can add external image URLs (e.g. a url property type), add those
// domains too - or use loader: "custom" to proxy all images through your own origin.`;

const IMAGE_PROXY_SNIPPET = `// src/app/api/image-proxy/route.ts
// A simple Next.js route handler that fetches the image server-side and streams
// it back. Validate the source hostname before fetching to prevent open-proxy abuse.

const ALLOWED_HOSTS = [".cms.optimizely.com", ".cmp.optimizely.com"];

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  if (!ALLOWED_HOSTS.some((h) => src.includes(h))) {
    return new Response("Forbidden", { status: 403 });
  }
  const upstream = await fetch(src);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// Then use the proxy URL as the src:
// <Image src={\`/api/image-proxy?src=\${encodeURIComponent(damUrl)}\`} ... />`;

const DAM_ASSETS_SNIPPET = `// damAssets() - SDK helper for responsive srcsets and DAM-stored alt text.
// Use it when you want responsive images without manually building srcset strings,
// or when alt text is stored in the DAM rather than as a separate CMS property.

import { damAssets } from "@optimizely/cms-sdk";

export default function HeroBlock({ content }) {
  const { getSrcset, getAlt, isDamImageAsset } = damAssets(content);

  // getSrcset returns a srcset string for the given breakpoints:
  // "https://...hero.jpg?w=480 480w, https://...hero.jpg?w=800 800w, ..."
  // In edit mode it appends the preview token automatically.
  const srcset = getSrcset(content.backgroundImage, [480, 800, 1200, 1600]);

  // getAlt pulls alt text stored in the DAM, falling back to the provided string:
  const alt = getAlt(content.backgroundImage, "Hero image");

  // isDamImageAsset / isDamVideoAsset / isDamRawFileAsset are TypeScript type guards:
  if (!isDamImageAsset(content.backgroundImage)) return null;

  return (
    <img
      srcSet={srcset}
      sizes="100vw"
      alt={alt}
      className="w-full h-auto"
    />
  );
}

// Note: getSrcset returns a plain srcset string for <img>, not a Next.js <Image>.
// Use Next.js <Image> with a fixed src when you want automatic format conversion (WebP/AVIF).`;

const DAM_RENDITIONS_SNIPPET = `// DAM images in Graph expose named renditions via cmp_PublicImageAsset.
// The content picker cannot select a specific rendition directly - use one of
// two patterns depending on whether the author or the frontend should decide.

// ------ Pattern 1: author picks the rendition from a dropdown ------
// RenditionImageBlock demonstrates this pattern. A rendition enum sits alongside
// the image field - the author picks both in the CMS editor.

export const RenditionImageBlockType = contentType({
  key: "RenditionImageBlock",
  baseType: "_component",
  properties: {
    image: { type: "contentReference", allowedTypes: ["_image"], indexingType: "disabled" },
    rendition: {
      type: "string",
      displayName: "Rendition",
      enum: [
        { value: "original",    displayName: "Original" },
        { value: "thumbnail",   displayName: "Thumbnail" },
        { value: "medium",      displayName: "Medium" },
        { value: "banner-wide", displayName: "Banner (wide)" },
        { value: "square",      displayName: "Square" },
      ],  // values must match rendition names defined in your DAM instance exactly
    },
    altText: { type: "string", displayName: "Alt Text" },
  },
});

// Request Renditions on the image reference in your Graph fragment.
// cmp_PublicImageAsset fields are PascalCase - Url, Renditions, Name, Width, Height.
// Each Renditions entry resolves to a physically different file URL - selecting
// "thumbnail" vs "banner-wide" gives a different image, not just a resize parameter:
fragment RenditionImageFields on RenditionImageBlock {
  image {
    ... on cmp_PublicImageAsset {
      Renditions { Name Url Width Height }
      Url
    }
  }
  rendition
  altText
}

// In the component, walk the Renditions array to match the author-selected name.
// Fall back through the base DAM URL, then the composition-context URL shape:
const renditions = content.image?.Renditions ?? [];
const matched = renditions.find((r) => r.Name === content.rendition);
const src =
  matched?.Url ??               // rendition-specific file (different URL per choice)
  content.image?.Url ??         // cmp_PublicImageAsset base URL (original)
  content.image?._metadata?.url?.default;  // composition-context fallback

// ------ Pattern 2: frontend auto-selects based on breakpoint ------
// No extra CMS property needed. The frontend maps screen sizes to known rendition names
// and builds a srcset from the rendition URLs Graph returns.

const RENDITION_WIDTHS: Record<string, number> = {
  "thumbnail":  480,
  "medium":     800,
  "banner-wide": 1600,
};

const srcset = renditions
  .filter((r) => r.Name in RENDITION_WIDTHS)
  .map((r) => \`\${r.Url} \${RENDITION_WIDTHS[r.Name]}w\`)
  .join(", ");

// <img srcSet={srcset} sizes="100vw" alt={alt} />`;

const INDEXING_SNIPPET = `// Always set indexingType: "disabled" on image and file reference fields.
// Graph cannot index binary assets for text search. Without this, Optimizely
// Graph attempts to process the reference during indexing and wastes cycles.

// ✓ Correct
avatar: { type: "contentReference", allowedTypes: ["_image"], indexingType: "disabled" }
logos:  { type: "array", items: { type: "content", allowedTypes: ["_image"] }, indexingType: "disabled" }

// ✗ Missing - Graph will attempt to index it
avatar: { type: "contentReference", allowedTypes: ["_image"] }

// The same applies to video and file references:
document: { type: "contentReference", allowedTypes: ["_file"], indexingType: "disabled" }
video:    { type: "contentReference", allowedTypes: ["_video"], indexingType: "disabled" }`;

export default function MediaDemoPage() {
  return (
    <>
      <DemoHero
        title="Media & DAM Assets"
        description="How to model image properties, query them from Graph, and render them with Next.js Image - including DAM rendition patterns and the two different shapes Graph returns depending on context."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="modelling">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Modelling image properties
            <SectionAnchor id="modelling" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Image fields use <code className="bg-surface-low px-1 rounded font-mono text-xs">type: &quot;contentReference&quot;</code> with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">allowedTypes: [&quot;_image&quot;]</code>.
            This restricts the CMS picker to image assets only. Always add{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">indexingType: &quot;disabled&quot;</code> - Graph
            cannot index binary assets for text search, and omitting it adds unnecessary indexing
            overhead on every publish. The same applies to video and file references.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={IMAGE_PROPERTY_SNIPPET} label="Single image field + image array" />
            <CodeBlock code={INDEXING_SNIPPET} label="indexingType: disabled - required on all asset fields" />
          </div>
        </section>

        <section id="graph-shapes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two Graph response shapes
            <SectionAnchor id="graph-shapes" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph returns image references in different shapes depending on how the content
            was fetched. Content queried through a composition (Visual Builder page, content area)
            nests the URL under{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.default</code>.
            Content queried directly via a page query returns the URL at{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">url.default</code> without
            the <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> wrapper.
            A small helper that checks both shapes keeps component code clean.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Composition context</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-2">
                Block rendered inside Visual Builder or fetched via <code className="bg-surface px-1 rounded font-mono">getContentByPath</code>.
              </p>
              <code className="text-xs font-mono text-brand block">image._metadata.url.default</code>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Direct page query</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-2">
                Block queried with a custom <code className="bg-surface px-1 rounded font-mono">graphqlFetch</code> call that
                requests the reference field explicitly.
              </p>
              <code className="text-xs font-mono text-brand block">image.url.default</code>
            </div>
          </div>

          <CodeBlock code={GRAPH_SHAPES_SNIPPET} label="Both shapes + defensive resolveImageUrl helper" />
        </section>

        <section id="remote-patterns">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Allowlisting CMS domains in next.config
            <SectionAnchor id="remote-patterns" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;Image&gt;</code> blocks
            remote images from any domain not listed in <code className="bg-surface-low px-1 rounded font-mono text-xs">remotePatterns</code>.
            The error is a 400 at runtime, not a build-time failure - easy to miss locally if
            the images happen to load from cache. Three patterns are needed: one for CMS-uploaded
            assets (<code className="bg-surface-low px-1 rounded font-mono text-xs">**.cms.optimizely.com</code>),
            one for DAM assets served by CMP (<code className="bg-surface-low px-1 rounded font-mono text-xs">**.cmp.optimizely.com</code> -
            images are served from subdomains like <code className="bg-surface-low px-1 rounded font-mono text-xs">images1</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">images2</code>,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">images3</code>),
            and one for Graph CDN delivery (<code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code>).
          </p>
          <CodeBlock code={REMOTE_PATTERNS_SNIPPET} label="next.config.ts - required remotePatterns" />

        </section>

        <section id="image-proxy">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Image proxying in production
            <SectionAnchor id="image-proxy" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            For production sites, consider proxying DAM images through your own domain rather than
            loading them directly from Optimizely CDN subdomains. This keeps asset URLs stable if
            Optimizely&apos;s CDN hostnames change, lets you set your own{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">Cache-Control</code> headers,
            and avoids exposing third-party hostnames in your page HTML.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A minimal Next.js route handler fetches the image server-side and streams it back.
            Always validate the source hostname before fetching - without it the route becomes
            an open proxy that anyone can use to fetch arbitrary URLs through your origin.
          </p>
          <CodeBlock code={IMAGE_PROXY_SNIPPET} label="src/app/api/image-proxy/route.ts" />
        </section>

        <section id="next-image">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Next.js Image patterns
            <SectionAnchor id="next-image" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Three patterns cover the main CMS image use cases. Use{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">fill</code> when the container
            controls the dimensions (hero backgrounds, logo grids). Use fixed{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">width</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">height</code> for thumbnails
            and avatars. Use natural dimensions for editorial images where the asset's own
            aspect ratio should flow into the layout. Always provide a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">sizes</code> prop with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">fill</code> so the browser
            downloads an appropriately sized image on mobile.
          </p>
          <CodeBlock code={NEXT_IMAGE_PATTERNS_SNIPPET} label="fill vs fixed size vs natural editorial image" />
        </section>

        <section id="dam-assets">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            <code className="font-mono text-2xl">damAssets()</code> for responsive srcsets and DAM alt text
            <SectionAnchor id="dam-assets" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The SDK ships a <code className="bg-surface-low px-1 rounded font-mono text-xs">damAssets()</code> helper
            that builds responsive <code className="bg-surface-low px-1 rounded font-mono text-xs">srcset</code> strings,
            reads alt text stored in the DAM (rather than as a separate CMS property), and provides
            TypeScript type guards for distinguishing image, video, and raw file references.
            It also appends the preview token to image URLs automatically when rendering in edit mode,
            so DAM images load correctly in the Visual Builder editor without extra code.
          </p>

          <CodeBlock code={DAM_ASSETS_SNIPPET} label="damAssets - getSrcset, getAlt, isDamImageAsset" />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-surface-lowest border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-green-700 mb-3">Use damAssets when</p>
              <ul className="space-y-1.5 text-xs text-on-surface-variant">
                {[
                  "You want responsive srcset strings without building them manually",
                  "Alt text is managed in the DAM rather than as a CMS property",
                  "You need to distinguish image vs video vs file references at runtime",
                  "You want preview token handling in edit mode without custom code",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-green-600 shrink-0">→</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-3">Use direct URL access when</p>
              <ul className="space-y-1.5 text-xs text-on-surface-variant">
                {[
                  "You only need the URL for a Next.js <Image> (which handles srcset internally)",
                  "Alt text is a separate string property on the content type",
                  "The image is always the same type - no type guard needed",
                  "You want minimal SDK surface area in the component",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-brand/50 shrink-0">→</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="dam-renditions">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            DAM renditions
            <SectionAnchor id="dam-renditions" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The CMS content picker selects a DAM image asset but cannot select a specific rendition.
            All rendition data is available in Graph via{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cmp_PublicImageAsset</code>,
            so the choice of which rendition to serve is handled in code. Two patterns cover the
            main scenarios.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Pattern 1 - author picks the rendition</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Add a second property to the content type: a string enum whose values are a hardcoded
                list of rendition names from your DAM instance. The author sets the image and then
                picks the rendition from the dropdown. The frontend reads both fields from Graph and
                selects the matching rendition URL.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Pattern 2 - frontend auto-selects by breakpoint</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                No extra CMS property needed. The frontend maintains a mapping of screen sizes to
                known rendition names (e.g. thumbnail for mobile, banner-wide for desktop) and builds
                a srcset from the rendition URLs Graph returns. Authors only pick the image.
              </p>
            </div>
          </div>

          <CodeBlock code={DAM_RENDITIONS_SNIPPET} label="Author-selected rendition + auto-responsive srcset" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Always set indexingType: &quot;disabled&quot; on image fields.</strong> Graph cannot index binary assets. Omitting it wastes indexing cycles on every publish and may cause schema warnings.</>,
          <><strong className="text-on-surface">Graph returns two different shapes for image references.</strong> Composition context gives <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.default</code>; direct page queries give <code className="bg-surface-low px-1 rounded font-mono text-xs">url.default</code>. Write a defensive helper that checks both.</>,
          <><strong className="text-on-surface">Allowlist all three Optimizely domains in next.config before using &lt;Image&gt;.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">**.cms.optimizely.com</code> for CMS assets, <code className="bg-surface-low px-1 rounded font-mono text-xs">**.cmp.optimizely.com</code> for DAM assets from CMP, and <code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code> for Graph CDN. Missing any one causes a 400 at runtime - not caught at build time.</>,
          <><strong className="text-on-surface">Always provide a sizes prop when using fill.</strong> Without it Next.js defaults to 100vw, causing the browser to download a full-width image even on mobile devices.</>,
          <><strong className="text-on-surface">Image arrays use type: &quot;array&quot; with items: type: &quot;content&quot;.</strong> Graph inline-expands these automatically - all <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> fields arrive with the page query, no extra fetch needed.</>,
          <><strong className="text-on-surface">damAssets() handles preview token injection automatically.</strong> If you pass a DAM image ref through <code className="bg-surface-low px-1 rounded font-mono text-xs">getSrcset()</code> in edit mode, the helper appends the preview token so the image loads correctly in Visual Builder.</>,
          <><strong className="text-on-surface">The content picker cannot select a DAM rendition - serve it from code.</strong> All rendition data is available in Graph under <code className="bg-surface-low px-1 rounded font-mono text-xs">cmp_PublicImageAsset.renditions</code>. Either let the author pick a rendition name from a dropdown property, or have the frontend map breakpoints to known rendition names automatically.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "ImageBlock/index.tsx", path: "src/components/blocks/ImageBlock/index.tsx", content: imageBlockTs },
            { label: "LogoGridBlock/index.tsx", path: "src/components/blocks/LogoGridBlock/index.tsx", content: logoGridTs },
            { label: "RenditionImageBlock/index.tsx", path: "src/components/blocks/RenditionImageBlock/index.tsx", content: renditionImageBlockTs },
          ]}
        />

      </div>
    </>
  );
}
