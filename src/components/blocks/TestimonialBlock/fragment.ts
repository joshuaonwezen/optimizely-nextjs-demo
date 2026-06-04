// authorImage is intentionally omitted: its contentReference is declared
// with indexingType: "disabled" in the type definition, so Graph excludes
// it from the schema. The TestimonialBlock React component still reads
// authorImage when present (inline composition snapshots carry it), but
// any standalone Graph query for testimonial data must avoid the field.
export const TESTIMONIAL_FRAGMENT = /* GraphQL */ `
  fragment TestimonialBlockData on TestimonialBlock {
    __typename
    _metadata { key version }
    quote
    authorName
    authorRole
  }
`;
