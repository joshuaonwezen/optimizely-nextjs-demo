"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// True only after the component has mounted on the client. Lets a component
// defer `createPortal` (which needs `document`) without a setState-in-effect.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
