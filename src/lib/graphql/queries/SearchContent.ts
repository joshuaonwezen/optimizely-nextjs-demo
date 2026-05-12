export const SEARCH_RELEVANCE_QUERY = /* GraphQL */ `
  query SearchRelevance($query: String!) {
    _Page(
      where: { _fulltext: { match: $query } }
      orderBy: { _ranking: RELEVANCE }
      limit: 10
    ) {
      total
      items {
        _score
        _metadata {
          displayName
          url { default }
        }
      }
    }
  }
`;

export const SEARCH_SEMANTIC_QUERY = /* GraphQL */ `
  query SearchSemantic($query: String!) {
    _Page(
      where: { _fulltext: { match: $query } }
      orderBy: { _ranking: SEMANTIC, _semanticWeight: 0.5 }
      limit: 10
    ) {
      total
      items {
        _score
        _metadata {
          displayName
          url { default }
        }
      }
    }
  }
`;
