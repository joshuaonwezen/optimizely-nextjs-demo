export const TEAM_MEMBER_FRAGMENT = /* GraphQL */ `
  fragment TeamMemberBlockData on TeamMemberBlock {
    __typename
    _metadata { key version }
    name
    role
    bio
    linkedinUrl { default }
    photo {
      url { default }
    }
  }
`;
