export const CALLOUT_BLOCK_FRAGMENT = /* GraphQL */ `
  fragment CalloutBlockData on CalloutBlock {
    __typename
    _metadata {
      key
      version
    }
    variant
    label
    body {
      json
    }
  }
`;
