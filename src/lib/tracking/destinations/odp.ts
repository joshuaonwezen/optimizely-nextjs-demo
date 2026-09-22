import { readCookie } from "../cookies";
import type { TrackingDestination } from "../types";
import { VISITOR_ID_COOKIE } from "@/lib/optimizely/cookieNames";

declare global {
  interface Window {
    zaius?: {
      entity: (type: string, attrs: Record<string, string>) => void;
      event: (type: string, props?: Record<string, unknown>) => void;
    };
  }
}

export const odpDestination: TrackingDestination = {
  name: "Data Platform (ODP)",
  send(event) {
    if (!window.zaius) return "skipped";
    window.zaius.event(event.key, { ...event.tags, fs_user_id: event.userId });
    return "sent";
  },
};

/**
 * Push known customer attributes to ODP, stitching them to the current
 * visitor's fs_user_id. Call this after a form submission yields an email
 * or other identifying data.
 */
/**
 * Write the visitor's content interests onto their ODP customer profile.
 *
 * The mb_content_viewed event already gives ODP a behavioural stream to build a
 * realtime segment from. This does the other half: `top_category` as a customer
 * ATTRIBUTE means a marketer can build an audience on a CMS taxonomy term from a
 * dropdown, with no engineering ticket and no event-stream rule.
 *
 * Requires `last_category` / `top_category` to exist on ODP's customers object. Most
 * accounts auto-create custom fields on first write; a strict-schema account needs
 * them added in the ODP UI first.
 */
export function recordTopCategory(topCategory: string | undefined, lastCategory: string | undefined): void {
  if (typeof window === "undefined" || !window.zaius) return;
  if (!topCategory && !lastCategory) return;
  identifyCustomer({ top_category: topCategory, last_category: lastCategory });
}

export function identifyCustomer(attrs: Record<string, string | undefined>): void {
  if (typeof window === "undefined" || !window.zaius) return;
  const fsUserId = readCookie(VISITOR_ID_COOKIE);
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v) payload[k] = v;
  }
  if (fsUserId) payload.fs_user_id = fsUserId;
  window.zaius.entity("customer", payload);
}
