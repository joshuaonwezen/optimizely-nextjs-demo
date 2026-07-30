"use client";

import { identifyCustomer as odpIdentify } from "./destinations/odp";
import { trackEvent } from "./index";

/**
 * Identify the current visitor as a known customer in ODP and emit a
 * tracking event. Call this after a form submission that provides an email.
 */
export function identifyCustomer(attrs: {
  email?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: string | undefined;
}): void {
  if (typeof window === "undefined") return;
  odpIdentify(attrs);
  trackEvent("mb_customer_identified", { has_email: attrs.email ? "true" : "false" });
}
