import { spawn } from "child_process";
import type { NextRequest } from "next/server";
import { SEED_INSTANCES } from "@/lib/optimizely/seedInstances";

export const runtime = "nodejs";
// Vercel hobby plan caps maxDuration at 300; the route 403s in production anyway
export const maxDuration = 300;

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

  const env: NodeJS.ProcessEnv = { ...process.env };
  let missing: string[] = [];

  if (body.instance) {
    // Named instance: resolve all credentials server-side from the suffixed
    // .env.local vars; the form fields are ignored.
    const instance = SEED_INSTANCES.find((i) => i.id === body.instance);
    if (!instance) {
      return new Response(`Unknown instance: ${body.instance}`, { status: 400 });
    }
    for (const name of FIELDS) {
      // The Graph gateway is shared across instances; everything else must come
      // from the suffixed var - never fall back to another instance's keys.
      const shared = name === "OPTIMIZELY_GRAPH_GATEWAY";
      const value =
        process.env[`${name}${instance.suffix}`] || (shared ? process.env[name] : undefined);
      if (value) env[name] = value;
      else delete env[name];
    }
    missing = REQUIRED.filter((name) => !env[name]).map((name) =>
      name === "OPTIMIZELY_GRAPH_GATEWAY" ? name : `${name}${instance.suffix}`
    );
  } else {
    // Manual path: user-typed value wins; blank falls back to .env.local
    for (const name of FIELDS) {
      const value = body[name]?.trim() || process.env[name];
      if (value) env[name] = value;
    }
    missing = REQUIRED.filter((name) => !env[name]);
  }

  if (missing.length > 0) {
    return new Response(`Missing required values: ${missing.join(", ")}`, { status: 400 });
  }

  globals.__seedRunning = true;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // env above is already resolved from .env.local + form inputs; the runner
      // just inherits it and seeds whatever OPTIMIZELY_CMS_URL points to
      const child = spawn("npx", ["tsx", "scripts/seed-runner.ts"], {
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
