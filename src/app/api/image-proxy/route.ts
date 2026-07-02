const ALLOWED_HOSTS = [".cms.optimizely.com", ".cmp.optimizely.com"];

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  let srcUrl: URL | null = null;
  try { srcUrl = new URL(src); } catch {}
  if (
    !srcUrl ||
    srcUrl.protocol !== "https:" ||
    !ALLOWED_HOSTS.some((h) => srcUrl.hostname.endsWith(h))
  ) {
    return new Response("Forbidden", { status: 403 });
  }
  const upstream = await fetch(src);
  if (!upstream.ok) {
    return new Response("Upstream error", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
