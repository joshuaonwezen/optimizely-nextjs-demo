import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

initComponentRegistry();

async function LandingPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = getClient();

  const items = await client.getContentByPath(`/en/landing/${slug}/`);
  const page = items[0] ?? null;

  if (!page) return notFound();

  return <OptimizelyComponent content={page} />;
}

export default withAppContext(LandingPageRoute);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = getClient();

  const items = await client.getContentByPath(`/en/landing/${slug}/`);
  const page = items[0] as any;

  return {
    title: page?._metadata?.displayName ?? "Landing Page",
  };
}
