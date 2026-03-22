export const TEXT_BLOCK_FRAGMENT = /* GraphQL */ `
  fragment TextBlockData on TextBlock {
    __typename
    _metadata {
      key
      version
    }
    body {
      json
    }
  }
`;
