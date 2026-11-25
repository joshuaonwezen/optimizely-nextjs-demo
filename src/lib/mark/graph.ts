import "server-only";

const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

// Graph as super-user (App Key + Secret), the same access /preview/share uses.
// It returns every version whatever its status, which the Mark tools need: a
// page in review or a pending draft is not visible to the single key. Never
// cached, and Graph's own CDN is bypassed, because a draft changes by the minute.
export async function markGraph<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const appKey = process.env.OPTIMIZELY_APP_KEY;
  const appSecret = process.env.OPTIMIZELY_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("OPTIMIZELY_APP_KEY and OPTIMIZELY_APP_SECRET must be set for the Mark tools");
  }

  const url = new URL(GRAPH_ENDPOINT);
  url.searchParams.set("cache", "false");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  } | null;
  if (!response.ok || !body?.data || body.errors?.length) {
    const detail = body?.errors?.map((error) => error.message).join("; ") ?? "";
    throw new Error(`Graph request failed (${response.status}) ${detail}`.trim());
  }
  return body.data;
}
