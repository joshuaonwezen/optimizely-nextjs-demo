import {
  createInstance,
  createStaticProjectConfigManager,
  createLogger,
  ERROR,
} from "@optimizely/optimizely-sdk";

const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.OPTIMIZELY_FX_SDK_KEY}.json`;

export type FxAttributes = Record<string, string | number | boolean | null | undefined>;

export type FxDecision = {
  flagKey: string;
  enabled: boolean;
  variationKey: string | null;
  variables: Record<string, unknown>;
  reasons: string[];
};

async function buildClient() {
  const res = await fetch(DATAFILE_URL, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  // SDK v5 createStaticProjectConfigManager requires the datafile as a JSON string
  const datafileText = await res.text();
  const projectConfigManager = createStaticProjectConfigManager({ datafile: datafileText });
  const logger = createLogger({ level: ERROR });
  return createInstance({ projectConfigManager, logger }) ?? null;
}

export async function getDecision(
  flagKey: string,
  userId: string,
  attributes: FxAttributes = {}
): Promise<FxDecision> {
  const fallback: FxDecision = { flagKey, enabled: false, variationKey: null, variables: {}, reasons: [] };
  const client = await buildClient();
  if (!client) return fallback;
  const ctx = client.createUserContext(userId, attributes);
  if (!ctx) return fallback;
  const d = ctx.decide(flagKey);
  return {
    flagKey,
    enabled: d.enabled,
    variationKey: d.variationKey,
    variables: d.variables as Record<string, unknown>,
    reasons: d.reasons,
  };
}

export async function getAllDecisions(
  userId: string,
  attributes: FxAttributes = {}
): Promise<Record<string, FxDecision>> {
  const client = await buildClient();
  if (!client) return {};
  const ctx = client.createUserContext(userId, attributes);
  if (!ctx) return {};
  const raw = ctx.decideAll();
  const out: Record<string, FxDecision> = {};
  for (const [key, d] of Object.entries(raw)) {
    out[key] = {
      flagKey: key,
      enabled: d.enabled,
      variationKey: d.variationKey,
      variables: d.variables as Record<string, unknown>,
      reasons: d.reasons,
    };
  }
  return out;
}
