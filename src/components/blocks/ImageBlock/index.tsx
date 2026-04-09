import Image from "next/image";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface ImageBlockData {
  image?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  altText?: string | null;
  caption?: string | null;
  __context?: any;
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
    <figure {...pa((data as any).__composition)} className="max-w-7xl mx-auto px-8 py-8">
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
