export const FORM_CONTAINER_FRAGMENT = /* GraphQL */ `
  fragment FormContainerBlockData on FormContainerBlock {
    __typename
    _metadata { key version }
    heading
    description
    submitUrl { default }
    successMessage
  }
`;
