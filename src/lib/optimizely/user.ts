import { cache } from "react";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyClient } from "./experimentation";
import type { FxDecision, FxAttributes } from "./experimentation";
import { getVisitorContext } from "./visitor";

type DecideOpts =
  | OptimizelyDecideOption[]
  | { options?: OptimizelyDecideOption[]; bucketingId?: string; attributes?: FxAttributes };

function resolveOpts(opts: DecideOpts | undefined): {
  sdkOptions: OptimizelyDecideOption[];
  bucketingId?: string;
  attributes?: FxAttributes;
} {
  if (!opts || Array.isArray(opts)) {
    return { sdkOptions: opts ?? [OptimizelyDecideOption.DISABLE_DECISION_EVENT] };
  }
  return {
    sdkOptions: opts.options ?? [OptimizelyDecideOption.DISABLE_DECISION_EVENT],
    bucketingId: opts.bucketingId,
    attributes: opts.attributes,
  };
}

const noDecision = (flagKey: string): FxDecision => ({
  flagKey, enabled: false, variationKey: null, variables: {}, reasons: [],
});

const noOpUser = {
  userId: "anonymous" as string,
  bucketingId: undefined as string | undefined,
  decide: (flagKey: string, _opts?: DecideOpts): FxDecision => noDecision(flagKey),
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
    decide(flagKey: string, opts?: DecideOpts): FxDecision {
      const { sdkOptions, bucketingId: bId, attributes: attrOverrides } = resolveOpts(opts);
      const activeCtx = bId || attrOverrides
        ? client.createUserContext(userId, {
            ...attributes,
            ...attrOverrides,
            ...(bId ? { $opt_bucketing_id: bId } : {}),
          }) ?? ctx
        : ctx;
      const d = activeCtx.decide(flagKey, sdkOptions);
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
