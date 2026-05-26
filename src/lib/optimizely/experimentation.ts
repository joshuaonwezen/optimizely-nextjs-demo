import {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  eventDispatcher,
  OptimizelyDecideOption,
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
  const eventProcessor = createForwardingEventProcessor(eventDispatcher);
  return createInstance({ projectConfigManager, logger, eventProcessor }) ?? null;
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
  const d = ctx.decide(flagKey, [OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
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
  const raw = ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
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

/**
 * Fire a bare decide() for a flag so the SDK sends an impression event.
 * Call this when the flag's content is actually rendered — not during the
 * initial routing/bucketing pass where DISABLE_DECISION_EVENT is used.
 */
export async function bucketVisitor(
  flagKey: string,
  userId: string,
  attributes: FxAttributes = {}
): Promise<void> {
  const client = await buildClient();
  if (!client) return;
  const ctx = client.createUserContext(userId, attributes);
  if (!ctx) return;
  ctx.decide(flagKey);
}
