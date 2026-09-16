import { OptimizelyComposition, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { NodeWrapper } from "./CompositionExperience";

// Three stacked compositions: topComposition (hero + sub-hero grid only),
// middleComposition (open), and the experience's built-in composition as the
// bottom (article list + FAQs only). What each one accepts is set on the content
// type (src/lib/optimizely/productLandingTypes.mjs): the two properties carry
// allowedTypes, the built-in one is restricted by the type-level composition
// config. It renders last because the CMS always sorts it last in the outline.
export default function ProductLandingExperience({ content }: { content: any }) {
  const { pa } = getPreviewUtils(content);
  const top: any[] = content?.topComposition?.nodes ?? [];
  const middle: any[] = content?.middleComposition?.nodes ?? [];
  const bottom: any[] = content?.composition?.nodes ?? [];

  return (
    <div data-component="ProductLandingExperience">
      <div {...pa("topComposition")}>
        <OptimizelyComposition nodes={top} ComponentWrapper={NodeWrapper} />
      </div>
      <div {...pa("middleComposition")}>
        <OptimizelyComposition nodes={middle} ComponentWrapper={NodeWrapper} />
      </div>
      <OptimizelyComposition nodes={bottom} ComponentWrapper={NodeWrapper} />
    </div>
  );
}
