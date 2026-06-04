import { cache } from "react";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyClient } from "./experimentation";
import type { FxDecision } from "./experimentation";
import { getVisitorContext } from "./visitor";

const noDecision = (flagKey: string, _options: OptimizelyDecideOption[] = [OptimizelyDecideOption.DISABLE_DECISION_EVENT]): FxDecision => ({
  flagKey,
  enabled: false,
  variationKey: null,
  variables: {},
  reasons: [],
});

const noOpUser = {
  userId: "anonymous" as string,
  bucketingId: undefined as string | undefined,
  decide: noDecision,
  decideAll: (): Record<string, FxDecision> => ({}),
  decideWithBucketingId: (flagKey: string, _bucketingId: string, options: OptimizelyDecideOption[] = [OptimizelyDecideOption.DISABLE_DECISION_EVENT]): FxDecision => noDecision(flagKey, options),
};

export const getOptimizelyUser = cache(async () => {
  const [client, { userId, attributes, bucketingId }] = await Promise.all([
    getOptimizelyClient(),
    getVisitorContext(),
  ]);

  if (!client) return { ...noOpUser, userId, bucketingId };

  const ctx = client.createUserContext(userId, attributes);
  if (!ctx) return { ...noOpUser, userId, bucketingId };

  return {
    userId,
    bucketingId,
    decide(flagKey: string, options: OptimizelyDecideOption[] = [OptimizelyDecideOption.DISABLE_DECISION_EVENT]): FxDecision {
      const d = ctx.decide(flagKey, options);
      return {
        flagKey,
        enabled: d.enabled,
        variationKey: d.variationKey,
        variables: d.variables as Record<string, unknown>,
        reasons: d.reasons,
      };
    },
    decideAll(): Record<string, FxDecision> {
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
    },
    decideWithBucketingId(flagKey: string, bId: string, options: OptimizelyDecideOption[] = [OptimizelyDecideOption.DISABLE_DECISION_EVENT]): FxDecision {
      const fallback: FxDecision = { flagKey, enabled: false, variationKey: null, variables: {}, reasons: [] };
      const bCtx = client.createUserContext(userId, { ...attributes, $opt_bucketing_id: bId });
      if (!bCtx) return fallback;
      const d = bCtx.decide(flagKey, options);
      return {
        flagKey,
        enabled: d.enabled,
        variationKey: d.variationKey,
        variables: d.variables as Record<string, unknown>,
        reasons: d.reasons,
      };
    },
  };
});
