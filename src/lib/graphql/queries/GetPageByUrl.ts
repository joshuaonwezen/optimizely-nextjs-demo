const DISPLAY_SETTINGS = `displayTemplateKey displaySettings { key value }`;

/**
 * All custom content types appear as _Component in Graph.
 * We use _json to get the full data and the composition node's `type`
 * field to determine which React component to render.
 */
const COMP_NODE = `
  ... on CompositionComponentNode {
    key
    type
    ${DISPLAY_SETTINGS}
    component {
      ... on _Component { _json }
    }
  }
`;

/**
 * Fetch a page by its URL from Optimizely Graph.
 *
 * The composition tree for Visual Builder experiences has this structure:
 * - Top-level: sectionEnabled components OR section nodes
 * - Sections contain rows, rows contain columns, columns contain elementEnabled components
 *
 * We query 4 levels deep to capture all possible component placements.
 */
export const GET_PAGE_BY_URL_QUERY = /* GraphQL */ `
  query GetPageByUrl($urls: [String], $locale: [Locales]) {
    _Page(
      locale: $locale
      where: { _metadata: { url: { default: { in: $urls } } } }
      limit: 5
    ) {
      items {
        __typename
        _metadata {
          key
          version
          displayName
          url {
            default
            hierarchical
          }
          locale
          published
        }
        ... on _IExperience {
          composition {
            grids: nodes {
              ${COMP_NODE}
              ... on CompositionStructureNode {
                key
                nodeType
                displayName
                ${DISPLAY_SETTINGS}
                nodes {
                  ${COMP_NODE}
                  ... on CompositionStructureNode {
                    key
                    nodeType
                    displayName
                    ${DISPLAY_SETTINGS}
                    nodes {
                      ${COMP_NODE}
                      ... on CompositionStructureNode {
                        key
                        nodeType
                        ${DISPLAY_SETTINGS}
                        nodes {
                          ${COMP_NODE}
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
