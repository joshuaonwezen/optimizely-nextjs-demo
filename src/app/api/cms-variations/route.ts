import { NextResponse } from "next/server";
import { getCmsVariationNames } from "@/lib/graphql/queries/GetCmsVariationNames";

// Source of truth for the middleware WX segment check. Middleware has no Data Cache,
// so it reads this route instead: route handlers DO cache the Graph call (tag
// CACHE_TAGS.page) and /api/webhooks busts it on publish. Same arrangement, and same
// reason, as /api/redirects. Payload is a short list of names.
export const revalidate = 3600;

export async function GET() {
  const names = await getCmsVariationNames();
  return NextResponse.json({ names });
}
