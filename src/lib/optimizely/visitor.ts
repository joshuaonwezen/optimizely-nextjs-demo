import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  buildFxAttributes,
  requestHost,
  DEMO_BUCKETING_ID_COOKIE,
  VISITOR_ID_COOKIE,
  type FxAttributes,
} from "./fxAttributes";

export type { FxAttributes };

export const getVisitorContext = cache(async (): Promise<{
  userId: string;
  attributes: FxAttributes;
  bucketingId?: string;
}> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const userId = cookieStore.get(VISITOR_ID_COOKIE)?.value ?? "anonymous";
  const bucketingId = cookieStore.get(DEMO_BUCKETING_ID_COOKIE)?.value;
  return {
    userId,
    attributes: buildFxAttributes({
      userAgent: headerStore.get("user-agent") ?? "",
      host: requestHost(headerStore),
      cookie: (name) => cookieStore.get(name)?.value,
    }),
    ...(bucketingId ? { bucketingId } : {}),
  };
});
