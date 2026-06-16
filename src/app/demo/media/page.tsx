import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import { damAssets } from "@optimizely/cms-sdk";

export const dynamic = "force-dynamic";

// Mock InferredContentReference using the known Pandas.jpg renditions from Optimizely's demo CMP
// instance. Constructed manually here because the demo page doesn't fetch from the CMS - the
// same object shape is what damAssets().getSrcset() receives from a real SDK content type.
const PANDAS_IMAGE_REF = {
  key: "demo-pandas",
  url: { default: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/Zz04MGM1Yzk2YzViNDUxMWYwYjZjMjI2Y2Q3YjRiOGM3OA==", type: null, hierarchical: null, internal: null, graph: null, base: null },
  item: {
    __typename: "cmp_PublicImageAsset" as const,
    Url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/Zz04MGM1Yzk2YzViNDUxMWYwYjZjMjI2Y2Q3YjRiOGM3OA==",
    Title: "Pandas", Description: null, Tags: null, MimeType: "image/jpeg",
    Height: 3632, Width: 5456, AltText: "Pandas", FocalPoint: null,
    Renditions: [
      { Id: null, Name: "100px crop",   Url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/de3a279ef77811f0b938e24c027d659d", Width: 100, Height: 67  },
      { Id: null, Name: "500x500 WEBP", Url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/e7e62fc6cef711f0b939162bee84ea3a", Width: 500, Height: 500 },
      { Id: null, Name: "700px Crop",   Url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/c04b03acf77811f0b938e24c027d659d", Width: 700, Height: 466 },
    ],
  },
};

// Mock InferredContentReference for Otters.jpg — same shape as PANDAS_IMAGE_REF above.
// Original is square (3402 × 3402); rendition heights estimated from aspect ratio.
const OTTERS_IMAGE_REF = {
  key: "demo-otters",
  url: { default: "https://images1.cmp.optimizely.com/assets/Otters.jpg/Zz04MDA4ZTA0YTViNDUxMWYwYTNlOGFhY2NkNjZhNDA3NA==", type: null, hierarchical: null, internal: null, graph: null, base: null },
  item: {
    __typename: "cmp_PublicImageAsset" as const,
    Url: "https://images1.cmp.optimizely.com/assets/Otters.jpg/Zz04MDA4ZTA0YTViNDUxMWYwYTNlOGFhY2NkNjZhNDA3NA==",
    Title: "Otters", Description: null, Tags: null, MimeType: "image/jpeg",
    Height: 3402, Width: 3402, AltText: "Otters", FocalPoint: null,
    Renditions: [
      { Id: null, Name: "100px crop",   Url: "https://images1.cmp.optimizely.com/assets/Otters.jpg/dc450a30f77811f0b938e24c027d659d", Width: 100, Height: 100 },
      { Id: null, Name: "500x500 WEBP", Url: "https://images1.cmp.optimizely.com/assets/Otters.jpg/e5759a7ecef711f0b744d257d6f7b76d", Width: 500, Height: 500 },
      { Id: null, Name: "700px Crop",   Url: "https://images1.cmp.optimizely.com/assets/Otters.jpg/c026d270f77811f09e96febb18003b5b", Width: 700, Height: 700 },
    ],
  },
};

const { getSrcset: getDamSrcset, getAlt: getDamAlt } = damAssets({});
const pandasRenditionSrcset = getDamSrcset(PANDAS_IMAGE_REF as any) ?? "";
const pandasSrcset = [
  pandasRenditionSrcset,
  `${PANDAS_IMAGE_REF.item.Url} ${PANDAS_IMAGE_REF.item.Width}w`,
].filter(Boolean).join(", ");
const pandasAlt = getDamAlt(PANDAS_IMAGE_REF as any, "Pandas");

// Build Otters srcset from renditions (smallest-to-largest) then append the original as
// the largest candidate - demonstrating the pattern of including the full-resolution original.
const ottersSrcset = [
  ...OTTERS_IMAGE_REF.item.Renditions.map((r) => `${r.Url} ${r.Width}w`),
  `${OTTERS_IMAGE_REF.item.Url} ${OTTERS_IMAGE_REF.item.Width}w`,
].join(", ");

const PROXY_DEMO_SRC = "https://images1.cmp.optimizely.com/assets/Pandas.jpg/c04b03acf77811f0b938e24c027d659d";

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
  let srcHostname = "";
  try { srcHostname = new URL(src).hostname; } catch {}
  if (!ALLOWED_HOSTS.some((h) => srcHostname.endsWith(h))) {
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

  // getSrcset builds a srcset string from the asset's pre-generated Renditions:
  // "https://...hero.jpg/rendition1 100w, https://...hero.jpg/rendition2 500w, ..."
  // In edit mode it appends the preview token to each rendition URL automatically.
  const srcset = getSrcset(content.backgroundImage);

  // getAlt pulls alt text stored in the DAM, falling back to the provided string:
  const alt = getAlt(content.backgroundImage, "Hero image");

  // isDamImageAsset / isDamVideoAsset / isDamRawFileAsset are TypeScript type guards:
  if (!isDamImageAsset(content.backgroundImage)) return null;

  return (
    <img
      src={content.backgroundImage.item.Url}
      srcSet={srcset}
      sizes="100vw"
      alt={alt}
      className="w-full h-auto"
    />
  );
}

// Note: getSrcset returns a plain srcset string for <img>, not a Next.js <Image>.
// Use Next.js <Image> with a fixed src when you want automatic format conversion (WebP/AVIF).`;

const RENDITION_FRAGMENT_SNIPPET = `// Graph fragment - cmp_PublicImageAsset fields are PascalCase.
// Each Renditions entry is a physically separate pre-generated file, not a resize parameter.
fragment RenditionImageFields on RenditionImageBlock {
  image {
    ... on cmp_PublicImageAsset {
      Renditions {
        Name
        Url
        Width
        Height
      }
      Url
    }
  }
}`;

const RENDITION_SRCSET_SNIPPET = `const RENDITION_WIDTHS: Record<string, number> = {
  thumbnail: 480,
  medium:    1280,
  large:     1920,
};

const srcset = (content.image?.Renditions ?? [])
  .filter((r) => RENDITION_WIDTHS[r.Name] !== undefined)
  .map((r) => \`\${r.Url} \${RENDITION_WIDTHS[r.Name]}w\`)
  .join(", ");

<img
  src={content.image?.Url}
  srcSet={srcset}
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 700px"
  alt={alt}
/>`;

const AUTHOR_RENDITION_SETUP_SNIPPET = `// Add a rendition enum alongside the image field.
// Enum values must match rendition names in your DAM instance exactly -
// these are the names shown in the DAM, not file names or URLs.
export const MediaBlockType = contentType({
  key: "MediaBlock",
  baseType: "_component",
  properties: {
    image: { type: "contentReference", allowedTypes: ["_image"], indexingType: "disabled" },
    rendition: {
      type: "string",
      enum: [
        { value: "portrait-crop",  displayName: "Portrait (cards, profile images)" },
        { value: "landscape-crop", displayName: "Landscape (heroes, banners)" },
      ],
    },
    altText: { type: "string" },
  },
});

// The GraphQL fragment is the same as for srcset - query Renditions regardless.
fragment MediaBlockFields on MediaBlock {
  image {
    ... on cmp_PublicImageAsset {
      Renditions { Name Url Width Height }
      Url
    }
  }
  rendition
  altText
}`;

const AUTHOR_RENDITION_COMPONENT_SNIPPET = `// Walk the Renditions array to find the author-selected rendition by name.
// Fall back through base Url, then both Graph shapes for the image URL.
const renditions = content.image?.Renditions ?? [];
const matched = renditions.find((r) => r.Name === content.rendition);
const src =
  matched?.Url ??                            // rendition-specific file
  content.image?.Url ??                      // base DAM URL (original)
  content.image?._metadata?.url?.default ??  // composition-context shape
  content.image?.url?.default;               // direct page query shape

// Use matched dimensions for layout shift prevention when available:
<Image
  src={src}
  alt={content.altText ?? ""}
  width={matched?.Width ?? 1200}
  height={matched?.Height ?? 800}
  className="w-full h-auto"
/>`;

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
            overhead on every publish. The same applies to video and file references.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
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
            so DAM images load correctly in the Visual Builder editor without extra code.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/11-dam-assets.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>

          <CodeBlock code={DAM_ASSETS_SNIPPET} label="damAssets - getSrcset, getAlt, isDamImageAsset" />

          <div className="mt-8">
            <p className="text-xs font-semibold text-on-surface mb-4">Live example - getSrcset output rendered as a real image</p>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div
                  className="resize-x overflow-hidden rounded-2xl border border-ghost-border max-w-[260px] md:max-w-full"
                  style={{ width: "700px", minWidth: "100px" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={PANDAS_IMAGE_REF.item.Url}
                    srcSet={pandasSrcset}
                    sizes="(max-width: 768px) 260px, 700px"
                    alt={pandasAlt}
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs font-mono text-on-surface-variant mt-2 opacity-60 break-all">
                  srcset: {pandasSrcset}
                </p>
              </div>
              <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
                <p>
                  <code className="bg-surface-low px-1 rounded font-mono">getSrcset()</code> walks the <code className="bg-surface-low px-1 rounded font-mono">Renditions</code> array in ascending width order. The original URL is appended as the largest candidate so the browser always has a full-resolution fallback. On desktop, drag the bottom-right handle and check DevTools → Network → Img to see which entry is fetched at each width.
                </p>
                <p>
                  In edit mode <code className="bg-surface-low px-1 rounded font-mono">getSrcset()</code> automatically appends the CMS preview token to each rendition URL so DAM images load correctly in Visual Builder without extra code.
                </p>
                <p>
                  <code className="bg-surface-low px-1 rounded font-mono">getAlt()</code> returns <code className="bg-surface-low px-1 rounded font-mono">AltText</code> stored on the DAM asset, falling back to the string you provide — here <strong className="text-on-surface">&ldquo;{pandasAlt}&rdquo;</strong>.
                </p>
              </div>
            </div>
          </div>

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
            DAM renditions and srcset
            <SectionAnchor id="dam-renditions" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            DAM images in Graph expose pre-generated renditions via{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cmp_PublicImageAsset</code>.
            The content picker selects the asset; rendition selection is handled in code. When your
            DAM stores size variants of the same image - a thumbnail, medium, and large version of
            the same composition - build a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">srcset</code> string from
            the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">Renditions</code> array
            and let the browser download the smallest one that fits the rendered width. Always pair{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">srcSet</code> with a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">sizes</code> attribute -
            without it the browser assumes 100vw and downloads the largest file on every viewport.{" "}
            To skip building this string manually, use{" "}
            <a href="#dam-assets" className="text-brand hover:underline font-medium">
              <code className="font-mono text-xs">damAssets().getSrcset()</code>
            </a>{" "}
            above.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={RENDITION_FRAGMENT_SNIPPET} label="GraphQL fragment" />
            <CodeBlock code={RENDITION_SRCSET_SNIPPET} label="Component - srcset from renditions" />
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold text-on-surface mb-2">Live examples</p>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed max-w-3xl">
              The browser picks <strong className="text-on-surface">one</strong> rendition at load time and locks it in for that page load. To see a different rendition: resize the browser window to a new breakpoint, then hard reload. DevTools → Network → Img shows which URL was fetched.
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-start">

              <div>
                <p className="text-xs font-semibold text-on-surface mb-1">Otters.jpg — srcset with original</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  3402 × 3402 original included as the largest candidate. Resize your browser viewport and hard reload — DevTools → Network → Img shows which URL was fetched.
                </p>
                <div className="rounded-2xl overflow-hidden border border-ghost-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={OTTERS_IMAGE_REF.item.Url}
                    srcSet={ottersSrcset}
                    sizes="(max-width: 300px) 50px, (max-width: 600px) 250px, (max-width: 1100px) 350px, 3402px"
                    alt="Otters"
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs font-mono text-on-surface-variant mt-2 opacity-60">
                  src=original ({OTTERS_IMAGE_REF.item.Width}px) &nbsp;&bull;&nbsp; sizes=&quot;≤300px→100w, ≤600px→500w, ≤1100px→700w, 3402w&quot;
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-on-surface mb-1">Pandas.jpg — original + three renditions</p>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  5456 × 3632 original. Three pre-generated renditions from the same DAM instance.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: "Original", dims: "5456 × 3632", url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/Zz04MGM1Yzk2YzViNDUxMWYwYjZjMjI2Y2Q3YjRiOGM3OA==" },
                    { label: "100px crop", dims: "100 × 67", url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/de3a279ef77811f0b938e24c027d659d" },
                    { label: "500x500 WEBP", dims: "500 × 500", url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/e7e62fc6cef711f0b939162bee84ea3a" },
                    { label: "700px Crop", dims: "700 × 466", url: "https://images1.cmp.optimizely.com/assets/Pandas.jpg/c04b03acf77811f0b938e24c027d659d" },
                  ] as const).map(({ label, dims, url }) => (
                    <div key={label} className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
                      <div className="relative w-full aspect-square overflow-hidden bg-surface-low">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={label} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold text-on-surface truncate">{label}</p>
                        <p className="text-xs font-mono text-on-surface-variant">{dims}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        <section id="author-rendition-selection">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Author-controlled rendition selection
            <SectionAnchor id="author-rendition-selection" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Consider a photography asset that has both a portrait crop (used in profile cards) and
            a landscape crop (used in hero banners). An author placing that asset into a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">MediaBlock</code> needs
            to say which crop fits the context -{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">srcset</code> cannot
            help here because the choice is about composition, not screen size. Add a string{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">enum</code> property
            whose values match the rendition names in your DAM instance exactly, and the author
            picks both the image and the crop. If a component always uses the same crop, pick it
            by name in code instead - no CMS property needed.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={AUTHOR_RENDITION_SETUP_SNIPPET} label="Content type + GraphQL fragment" />
            <CodeBlock code={AUTHOR_RENDITION_COMPONENT_SNIPPET} label="Component - rendition lookup and fallback" />
          </div>
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
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            A minimal Next.js route handler fetches the image server-side and streams it back.
            Always validate the source hostname before fetching - without it the route becomes
            an open proxy that anyone can use to fetch arbitrary URLs through your origin.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-6 max-w-3xl">
            <p className="text-xs font-semibold text-on-surface mb-2">Alternative - configure the Media hostname in the CMS UI</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Rather than proxying at request time, you can tell the CMS to index media URLs under your own domain from the start.
              In the CMS go to <strong className="text-on-surface">Settings &rarr; Applications &rarr; Hostnames</strong>, find the{" "}
              <strong className="text-on-surface">Media</strong> entry, and overwrite it with your domain. Graph will then store and
              return asset URLs rooted at your hostname rather than the default Optimizely CDN subdomains - no proxy route or{" "}
              <code className="bg-surface px-1 rounded font-mono">remotePatterns</code> rewrites needed on the Next.js side.
              Use this approach when you want the URL change to be reflected in Graph itself, so all clients (not just your frontend) see your domain.
            </p>
          </div>

          <CodeBlock code={IMAGE_PROXY_SNIPPET} label="src/app/api/image-proxy/route.ts" />

          <div className="mt-8">
            <p className="text-xs font-semibold text-on-surface mb-4">Live example - image loaded through /api/image-proxy</p>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="rounded-2xl overflow-hidden border border-ghost-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/image-proxy?src=${encodeURIComponent(PROXY_DEMO_SRC)}`}
                    alt="Pandas - served via /api/image-proxy"
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs font-mono text-on-surface-variant mt-2 opacity-60 break-all">
                  /api/image-proxy?src={encodeURIComponent(PROXY_DEMO_SRC)}
                </p>
              </div>
              <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
                <p>
                  The image URL in the page HTML is <code className="bg-surface-low px-1 rounded font-mono">/api/image-proxy?src=...</code> — your own origin, not <code className="bg-surface-low px-1 rounded font-mono">images1.cmp.optimizely.com</code>.
                </p>
                <p>
                  Open DevTools → Network → Img and reload to confirm the request goes to <code className="bg-surface-low px-1 rounded font-mono">/api/image-proxy</code> and returns with your <code className="bg-surface-low px-1 rounded font-mono">Cache-Control: immutable</code> header.
                </p>
                <p>
                  Requesting a URL from a non-allowed host (e.g. <code className="bg-surface-low px-1 rounded font-mono">example.com</code>) returns <code className="bg-surface-low px-1 rounded font-mono">403 Forbidden</code>.
                </p>
              </div>
            </div>
          </div>
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

        <KeyPoints points={[
          <><strong className="text-on-surface">Always set indexingType: &quot;disabled&quot; on image fields.</strong> Graph cannot index binary assets. Omitting it wastes indexing cycles on every publish and may cause schema warnings.</>,
          <><strong className="text-on-surface">Graph returns two different shapes for image references.</strong> Composition context gives <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.default</code>; direct page queries give <code className="bg-surface-low px-1 rounded font-mono text-xs">url.default</code>. Write a defensive helper that checks both.</>,
          <><strong className="text-on-surface">Allowlist all three Optimizely domains in next.config before using &lt;Image&gt;.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">**.cms.optimizely.com</code> for CMS assets, <code className="bg-surface-low px-1 rounded font-mono text-xs">**.cmp.optimizely.com</code> for DAM assets from CMP, and <code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code> for Graph CDN. Missing any one causes a 400 at runtime - not caught at build time.</>,
          <><strong className="text-on-surface">Always provide a sizes prop when using fill.</strong> Without it Next.js defaults to 100vw, causing the browser to download a full-width image even on mobile devices.</>,
          <><strong className="text-on-surface">Always pair srcSet with a sizes attribute.</strong> Without sizes the browser assumes 100vw and downloads the largest srcset candidate on every viewport. Use <code className="bg-surface-low px-1 rounded font-mono text-xs">damAssets().getSrcset()</code> to build the srcset string from the asset&apos;s pre-generated DAM renditions automatically, or build it manually from the <code className="bg-surface-low px-1 rounded font-mono text-xs">Renditions</code> array when you need custom filtering.</>,
          <><strong className="text-on-surface">Image arrays use type: &quot;array&quot; with items: type: &quot;content&quot;.</strong> Graph inline-expands these automatically - all <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> fields arrive with the page query, no extra fetch needed.</>,
          <><strong className="text-on-surface">damAssets() handles preview token injection automatically.</strong> If you pass a DAM image ref through <code className="bg-surface-low px-1 rounded font-mono text-xs">getSrcset()</code> in edit mode, the helper appends the preview token so the image loads correctly in Visual Builder.</>,
          <><strong className="text-on-surface">The content picker cannot select a DAM rendition - serve it from code.</strong> All rendition data is available in Graph under <code className="bg-surface-low px-1 rounded font-mono text-xs">cmp_PublicImageAsset.Renditions</code>. Default to building a srcset so the browser picks by viewport width. Expose a rendition dropdown to authors only when renditions represent different crops or formats rather than size variants of the same image.</>,
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
