import { spawn } from "child_process";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 800;

const FIELDS = [
  "OPTIMIZELY_CMS_URL",
  "OPTIMIZELY_CMS_CLIENT_ID",
  "OPTIMIZELY_CMS_CLIENT_SECRET",
  "OPTIMIZELY_GRAPH_SINGLE_KEY",
  "OPTIMIZELY_GRAPH_GATEWAY",
  "OPTIMIZELY_ROOT_CONTAINER",
  "OPTIMIZELY_APP_KEY",
  "OPTIMIZELY_APP_SECRET",
] as const;

const REQUIRED = [
  "OPTIMIZELY_CMS_URL",
  "OPTIMIZELY_CMS_CLIENT_ID",
  "OPTIMIZELY_CMS_CLIENT_SECRET",
  "OPTIMIZELY_GRAPH_SINGLE_KEY",
  "OPTIMIZELY_GRAPH_GATEWAY",
];

// globalThis survives dev-server module reloads, so the lock holds across recompiles
const globals = globalThis as unknown as { __seedRunning?: boolean };

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Seeding is only available in local development.", { status: 403 });
  }
  if (globals.__seedRunning) {
    return new Response("A seed run is already in progress.", { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const suffix = body.instance === "onboarding" ? "_ONBOARDING" : "";

  // User-typed value wins; blank falls back to .env.local (suffixed, then base)
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of FIELDS) {
    const value = body[name]?.trim() || process.env[`${name}${suffix}`] || process.env[name];
    if (value) env[name] = value;
  }

  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    return new Response(`Missing required values: ${missing.join(", ")}`, { status: 400 });
  }

  globals.__seedRunning = true;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Always --instance=personal: the env above already resolved the instance,
      // and --instance=onboarding would clobber it with _ONBOARDING values
      const child = spawn("npx", ["tsx", "scripts/seed-runner.ts", "--instance=personal"], {
        cwd: process.cwd(),
        env,
        shell: false,
      });

      const write = (chunk: Buffer) => {
        try {
          controller.enqueue(encoder.encode(chunk.toString()));
        } catch {
          // stream already closed (client disconnected)
        }
      };
      child.stdout.on("data", write);
      child.stderr.on("data", write);

      request.signal.addEventListener("abort", () => child.kill("SIGTERM"));

      const finish = (line: string) => {
        globals.__seedRunning = false;
        try {
          controller.enqueue(encoder.encode(line));
          controller.close();
        } catch {
          // stream already closed
        }
      };
      child.on("close", (code) => finish(`\n[seed] exited with code ${code}\n`));
      child.on("error", (err) => finish(`\n[seed] failed to start: ${err.message}\n`));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
