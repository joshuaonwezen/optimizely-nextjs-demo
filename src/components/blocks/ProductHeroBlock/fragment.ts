export const PRODUCT_HERO_FRAGMENT = /* GraphQL */ `
  fragment ProductHeroBlockData on ProductHeroBlock {
    __typename
    _metadata {
      key
      version
    }
    badge
    title
    description
    ctaText
    ctaUrl {
      default
    }
  }
`;
