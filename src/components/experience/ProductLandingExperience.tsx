import { OptimizelyComposition, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import type { Composition, ExperienceContent } from "@/components/cms/sdkTypes";
import { NodeWrapper } from "./CompositionExperience";

type ProductLandingContent = ExperienceContent & {
  topComposition?: Composition;
  middleComposition?: Composition;
};

// Three stacked compositions: topComposition (hero + sub-hero grid only),
// middleComposition (open), and the experience's built-in composition as the
// bottom (article list + FAQs only). What each one accepts is set on the content
// type (src/lib/optimizely/productLandingTypes.mjs): the two properties carry
// allowedTypes, the built-in one is restricted by the type-level composition
// config. It renders last because the CMS always sorts it last in the outline.
export default function ProductLandingExperience({ content }: { content: ProductLandingContent }) {
  const { pa } = getPreviewUtils(content);
  const top = content?.topComposition?.nodes ?? [];
  const middle = content?.middleComposition?.nodes ?? [];
  const bottom = content?.composition?.nodes ?? [];

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
