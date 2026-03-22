import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";
import HeroBlock from "@/components/blocks/HeroBlock";
import CallToActionBlock from "@/components/blocks/CallToActionBlock";
import TextBlock from "@/components/blocks/RichTextBlock";
import ProductCardBlock from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock from "@/components/blocks/SectionHeadingBlock";

let initialized = false;

export function initComponentRegistry() {
  if (initialized) return;

  initReactComponentRegistry({
    resolver: {
      HeroBlock,
      Hero: HeroBlock,
      CallToAction: CallToActionBlock,
      TextBlock,
      ProductCardBlock,
      ProductHeroBlock,
      FeatureItemBlock,
      SectionHeadingBlock,
    },
  });

  initialized = true;
}
