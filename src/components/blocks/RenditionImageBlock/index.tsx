import { contentType, damAssets } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const RenditionImageBlockType = contentType({
  key: "RenditionImageBlock",
  displayName: "Rendition Image Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    // No indexingType: indexingType:"disabled" makes the SDK drop the reference
    // from its generated fragment, so the image (and its DAM renditions) is never
    // queried. Omit it so the SDK includes the field + DAM item expansion.
    image: {
      type: "contentReference",
      displayName: "Image",
      allowedTypes: ["_image"],
    },
    rendition: {
      type: "string",
      displayName: "Crop",
      enum: [
        { value: "portrait-crop",  displayName: "Portrait (cards, profile images)" },
        { value: "landscape-crop", displayName: "Landscape (heroes, banners)" },
      ],
    },
    altText: { type: "string", displayName: "Alt Text", isLocalized: true },
  },
});

interface RenditionImageBlockData {
  // DAM renditions live under image.item and are read by src()/getSrcset. The
  // url/_metadata fallbacks cover CMS globalassets that have no DAM item.
  image?: {
    url?: { default?: string | null } | null;
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  rendition?: string | null;
  altText?: string | null;
}

type RenditionImageBlockProps = RenditionImageBlockData & {
  content?: RenditionImageBlockData;
};

export default function RenditionImageBlock(props: RenditionImageBlockProps) {
  const data = props.content ?? props;
  const { pa, src } = getPreviewUtils(data as any);
  const { getSrcset, getAlt } = damAssets(data as any);

  // src() resolves the DAM asset URL + preview token; fallbacks cover globalassets.
  const imageUrl =
    src(data.image as any) ??
    data.image?.url?.default ??
    data.image?._metadata?.url?.default;

  if (!imageUrl) return null;

  return (
    <figure data-component="RenditionImageBlock" className="max-w-7xl mx-auto px-8 py-8">
      <div {...pa("image")} className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- DAM URLs carry a preview token; next/image would re-optimise and strip it */}
        <img
          src={imageUrl}
          srcSet={getSrcset(data.image as any)}
          sizes="(max-width: 1280px) 100vw, 1280px"
          alt={getAlt(data.image as any, data.altText ?? "")}
          className="w-full h-auto block"
        />
      </div>
    </figure>
  );
}
