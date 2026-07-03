"use client";

import { getVisitorId } from "./cookies";
import { dataLayerDestination } from "./destinations/dataLayer";
import { fxDestination } from "./destinations/fx";
import { odpDestination } from "./destinations/odp";
import type { TrackedEvent, TrackingDestination } from "./types";

export type { TrackedEvent, TrackingDestination } from "./types";

export type DispatchResult = {
  destination: string;
  status: "sent" | "skipped" | "error";
};

export type DispatchRecord = {
  event: TrackedEvent;
  results: DispatchResult[];
};

const destinations: TrackingDestination[] = [
  fxDestination,
  odpDestination,
  dataLayerDestination,
];

type Listener = (record: DispatchRecord) => void;
const listeners = new Set<Listener>();

export function registerDestination(destination: TrackingDestination): void {
  if (!destinations.some((d) => d.name === destination.name)) {
    destinations.push(destination);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function trackEvent(
  eventKey: string,
  tags?: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  if (typeof window === "undefined") return;

  const cleanTags: Record<string, string | number | boolean> = {};
  if (tags) {
    for (const [k, v] of Object.entries(tags)) {
      if (v === undefined || v === null) continue;
      cleanTags[k] = v;
    }
  }

  const event: TrackedEvent = {
    key: eventKey,
    tags: cleanTags,
    userId: getVisitorId(),
    timestamp: Date.now(),
  };

  // Every destination gets the event; one failing sink never blocks the others.
  const results = await Promise.all(
    destinations.map(async (destination): Promise<DispatchResult> => {
      try {
        const status = await destination.send(event);
        return { destination: destination.name, status };
      } catch {
        return { destination: destination.name, status: "error" };
      }
    })
  );

  for (const listener of listeners) {
    try {
      listener({ event, results });
    } catch {
      // Tracking must never break the page.
    }
  }
}
