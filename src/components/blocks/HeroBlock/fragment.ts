export const HERO_BLOCK_FRAGMENT = /* GraphQL */ `
  fragment HeroBlockFields on HeroBlock {
    headline
    subheadline
    backgroundImage {
      _metadata { url { default } }
      ... on _Image {
        Url
        Renditions {
          Name
          Url
          Width
          Height
        }
      }
    }
    rendition
    ctaText
    ctaLink
  }
`;
