import { type NextRequest, NextResponse } from "next/server";
import { isValidToolsBearer, markToolsConfigured } from "@/lib/mark/config";
import { findMarkTool } from "@/lib/mark/tools";

// One Mark (Agent Platform) tool call. Mark POSTs { parameters, auth, environment }
// with the Tool Registry entry's bearer token. Every tool here is read-only, but
// they return unpublished content, so nothing runs without that token.
export async function POST(request: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  if (!markToolsConfigured()) {
    return NextResponse.json({ error: "The Mark tools are not configured on this site." }, { status: 503 });
  }
  if (!isValidToolsBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tool: slug } = await params;
  const tool = findMarkTool(slug);
  if (!tool) return NextResponse.json({ error: `Unknown tool '${slug}'.` }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { parameters?: unknown } | null;
  const parameters = body?.parameters && typeof body.parameters === "object" ? body.parameters : (body ?? {});

  // A failure is returned as { error } with a 200 so the agent can read it and
  // react, instead of the run stopping on a transport error.
  try {
    return NextResponse.json(await tool.run(parameters as Record<string, unknown>));
  } catch (error) {
    console.error(`[mark] tool ${tool.name} failed:`, error);
    return NextResponse.json({ error: `${tool.name} failed: ${error instanceof Error ? error.message : "unknown error"}` });
  }
}
