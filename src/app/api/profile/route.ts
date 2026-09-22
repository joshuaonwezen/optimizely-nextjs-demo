import { NextResponse } from "next/server";
import { getVisitorProfileWithSegments } from "@/lib/optimizely/profile";

// The shared visitor profile, for client components that cannot read it on the server
// without dropping their page out of ISR. `?fresh=1` bypasses the 5-min ODP fetch cache
// for the verification surfaces that must reflect current state.
//
// force-dynamic because the profile reads cookies. Do NOT add `export const runtime`:
// the build fails under experimental.useCache.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const profile = await getVisitorProfileWithSegments(fresh);
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "no-store" },
  });
}
