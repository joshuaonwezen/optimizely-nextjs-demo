import { graphqlFetch } from "@/lib/optimizely/client";

const GET_SUPPORTED_LOCALES_QUERY = /* GraphQL */ `
  query GetSupportedLocales {
    _SiteDefinition {
      items {
        Languages {
          DisplayName
          Name
        }
      }
    }
  }
`;

export interface SupportedLocale {
  code: string;
  label: string;
}

const FALLBACK: SupportedLocale[] = [
  { code: "en", label: "EN" },
  { code: "nl", label: "NL" },
];

export async function getSupportedLocales(): Promise<SupportedLocale[]> {
  try {
    const result = await graphqlFetch<{
      _SiteDefinition: {
        items: [{ Languages: { DisplayName: string; Name: string }[] }];
      };
    }>(GET_SUPPORTED_LOCALES_QUERY, undefined, {
      next: { revalidate: 300, tags: ["navigation"] },
    });
    const langs = result.data?._SiteDefinition?.items?.[0]?.Languages ?? [];
    if (langs.length > 0) {
      return langs.map((l) => ({ code: l.Name, label: l.DisplayName }));
    }
  } catch {
    // _SiteDefinition is not always available in all Graph deployments — use fallback silently
  }
  return FALLBACK;
}
