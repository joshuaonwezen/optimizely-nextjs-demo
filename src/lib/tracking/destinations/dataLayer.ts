import type { TrackingDestination } from "../types";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const dataLayerDestination: TrackingDestination = {
  name: "dataLayer",
  send(event) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: event.key, userId: event.userId, ...event.tags });
    return "sent";
  },
};
