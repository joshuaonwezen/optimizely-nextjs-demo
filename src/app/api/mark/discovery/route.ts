import { NextResponse } from "next/server";
import { markDiscoveryManifest } from "@/lib/mark/tools";

// The manifest Mark's Tool Registry reads when this URL is registered or synced.
// Public by design, like the Opal Tools SDKs' /discovery: it lists tool names and
// parameters only. The tools themselves need the registry entry's bearer token.
export async function GET() {
  return NextResponse.json(markDiscoveryManifest());
}
