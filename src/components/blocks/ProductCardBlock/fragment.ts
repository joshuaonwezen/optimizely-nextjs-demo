export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  fragment ProductCardBlockData on ProductCardBlock {
    __typename
    _metadata {
      key
      version
    }
    icon
    title
    description
    linkUrl {
      default
    }
    linkText
  }
`;
