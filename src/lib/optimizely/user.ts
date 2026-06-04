import { cache } from "react";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyClient } from "./experimentation";
import type { FxDecision, FxAttributes } from "./experimentation";
import { getVisitorContext } from "./visitor";

type DecideOverrides = {
  bucketingId?: string;
  attributes?: FxAttributes;
};

const noDecision = (flagKey: string): FxDecision => ({
  flagKey,
  enabled: false,
  variationKey: null,
  variables: {},
  reasons: [],
});

const noOpUser = {
  userId: "anonymous" as string,
  bucketingId: undefined as string | undefined,
  decide: (flagKey: string, _options?: OptimizelyDecideOption[], _overrides?: DecideOverrides): FxDecision => noDecision(flagKey),
  decideAll: (): Record<string, FxDecision> => ({}),
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
    decide(
      flagKey: string,
      options: OptimizelyDecideOption[] = [OptimizelyDecideOption.DISABLE_DECISION_EVENT],
      overrides?: DecideOverrides
    ): FxDecision {
      const activeCtx = overrides?.bucketingId || overrides?.attributes
        ? client.createUserContext(userId, {
            ...attributes,
            ...overrides.attributes,
            ...(overrides.bucketingId ? { $opt_bucketing_id: overrides.bucketingId } : {}),
          }) ?? ctx
        : ctx;
      const d = activeCtx.decide(flagKey, options);
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
  };
});
