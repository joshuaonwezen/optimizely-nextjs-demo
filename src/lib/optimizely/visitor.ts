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
  const demoPersona = cookieStore.get("demo_persona")?.value;
  const demoLoggedIn = cookieStore.get("demo_logged_in")?.value === "true";
  const bucketingId = cookieStore.get("demo_bucketing_id")?.value;
  return {
    userId,
    attributes: {
      device,
      logged_in: demoLoggedIn,
      ...(demoPersona ? { persona: demoPersona } : {}),
    },
    ...(bucketingId ? { bucketingId } : {}),
  };
});
