export const TESTIMONIAL_FRAGMENT = /* GraphQL */ `
  fragment TestimonialBlockData on TestimonialBlock {
    __typename
    _metadata { key version }
    quote
    authorName
    authorRole
  }
`;
