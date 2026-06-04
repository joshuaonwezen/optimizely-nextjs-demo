export const AUTHOR_FRAGMENT = /* GraphQL */ `
  fragment AuthorBlockData on AuthorBlock {
    __typename
    _metadata { key version displayName }
    name
    role
    bio { json }
    avatar {
      _metadata { url { default } }
    }
    linkedinUrl
  }
`;
