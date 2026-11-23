import { type NextRequest } from "next/server";

const MAX_BODY_BYTES = 16 * 1024;

type Violation = {
  disposition?: string;
  directive?: string;
  blocked?: string;
  page?: string;
  source?: string;
  line?: number;
  sample?: string;
};

function withoutQuery(url: unknown): string | undefined {
  if (typeof url !== "string" || url === "") return undefined;
  return url.split(/[?#]/)[0];
}

function fromLegacy(report: Record<string, unknown>): Violation {
  return {
    disposition: report["disposition"] as string,
    directive: (report["effective-directive"] ?? report["violated-directive"]) as string,
    blocked: withoutQuery(report["blocked-uri"]),
    page: withoutQuery(report["document-uri"]),
    source: withoutQuery(report["source-file"]),
    line: report["line-number"] as number,
    sample: report["script-sample"] as string,
  };
}

function fromReportingApi(body: Record<string, unknown>): Violation {
  return {
    disposition: body.disposition as string,
    directive: body.effectiveDirective as string,
    blocked: withoutQuery(body.blockedURL),
    page: withoutQuery(body.documentURL),
    source: withoutQuery(body.sourceFile),
    line: body.lineNumber as number,
    sample: body.sample as string,
  };
}

function parse(payload: unknown): Violation[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r?.type === "csp-violation" && r.body && typeof r.body === "object")
      .map((r) => fromReportingApi(r.body));
  }
  const legacy = (payload as Record<string, unknown> | null)?.["csp-report"];
  return legacy && typeof legacy === "object" ? [fromLegacy(legacy as Record<string, unknown>)] : [];
}

function format(v: Violation): string {
  const source = v.source ? ` source=${v.source}${v.line ? `:${v.line}` : ""}` : "";
  const sample = v.sample ? ` sample=${JSON.stringify(v.sample.slice(0, 80))}` : "";
  return `[csp] ${v.disposition ?? "?"} ${v.directive ?? "?"} blocked=${v.blocked ?? "?"} page=${v.page ?? "?"}${source}${sample}`;
}

/**
 * Receives Content-Security-Policy violation reports (src/lib/security/csp.ts points
 * browsers here with `report-uri`) and logs one line per violation, so a report-only
 * rollout can be read from the Vercel runtime logs by filtering on "[csp]".
 *
 * Two body shapes are accepted:
 * - `application/csp-report`: what report-uri sends, one `{ "csp-report": {...} }`
 *   object with kebab-case fields.
 * - `application/reports+json`: the Reporting API (`report-to`), an array of
 *   `{ type: "csp-violation", body: {...} }` with camelCase fields. The policy does
 *   not use report-to today (csp.ts says why), but the route takes it if it ever does.
 *
 * Query strings are cut from every URL before logging: blocked image URLs carry
 * CMS preview tokens in edit mode, and page URLs can carry signed share links.
 * It logs with console.error because compiler.removeConsole strips every other
 * console method from the production build.
 */
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  try {
    for (const violation of parse(JSON.parse(text))) console.error(format(violation));
  } catch {
    // Malformed report: nothing to log, and the browser does not read the answer.
  }
  return new Response(null, { status: 204 });
}
