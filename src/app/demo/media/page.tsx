import fs from "fs";
import path from "path";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Media & Images",
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
logos: {
  type: "array",
  items: { type: "content", allowedTypes: ["_image"] },
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

// 3. Natural editorial image - for article images where aspect ratio comes from the asset
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
      hostname: "**.cms.optimizely.com",  // CMS / DAM uploaded assets
    },
    {
      protocol: "https",
      hostname: "cg.optimizely.com",       // Graph CDN delivery
    },
  ],
},

// If editors can add external image URLs (e.g. a url property type), add those
// domains too - or use loader: "custom" to proxy all images through your own origin.`;

const DAM_ASSETS_SNIPPET = `// damAssets() - SDK helper for responsive srcsets and DAM-stored alt text.
// Use it when you want responsive images without manually building srcset strings,
// or when alt text is stored in the DAM rather than as a separate CMS property.

import { damAssets } from "@optimizely/cms-sdk";
import Image from "next/image";

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

export default function MediaDemoPage() {
  return (
    <div className="min-h-screen bg-surface">

      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Media &amp; Images
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How to model image properties, query them from Graph, and render them with Next.js
            Image - including the two different shapes Graph returns depending on context.
          </p>
        </div>
      </section>

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
            the images happen to load from cache. Two patterns are needed: one for assets uploaded
            to the Optimizely DAM (<code className="bg-surface-low px-1 rounded font-mono text-xs">**.cms.optimizely.com</code>)
            and one for Graph CDN delivery (<code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code>).
          </p>
          <CodeBlock code={REMOTE_PATTERNS_SNIPPET} label="next.config.ts - required remotePatterns" />
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

        <section id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
            <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            {[
              <><strong className="text-on-surface">Always set indexingType: &quot;disabled&quot; on image fields.</strong> Graph cannot index binary assets. Omitting it wastes indexing cycles on every publish and may cause schema warnings.</>,
              <><strong className="text-on-surface">Graph returns two different shapes for image references.</strong> Composition context gives <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata.url.default</code>; direct page queries give <code className="bg-surface-low px-1 rounded font-mono text-xs">url.default</code>. Write a defensive helper that checks both.</>,
              <><strong className="text-on-surface">Allowlist both CMS domains in next.config before using &lt;Image&gt;.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">**.cms.optimizely.com</code> for DAM assets, <code className="bg-surface-low px-1 rounded font-mono text-xs">cg.optimizely.com</code> for Graph CDN. The error is a 400 at runtime - not caught at build time.</>,
              <><strong className="text-on-surface">Always provide a sizes prop when using fill.</strong> Without it Next.js defaults to 100vw, causing the browser to download a full-width image even on mobile devices.</>,
              <><strong className="text-on-surface">Image arrays use type: &quot;array&quot; with items: type: &quot;content&quot;.</strong> Graph inline-expands these automatically - all <code className="bg-surface-low px-1 rounded font-mono text-xs">_metadata</code> fields arrive with the page query, no extra fetch needed.</>,
              <><strong className="text-on-surface">damAssets() handles preview token injection automatically.</strong> If you pass a DAM image ref through <code className="bg-surface-low px-1 rounded font-mono text-xs">getSrcset()</code> in edit mode, the helper appends the preview token so the image loads correctly in Visual Builder.</>,
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
            { label: "ImageBlock/index.tsx", path: "src/components/blocks/ImageBlock/index.tsx", content: imageBlockTs },
            { label: "LogoGridBlock/index.tsx", path: "src/components/blocks/LogoGridBlock/index.tsx", content: logoGridTs },
          ]}
        />

      </div>
    </div>
  );
}
