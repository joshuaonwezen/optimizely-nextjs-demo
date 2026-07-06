import { cache } from "react";
import {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  eventDispatcher,
  OptimizelyDecideOption,
  ERROR,
} from "@optimizely/optimizely-sdk";
import { fetchDatafile } from "./datafile";

export type FxAttributes = Record<string, string | number | boolean | null | undefined>;

export type FxDecision = {
  flagKey: string;
  enabled: boolean;
  variationKey: string | null;
  variables: Record<string, unknown>;
  reasons: string[];
};

// cache() memoises per request — all server components share one SDK instance.
export const getOptimizelyClient = cache(async function getOptimizelyClient() {
  // createStaticProjectConfigManager requires the datafile as a JSON string
  const datafileText = await fetchDatafile();
  if (!datafileText) return null;
  const projectConfigManager = createStaticProjectConfigManager({ datafile: datafileText });
  const logger = createLogger({ level: ERROR });
  const eventProcessor = createForwardingEventProcessor(eventDispatcher);
  return createInstance({ projectConfigManager, logger, eventProcessor }) ?? null;
});

export async function getDecision(
  flagKey: string,
  userId: string,
  attributes: FxAttributes = {}
): Promise<FxDecision> {
  const fallback: FxDecision = { flagKey, enabled: false, variationKey: null, variables: {}, reasons: [] };
  const client = await getOptimizelyClient();
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
