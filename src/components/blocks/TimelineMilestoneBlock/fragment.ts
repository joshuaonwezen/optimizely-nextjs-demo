export const TIMELINE_MILESTONE_FRAGMENT = /* GraphQL */ `
  fragment TimelineMilestoneBlockData on TimelineMilestoneBlock {
    __typename
    _metadata { key version }
    date
    title
    description
  }
`;
