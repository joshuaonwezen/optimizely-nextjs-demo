import { contentType, displayTemplate, damAssets } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND_NONE_DEFAULT, pageContainer, resolveStyleClasses, type Placement } from "../_shared/displayTemplateSettings";
import { buildDamSrcset, damImageUrl } from "@/lib/optimizely/damImage";
import { resolveImageUrl } from "../_shared/contentRefs";
import { asDamContent, asSdkContent, asSdkReference } from "@/components/cms/sdkTypes";

// The rendition enum implies a shape; ask the CDN to crop to it (as height/width)
// so the intended crop holds even when the named rendition is missing on the asset.
const CROP_RATIOS: Record<string, number> = {
  "portrait-crop":  4 / 3,   // taller than wide
  "landscape-crop": 9 / 16,  // wider than tall
};

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

export const RenditionImageBlockDefaultTemplate = displayTemplate({
  key: "RenditionImageBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "RenditionImageBlock",
  settings: {
    // Image only - no text, so no text color or font controls.
    ...BACKGROUND_NONE_DEFAULT,
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
  displaySettings?: Record<string, string | boolean>;
  placement?: Placement;
};

export default function RenditionImageBlock(props: RenditionImageBlockProps) {
  const data = props.content ?? props;
  const { pa, src } = getPreviewUtils(asSdkContent(data));
  const { getSrcset, getAlt } = damAssets(asDamContent(data));
  const style = resolveStyleClasses(props.displaySettings, { background: "transparent" });

  // src() resolves the DAM asset URL + preview token; fallbacks cover globalassets.
  const imageUrl = resolveImageUrl(data.image, src);

  if (!imageUrl) return null;

  // Prefer CDN on-the-fly resizing for DAM URLs (responsive widths independent of
  // the asset's renditions, cropped to the selected shape); fall back to the SDK's
  // rendition-based srcset for CMS globalassets.
  const cropRatio = CROP_RATIOS[data.rendition ?? ""];
  const cdnSrcSet = buildDamSrcset(
    imageUrl,
    undefined,
    cropRatio ? { action: "crop", aspectRatio: cropRatio } : {},
  );
  const srcSet = cdnSrcSet ?? getSrcset(asSdkReference(data.image));
  const baseSrc = damImageUrl(imageUrl, { width: 1280 });

  return (
    <figure
      data-component="RenditionImageBlock"
      className={`${pageContainer(props.placement, "max-w-7xl mx-auto px-8") || (style.wrapper ? "px-8" : "")} py-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}
    >
      {/* CROP_RATIOS is height/width (what the DAM crop param wants); CSS
          aspect-ratio is width/height, hence the reciprocal. Reserving the box
          keeps a cropped rendition from shifting layout as it loads. */}
      <div
        {...pa("image")}
        className="relative overflow-hidden rounded-2xl"
        style={cropRatio ? { aspectRatio: 1 / cropRatio } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- DAM URLs carry a preview token; next/image would re-optimise and strip it */}
        <img
          src={baseSrc}
          srcSet={srcSet}
          sizes="(max-width: 1280px) 100vw, 1280px"
          alt={getAlt(asSdkReference(data.image), data.altText ?? "")}
          loading="lazy"
          decoding="async"
          className={
            cropRatio
              ? "absolute inset-0 h-full w-full object-cover"
              : "w-full h-auto block"
          }
        />
      </div>
    </figure>
  );
}
