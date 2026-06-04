// Note: avatar is excluded — its contentReference has indexingType: "disabled"
// in the type definition (intentional, to keep the search index lean for what
// is essentially decorative imagery), so Graph rejects the field. Author
// avatars only render when the AuthorBlock is dropped inline into a
// composition, where the data comes from the composition snapshot rather
// than from Graph.
export const AUTHOR_FRAGMENT = /* GraphQL */ `
  fragment AuthorBlockData on AuthorBlock {
    __typename
    _metadata { key version displayName }
    name
    role
    bio { json }
    linkedinUrl { default }
  }
`;
