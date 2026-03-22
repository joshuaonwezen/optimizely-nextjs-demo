/**
 * Fetch all page URLs for static generation.
 * Used by generateStaticParams() in the catch-all route.
 */
export const GET_ALL_PAGE_PATHS_QUERY = /* GraphQL */ `
  query GetAllPagePaths {
    _Page(
      limit: 100
      where: { _metadata: { url: { default: { exist: true } } } }
    ) {
      items {
        _metadata {
          url {
            default
          }
          locale
        }
      }
    }
  }
`;
