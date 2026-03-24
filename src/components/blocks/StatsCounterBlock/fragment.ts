export const STATS_COUNTER_FRAGMENT = /* GraphQL */ `
  fragment StatsCounterBlockData on StatsCounterBlock {
    __typename
    _metadata { key version }
    value
    label
    suffix
  }
`;
