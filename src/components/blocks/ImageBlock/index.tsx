import { contentType, displayTemplate, damAssets } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

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
      sortOrder: 0,
      choices: {
        auto: { displayName: "Auto",           sortOrder: 0 },
        r16x9: { displayName: "16:9 Widescreen", sortOrder: 1 },
        r4x3:  { displayName: "4:3 Standard",    sortOrder: 2 },
        r1x1:  { displayName: "1:1 Square",      sortOrder: 3 },
      },
    },
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

  const srcSet = getSrcset(data.image as any);
  const altText = getAlt(data.image as any, data.altText ?? "");

  const isRounded = props.displayTemplateKey === "ImageBlockRoundedTemplate";
  const aspectRatio = ASPECT_RATIOS[(ds?.aspectRatio as string) ?? "auto"];

  return (
    <figure data-component="ImageBlock" className="max-w-7xl mx-auto px-8 py-8">
      <div
        className={`relative overflow-hidden ${isRounded ? "rounded-2xl" : ""}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- DAM URLs carry a preview token; next/image would re-optimise and strip it */}
        <img
          src={imageUrl}
          srcSet={srcSet}
          sizes="(max-width: 1280px) 100vw, 1280px"
          alt={altText}
          className={`${aspectRatio ? "absolute inset-0 h-full w-full object-cover" : "w-full h-auto"} ${isRounded ? "rounded-2xl" : ""}`}
        />
      </div>
      {data.caption && (
        <figcaption
          {...pa("caption")}
          className="text-sm mt-4 text-center text-on-surface-variant"
        >
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}
