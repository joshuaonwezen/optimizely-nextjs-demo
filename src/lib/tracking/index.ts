"use client";

import { serializeVariations, whenVariationsSettled } from "./activeVariations";
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

  // Attribute the event to whatever variations are on screen, so FX, ODP and GA4 can
  // all segment by arm. Empty on a page that served none, and the param is then
  // omitted entirely rather than sent blank.
  //
  // The wait exists because above-the-fold components beat the datafile fetch: without
  // it, HeroBlock's view event goes out at ~11ms and the decisions land at ~229ms, so
  // the hero decision event was never attributed. Bounded, and it never drops an event.
  await whenVariationsSettled();
  const expVariantString = serializeVariations();

  const event: TrackedEvent = {
    key: eventKey,
    tags: expVariantString
      ? { ...cleanTags, exp_variant_string: expVariantString }
      : cleanTags,
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
