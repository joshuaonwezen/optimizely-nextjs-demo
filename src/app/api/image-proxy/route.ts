const ALLOWED_HOSTS = [".cms.optimizely.com", ".cmp.optimizely.com"];

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  let srcHostname = "";
  try { srcHostname = new URL(src).hostname; } catch {}
  if (!ALLOWED_HOSTS.some((h) => srcHostname.endsWith(h))) {
    return new Response("Forbidden", { status: 403 });
  }
  const upstream = await fetch(src);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
