import { cache } from "react";
import { cookies } from "next/headers";
import type { FxAttributes } from "./experimentation";

export type { FxAttributes };

export const getVisitorContext = cache(async (): Promise<{
  userId: string;
  attributes: FxAttributes;
}> => {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";
  const demoPersona = cookieStore.get("demo_persona")?.value;
  const demoLoggedIn = cookieStore.get("demo_logged_in")?.value === "true";
  return {
    userId,
    attributes: {
      device,
      logged_in: demoLoggedIn,
      ...(demoPersona ? { persona: demoPersona } : {}),
    },
  };
});
