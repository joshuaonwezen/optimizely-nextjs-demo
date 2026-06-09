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
    altText: { type: "string", displayName: "Alt Text" },
    caption: { type: "string", displayName: "Caption" },
  },
});

export const ImageBlockRoundedTemplate = displayTemplate({
  key: "ImageBlockRoundedTemplate",
  isDefault: false,
  displayName: "Rounded Image",
  contentType: "ImageBlock",
  tag: "Rounded",
  settings: {
    aspectRatio: {
      editor: "select",
      displayName: "Aspect Ratio",
      sortOrder: 0,
      choices: {
        auto: { displayName: "Auto", sortOrder: 0 },
        r16x9: { displayName: "16:9", sortOrder: 1 },
        r4x3: { displayName: "4:3", sortOrder: 2 },
        r1x1: { displayName: "Square", sortOrder: 3 },
      },
    },
  },
});

interface ImageBlockData {
  image?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
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
  const imageUrl = data.image?._metadata?.url?.default;

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
          width={aspectRatio === "auto" ? 1200 : undefined}
          height={aspectRatio === "auto" ? 675 : undefined}
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
