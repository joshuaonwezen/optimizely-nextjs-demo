export const SEARCH_RELEVANCE_QUERY = /* GraphQL */ `
  query SearchRelevance($query: String!, $locale: [Locales], $fuzzy: Boolean) {
    SEO(
      locale: $locale
      where: { _fulltext: { match: $query, synonyms: [ONE], fuzzy: $fuzzy } }
      orderBy: { _ranking: RELEVANCE }
      limit: 10
      pinned: { phrase: $query }
      tracking: { phrase: $query, source: "/search" }
    ) {
      total
      items {
        _track
        _score
        _metadata {
          displayName
          url { default }
        }
      }
    }
  }
`;

// Category filtering and faceting run on the CMS taxonomy (_itemMetadata.categories),
// not the legacy ArticlePage.category enum. Bucket names come back as term URIs
// (cms://taxonomy/categories/<key>); resolve labels with src/lib/taxonomy.ts.
// `tags` is a separate free-text axis and still uses the string array property.
export const SEARCH_FACETED_QUERY = /* GraphQL */ `
  query SearchFaceted($query: String!, $categories: [String], $tags: [String!], $locale: [Locales], $fuzzy: Boolean) {
    ArticlePage(
      locale: $locale
      where: {
        _fulltext: { match: $query, fuzzy: $fuzzy }
        _itemMetadata: { categories: { in: $categories } }
        tags: { in: $tags }
      }
      orderBy: { _ranking: RELEVANCE }
      limit: 10
      tracking: { phrase: $query, source: "/demo/listing" }
    ) {
      total
      items {
        _score
        category
        tags
        _itemMetadata { categories }
        _metadata {
          displayName
          url { default }
        }
      }
      facets {
        _itemMetadata {
          categories(orderType: COUNT, orderBy: DESC, limit: 20) { name count }
        }
        tags(orderType: COUNT, orderBy: DESC, limit: 12) { name count }
      }
    }
  }
`;

export const AUTOCOMPLETE_QUERY = /* GraphQL */ `
  query Autocomplete($value: String!) {
    ArticlePage {
      autocomplete {
        tags(limit: 5, value: $value)
      }
    }
    SEO {
      autocomplete {
        _metadata {
          url { default(limit: 6, value: $value) }
        }
      }
    }
  }
`;

export const SEARCH_SEMANTIC_QUERY = /* GraphQL */ `
  query SearchSemantic($query: String!, $weight: Float!, $locale: [Locales], $fuzzy: Boolean) {
    SEO(
      locale: $locale
      where: { _fulltext: { match: $query, synonyms: [ONE], fuzzy: $fuzzy } }
      orderBy: { _ranking: SEMANTIC, _semanticWeight: $weight }
      limit: 10
      pinned: { phrase: $query }
      tracking: { phrase: $query, source: "/search" }
    ) {
      total
      items {
        _track
        _score
        _metadata {
          displayName
          url { default }
        }
      }
    }
  }
`;
