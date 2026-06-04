export const COMPARISON_TABLE_FRAGMENT = /* GraphQL */ `
  fragment ComparisonTableBlockData on ComparisonTableBlock {
    __typename
    _metadata { key version }
    heading
    subheading
    columns
    rows
  }
`;
