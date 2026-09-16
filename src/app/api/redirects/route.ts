import { NextResponse } from "next/server";
import { getRedirectRules } from "@/lib/graphql/queries/GetRedirectRules";

// Source of truth for the middleware redirect check. Middleware/proxy has no
// Data Cache, so it reads this route instead: route handlers DO cache the Graph
// call (tag CACHE_TAGS.redirects) and the Graph webhook (/api/webhooks) busts it on
// publish. Payload is a few small rows.
export const revalidate = 3600;

export async function GET() {
  const rules = await getRedirectRules();
  return NextResponse.json({ rules });
}
