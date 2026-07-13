// Lists every version Graph currently returns for a content key. Run with the
// preview token so draft versions are visible - lets the preview overlay show
// whether Graph has indexed the version the editor is asking for.
export const PREVIEW_DIAGNOSTIC_QUERY = /* GraphQL */ `
  query PreviewDiagnostic($key: String) {
    _Content(where: { _metadata: { key: { eq: $key } } }, limit: 20) {
      total
      items {
        _metadata {
          key
          version
          status
          locale { name }
          variation
          displayName
        }
      }
    }
  }
`;
