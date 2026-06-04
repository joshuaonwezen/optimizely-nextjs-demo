export const TIMELINE_FRAGMENT = /* GraphQL */ `
  fragment TimelineBlockData on TimelineBlock {
    __typename
    _metadata { key version }
    heading
    subheading
    milestones {
      _metadata { key }
    }
  }
`;
