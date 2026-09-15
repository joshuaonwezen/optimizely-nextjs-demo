import { getClient } from "@optimizely/cms-sdk";

// A type:"url" field pointing at internal content resolves to a
// cms://content/{key} reference, not a navigable path. Turn it into the target
// page's real URL; external URLs and already-resolved paths pass through.
// Returns undefined when empty so callers can hide the link.
export async function resolveLinkHref(
  link?: { default?: string | null; hierarchical?: string | null } | null,
): Promise<string | undefined> {
  const raw = link?.hierarchical ?? link?.default ?? null;
  if (!raw) return undefined;
  if (!raw.startsWith("cms://content/")) return raw;
  const key = raw.slice("cms://content/".length).split(/[?#]/)[0];
  // No next: { revalidate, tags } - getContent() routes through request(), which
  // forwards no Next.js fetch options, so the option was always discarded.
  const target: { _metadata?: { url?: { default?: string } } } | null = await getClient()
    .getContent({ key })
    .catch(() => null);
  return target?._metadata?.url?.default ?? undefined;
}
