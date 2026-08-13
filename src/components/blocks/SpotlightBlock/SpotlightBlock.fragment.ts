export const SPOTLIGHT_BLOCK_FRAGMENT = /* GraphQL */ `
  fragment SpotlightBlockFields on spotlightBlock {
    person
    quote
    spacing
    textfield { html json }
    image {
      _metadata { url { default } }
    }
  }
`;
