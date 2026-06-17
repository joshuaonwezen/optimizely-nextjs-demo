import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
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

interface ImageBlockData {
  image?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
    url?: { default?: string | null } | null;
    Url?: string | null;
    Renditions?: Array<{ Name?: string | null; Url?: string | null; Width?: number | null; Height?: number | null }> | null;
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

export default function ImageBlock(props: ImageBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const renditions = data.image?.Renditions ?? [];
  const matched = renditions.find((r) => r.Name === data.rendition);
  const imageUrl =
    matched?.Url ??
    data.image?.Url ??
    data.image?._metadata?.url?.default ??
    data.image?.url?.default;

  if (!imageUrl) return null;

  const isRounded = props.displayTemplateKey === "ImageBlockRoundedTemplate";
  const aspectRatio = (ds?.aspectRatio as string) ?? "auto";

  return (
    <figure data-component="ImageBlock" className="max-w-7xl mx-auto px-8 py-8">
      <div
        className={`relative overflow-hidden ${isRounded ? "rounded-2xl" : ""}`}
        style={aspectRatio !== "auto" ? { aspectRatio } : undefined}
      >
        <Image
          src={imageUrl}
          alt={data.altText ?? ""}
          fill={aspectRatio !== "auto"}
          width={aspectRatio === "auto" ? (matched?.Width ?? 1200) : undefined}
          height={aspectRatio === "auto" ? (matched?.Height ?? 675) : undefined}
          className={`${aspectRatio !== "auto" ? "object-cover" : "w-full h-auto"} ${isRounded ? "rounded-2xl" : ""}`}
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
