export type TrackedEvent = {
  key: string;
  tags: Record<string, string | number | boolean>;
  userId: string;
  timestamp: number;
};

export type DeliveryStatus = "sent" | "skipped";

export type TrackingDestination = {
  name: string;
  send(event: TrackedEvent): DeliveryStatus | Promise<DeliveryStatus>;
};
