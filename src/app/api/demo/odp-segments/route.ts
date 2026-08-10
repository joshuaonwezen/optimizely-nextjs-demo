import { NextResponse } from "next/server";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import { queryAllQualifiedSegments, resolveVariationKey, ODP_SEGMENT_TO_VARIATION } from "@/lib/optimizely/odp";

// Live ODP membership for the current visitor, used by the Audience Switcher's verification
// panel. Reads the same optimizelyEndUserId the homepage render uses, queries ODP fresh
// (no 5-min cache), and reports EVERY qualified audience plus the one that resolves a variation.
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await getVisitorContext();
  if (userId === "anonymous") {
    return NextResponse.json({ userId, qualifiedSegments: [], mappedSegments: [], resolvedVariation: null });
  }
  const qualifiedSegments = await queryAllQualifiedSegments(userId, true);
  const mappedSegments = qualifiedSegments.filter((s) => s in ODP_SEGMENT_TO_VARIATION);
  const resolvedVariation = resolveVariationKey(qualifiedSegments) ?? null;
  return NextResponse.json({ userId, qualifiedSegments, mappedSegments, resolvedVariation });
}
