import {
  HERO_BLOCK_FRAGMENT,
  HERO_FRAGMENT,
  CALL_TO_ACTION_FRAGMENT,
  TEXT_BLOCK_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  PRODUCT_HERO_FRAGMENT,
  SECTION_HEADING_FRAGMENT,
} from "@/lib/graphql/fragments";

const COMPONENT_FRAGMENTS = `
  ...HeroBlockData
  ...HeroData
  ...CallToActionData
  ...TextBlockData
  ...ProductCardBlockData
  ...ProductHeroBlockData
  ...SectionHeadingBlockData
  ... on _Component { _json }
`;

const COMP_NODE = `
  ... on CompositionComponentNode {
    key
    type
    component {
      ${COMPONENT_FRAGMENTS}
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
 * Unknown component types (not yet in Graph schema) fall back to _Component._json.
 */
export const GET_PAGE_BY_URL_QUERY = /* GraphQL */ `
  ${HERO_BLOCK_FRAGMENT}
  ${HERO_FRAGMENT}
  ${CALL_TO_ACTION_FRAGMENT}
  ${TEXT_BLOCK_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_HERO_FRAGMENT}
  ${SECTION_HEADING_FRAGMENT}

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
                displayName
                nodes {
                  ${COMP_NODE}
                  ... on CompositionStructureNode {
                    key
                    displayName
                    nodes {
                      ${COMP_NODE}
                      ... on CompositionStructureNode {
                        key
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
