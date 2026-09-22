import "server-only";
import { cache } from "react";
import {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  createOdpManager,
  eventDispatcher,
  OptimizelyDecideOption,
  ERROR,
  type Client,
} from "@optimizely/optimizely-sdk";
import { fetchDatafile } from "./datafile";
import type { FxDecision } from "./experimentation";
import { getVisitorContext } from "./visitor";

// FX with its native ODP integration switched on, so an FX audience can target an
// ODP segment directly (ODP_SEGMENT conditions) instead of going through the
// hand-rolled ODP_SEGMENT_TO_VARIATION map in odp.ts.
//
// This is a PARALLEL factory on purpose. getOptimizelyClient() in experimentation.ts
// and getOptimizelyUser() in user.ts are untouched, so middleware, every existing
// server component and FxBucketingEvent keep behaving exactly as before.
//
// WHERE THIS MAY BE USED: route handlers, the dynamic homepage branch, /demo/* pages.
// NOT in src/middleware.ts - fetchQualifiedSegments() is an awaited HTTPS round trip
// to ODP, and middleware runs on every request including prefetches under a 3s budget.
// NOT in the browser - the zaius tag already owns browser-side ODP identity, and a
// second consumer would create two sources of truth for fs_user_id.
//
// The ODP API key and host come from the FX DATAFILE (the `integrations` entry written
// when ODP is enabled under FX project Settings -> Integrations), not from env vars, so
// no new credential is needed. With the integration off, fetchQualifiedSegments()
// simply resolves false and decide() still works normally.

export const getOdpAwareClient = cache(async function getOdpAwareClient(): Promise<Client | null> {
  const datafileText = await fetchDatafile();
  if (!datafileText) return null;
  return (
    createInstance({
      projectConfigManager: createStaticProjectConfigManager({ datafile: datafileText }),
      logger: createLogger({ level: ERROR }),
      eventProcessor: createForwardingEventProcessor(eventDispatcher),
      odpManager: createOdpManager({
        // Mirrors the 5-minute posture odp.ts already uses for segment reads.
        segmentsCacheTimeout: 300_000,
        // Hard ceiling: a slow ODP must never stall a render.
        segmentsApiTimeout: 2_000,
      }),
    }) ?? null
  );
});

export type SegmentAwareUser = {
  userId: string;
  /** ODP audiences this visitor qualifies for. Empty when the integration is off. */
  qualifiedSegments: string[];
  isQualifiedFor(segment: string): boolean;
  /** Impression-suppressed by default, matching getDecision() in experimentation.ts. */
  decide(flagKey: string, options?: OptimizelyDecideOption[]): FxDecision;
};

export const getSegmentAwareUser = cache(async function getSegmentAwareUser(): Promise<SegmentAwareUser | null> {
  const [client, { userId, attributes, bucketingId }] = await Promise.all([
    getOdpAwareClient(),
    getVisitorContext(),
  ]);
  if (!client || userId === "anonymous") return null;

  const ctx = client.createUserContext(userId, attributes);
  if (!ctx) return null;
  if (bucketingId) ctx.setAttribute("$opt_bucketing_id", bucketingId);

  // Resolves false when the ODP integration is off or the call fails. Either way we
  // fall through to an empty segment list rather than null, so callers need no
  // special-case branch.
  await ctx.fetchQualifiedSegments().catch(() => false);

  return {
    userId,
    qualifiedSegments: ctx.qualifiedSegments ?? [],
    isQualifiedFor: (segment: string) => ctx.isQualifiedFor(segment),
    decide(flagKey: string, options = [OptimizelyDecideOption.DISABLE_DECISION_EVENT]) {
      const d = ctx.decide(flagKey, options);
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
