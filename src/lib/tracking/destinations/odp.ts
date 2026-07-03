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
