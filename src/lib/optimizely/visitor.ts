import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { FxAttributes } from "./experimentation";

export type { FxAttributes };

export const getVisitorContext = cache(async (): Promise<{
  userId: string;
  attributes: FxAttributes;
  bucketingId?: string;
}> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const userId = cookieStore.get("optimizelyEndUserId")?.value ?? "anonymous";
  const ua = headerStore.get("user-agent") ?? "";
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  // Strip any :port so this matches window.location.hostname on the client.
  const hostname = (headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "").split(":")[0];
  const demoPersona = cookieStore.get("demo_persona")?.value;
  const bucketingId = cookieStore.get("demo_bucketing_id")?.value;
  const demoPageViews = cookieStore.get("demo_page_views")?.value;
  return {
    userId,
    attributes: {
      device,
      hostname,
      logged_in: !!bucketingId,
      ...(demoPersona ? { persona: demoPersona } : {}),
      ...(demoPageViews !== undefined ? { page_views: Number(demoPageViews) } : {}),
    },
    ...(bucketingId ? { bucketingId } : {}),
  };
});
