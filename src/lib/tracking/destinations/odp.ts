import { readCookie } from "../cookies";
import type { TrackingDestination } from "../types";

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
export function identifyCustomer(attrs: Record<string, string | undefined>): void {
  if (typeof window === "undefined" || !window.zaius) return;
  const fsUserId = readCookie("optimizelyEndUserId");
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v) payload[k] = v;
  }
  if (fsUserId) payload.fs_user_id = fsUserId;
  window.zaius.entity("customer", payload);
}
