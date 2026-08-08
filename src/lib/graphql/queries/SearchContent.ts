export const SEARCH_RELEVANCE_QUERY = /* GraphQL */ `
  query SearchRelevance($query: String!, $locale: [Locales]) {
    SEO(
      locale: $locale
      where: { _fulltext: { match: $query, synonyms: [ONE] } }
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

export const SEARCH_FACETED_QUERY = /* GraphQL */ `
  query SearchFaceted($query: String!, $categories: [String!], $tags: [String!], $locale: [Locales]) {
    ArticlePage(
      locale: $locale
      where: {
        _fulltext: { match: $query }
        category: { in: $categories }
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
        _metadata {
          displayName
          url { default }
        }
      }
      facets {
        category(orderType: COUNT, orderBy: DESC, limit: 10) { name count }
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
  query SearchSemantic($query: String!, $weight: Float!, $locale: [Locales]) {
    SEO(
      locale: $locale
      where: { _fulltext: { match: $query, synonyms: [ONE] } }
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
