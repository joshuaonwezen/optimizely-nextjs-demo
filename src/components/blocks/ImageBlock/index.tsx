import Image from "next/image";
import { contentType, displayTemplate, damAssets } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const ImageBlockType = contentType({
  key: "ImageBlock",
  displayName: "Image Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    image: { type: "contentReference", displayName: "Image", allowedTypes: ["_image"], indexingType: "disabled" },
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

interface DamRendition {
  Name?: string | null;
  Url?: string | null;
  Width?: number | null;
  Height?: number | null;
}

interface ImageBlockData {
  image?: {
    // DAM assets (cmp_PublicImageAsset) return their fields under `item` - this is
    // where the real URL and renditions live for a DAM-stored image.
    item?: {
      Url?: string | null;
      Width?: number | null;
      Height?: number | null;
      AltText?: string | null;
      Renditions?: Array<DamRendition> | null;
    } | null;
    // CMS globalassets: URL comes back at the top level (page-query context) or
    // nested under _metadata (composition context).
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
  const { pa } = getPreviewUtils(data as any);
  const { getAlt, isDamImageAsset } = damAssets(data as any);

  // DAM asset fields (Url, Renditions) live under image.item; CMS globalassets
  // expose their URL at image.url.default / image._metadata.url.default.
  const dam = data.image?.item ?? null;
  const renditions = dam?.Renditions ?? [];
  const matched = renditions.find((r) => r.Name === data.rendition);
  const imageUrl =
    matched?.Url ??
    dam?.Url ??
    data.image?.url?.default ??
    data.image?._metadata?.url?.default;

  if (!imageUrl) return null;

  const altText = isDamImageAsset(data.image as any)
    ? getAlt(data.image as any, data.altText ?? "")
    : data.altText ?? "";

  const isRounded = props.displayTemplateKey === "ImageBlockRoundedTemplate";
  const aspectRatio = ASPECT_RATIOS[(ds?.aspectRatio as string) ?? "auto"];

  return (
    <figure data-component="ImageBlock" className="max-w-7xl mx-auto px-8 py-8">
      <div
        className={`relative overflow-hidden ${isRounded ? "rounded-2xl" : ""}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <Image
          src={imageUrl}
          alt={altText}
          fill={!!aspectRatio}
          width={aspectRatio ? undefined : (matched?.Width ?? dam?.Width ?? 1200)}
          height={aspectRatio ? undefined : (matched?.Height ?? dam?.Height ?? 675)}
          className={`${aspectRatio ? "object-cover" : "w-full h-auto"} ${isRounded ? "rounded-2xl" : ""}`}
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
