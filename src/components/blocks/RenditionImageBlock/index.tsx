import Image from "next/image";
import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const RenditionImageBlockType = contentType({
  key: "RenditionImageBlock",
  displayName: "Rendition Image Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    image: {
      type: "contentReference",
      displayName: "Image",
      allowedTypes: ["_image"],
      indexingType: "disabled",
    },
    rendition: {
      type: "string",
      displayName: "Rendition",
      enum: [
        { value: "original",    displayName: "Original" },
        { value: "thumbnail",   displayName: "Thumbnail" },
        { value: "medium",      displayName: "Medium" },
        { value: "banner-wide", displayName: "Banner (wide)" },
        { value: "square",      displayName: "Square" },
      ],
    },
    altText: { type: "string", displayName: "Alt Text" },
  },
});

// Graph fragment required for renditions to be available in the component:
//
// fragment RenditionImageFields on RenditionImageBlock {
//   image {
//     ... on cmp_PublicImageAsset {
//       Renditions { Name Url Width Height }
//       Url
//     }
//   }
//   rendition
//   altText
// }

interface RenditionImageBlockData {
  image?: {
    // Composition context (Visual Builder / content area)
    _metadata?: { url?: { default?: string | null } | null } | null;
    // Direct page query context
    url?: { default?: string | null } | null;
    // cmp_PublicImageAsset fields - present when queried via the fragment above
    Url?: string | null;
    Renditions?: Array<{
      Name?: string | null;
      Url?: string | null;
      Width?: number | null;
      Height?: number | null;
    }> | null;
  } | null;
  rendition?: string | null;
  altText?: string | null;
}

type RenditionImageBlockProps = RenditionImageBlockData & {
  content?: RenditionImageBlockData;
};

export default function RenditionImageBlock(props: RenditionImageBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const renditions = data.image?.Renditions ?? [];
  const matched = renditions.find((r) => r.Name === data.rendition);
  // Each rendition is a physically separate file at a different URL - the DAM
  // serves them independently, so "thumbnail" and "banner-wide" resolve to
  // different URLs, not just different query parameters on the same file.
  const src =
    matched?.Url ??
    data.image?.Url ??
    data.image?._metadata?.url?.default ??
    data.image?.url?.default;

  if (!src) return null;

  return (
    <figure data-component="RenditionImageBlock" className="max-w-7xl mx-auto px-8 py-8">
      <div {...pa("image")} className="relative overflow-hidden rounded-2xl">
        <Image
          src={src}
          alt={data.altText ?? ""}
          width={matched?.Width ?? 1200}
          height={matched?.Height ?? 675}
          className="w-full h-auto"
        />
      </div>
    </figure>
  );
}
