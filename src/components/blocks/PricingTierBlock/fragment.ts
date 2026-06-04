export const PRICING_TIER_FRAGMENT = /* GraphQL */ `
  fragment PricingTierBlockData on PricingTierBlock {
    __typename
    _metadata { key version }
    name
    price
    period
    highlighted
    features
    ctaText
    ctaLink
  }
`;
