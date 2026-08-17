import { contentType, displayTemplate, damAssets } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { buildDamSrcset, damImageUrl } from "@/lib/optimizely/damImage";

export const ImageBlockType = contentType({
  key: "ImageBlock",
  displayName: "Image Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    // No indexingType: the SDK omits indexingType:"disabled" reference fields from
    // its generated fragment (createQuery), so the image would never be queried.
    image: { type: "contentReference", displayName: "Image", allowedTypes: ["_image"] },
    rendition: {
      type: "string",
      displayName: "Image Rendition",
      enum: [
        { value: "100px crop",   displayName: "Thumbnail (100px crop)" },
        { value: "500x500 WEBP", displayName: "Medium (500x500 WEBP)" },
        { value: "700px Crop",   displayName: "Large (700px crop)" },
      ],
    },
    altText: { type: "string", displayName: "Alt Text", isLocalized: true },
    caption: { type: "string", displayName: "Caption", isLocalized: true },
  },
});

export const ImageBlockDefaultTemplate = displayTemplate({
  key: "ImageBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "ImageBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

export const ImageBlockRoundedTemplate = displayTemplate({
  key: "ImageBlockRoundedTemplate",
  isDefault: false,
  displayName: "Rounded corners",
  contentType: "ImageBlock",
  tag: "Rounded",
  settings: {
    aspectRatio: {
      editor: "select",
      displayName: "Aspect ratio",
      sortOrder: 10,
      choices: {
        auto: { displayName: "Auto",           sortOrder: 0 },
        r16x9: { displayName: "16:9 Widescreen", sortOrder: 1 },
        r4x3:  { displayName: "4:3 Standard",    sortOrder: 2 },
        r1x1:  { displayName: "1:1 Square",      sortOrder: 3 },
      },
    },
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface ImageBlockData {
  // DAM assets expose Url/Renditions under image.item; the SDK's src()/getSrcset
  // read that. CMS globalassets expose their URL at image.url.default (page query)
  // or image._metadata.url.default (composition), handled by the fallbacks below.
  image?: {
    url?: { default?: string | null } | null;
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  rendition?: string | null;
  altText?: string | null;
  caption?: string | null;
}

type ImageBlockProps = ImageBlockData & {
  content?: ImageBlockData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

// Choice keys cannot contain "/" or ":", so map them to valid CSS aspect-ratio values
const ASPECT_RATIOS: Record<string, string> = {
  r16x9: "16 / 9",
  r4x3:  "4 / 3",
  r1x1:  "1 / 1",
};

// Same choices as height/width, used to ask the CDN for a server-side crop so we
// don't download the pixels CSS object-cover would clip away.
const CROP_RATIOS: Record<string, number> = {
  r16x9: 9 / 16,
  r4x3:  3 / 4,
  r1x1:  1,
};

// DAM FocalPoint (when present) is normalized 0-1; the CDN wants 0-100 percentages.
function focalPercent(image: unknown): { centerWidth?: number; centerHeight?: number } {
  const fp = (image as any)?.item?.FocalPoint;
  if (!fp || typeof fp.x !== "number" || typeof fp.y !== "number") return {};
  const pct = (n: number) => Math.round((n <= 1 ? n * 100 : n));
  return { centerWidth: pct(fp.x), centerHeight: pct(fp.y) };
}

export default function ImageBlock(props: ImageBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa, src } = getPreviewUtils(data as any);
  const { getSrcset, getAlt } = damAssets(data as any);

  // src() resolves the DAM asset URL (image.item.Url) and appends the preview
  // token in edit mode; the fallbacks cover CMS globalassets (no DAM item).
  const imageUrl =
    src(data.image as any) ??
    data.image?.url?.default ??
    data.image?._metadata?.url?.default;

  if (!imageUrl) return null;

  const altText = getAlt(data.image as any, data.altText ?? "");

  const isRounded = props.displayTemplateKey === "ImageBlockRoundedTemplate";
  const ratioKey = (ds?.aspectRatio as string) ?? "auto";
  const aspectRatio = ASPECT_RATIOS[ratioKey];
  const cropRatio = CROP_RATIOS[ratioKey];

  // Prefer CDN on-the-fly resizing for DAM URLs: builds a responsive srcset at
  // real display widths (independent of whatever renditions the asset has). When
  // an aspect ratio is chosen, crop server-side with the asset's focal point.
  // Falls back to the SDK's rendition-based srcset for CMS globalassets.
  const cdnSrcSet = buildDamSrcset(
    imageUrl,
    undefined,
    cropRatio
      ? { action: "Crop", aspectRatio: cropRatio, ...focalPercent(data.image) }
      : {},
  );
  const srcSet = cdnSrcSet ?? getSrcset(data.image as any);
  // Cap the base src (the srcSet fallback) so it is never the full-res original.
  const baseSrc = damImageUrl(imageUrl, { width: 1280 });
  const style = resolveStyleClasses(ds, { background: "transparent" });

  return (
    <figure
      data-component="ImageBlock"
      className={`max-w-7xl mx-auto px-8 py-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}
    >
      <div
        className={`relative overflow-hidden ${isRounded ? "rounded-2xl" : ""}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- DAM URLs carry a preview token; next/image would re-optimise and strip it */}
        <img
          src={baseSrc}
          srcSet={srcSet}
          sizes="(max-width: 1280px) 100vw, 1280px"
          alt={altText}
          className={`${aspectRatio ? "absolute inset-0 h-full w-full object-cover" : "w-full h-auto"} ${isRounded ? "rounded-2xl" : ""}`}
        />
      </div>
      {data.caption && (
        <figcaption
          {...pa("caption")}
          className={`text-sm mt-4 text-center ${style.font} ${style.textMuted}`}
        >
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}
