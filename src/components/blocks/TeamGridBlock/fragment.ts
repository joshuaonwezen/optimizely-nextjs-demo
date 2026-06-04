export const TEAM_GRID_FRAGMENT = /* GraphQL */ `
  fragment TeamGridBlockData on TeamGridBlock {
    __typename
    _metadata { key version }
    heading
    subheading
    members {
      _metadata { key }
    }
  }
`;
