export const HERO_BLOCK_FRAGMENT = /* GraphQL */ `
  fragment HeroBlockData on HeroBlock {
    __typename
    _metadata {
      key
      version
    }
    headline
    subheadline
    backgroundImage {
      _metadata {
        url {
          default
        }
      }
    }
    ctaText
    ctaLink
  }
`;

export const HERO_FRAGMENT = /* GraphQL */ `
  fragment HeroData on Hero {
    __typename
    _metadata {
      key
      version
    }
    heading
    summary
    theme
  }
`;
