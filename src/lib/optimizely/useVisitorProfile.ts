"use client";

import { useCallback, useEffect, useState } from "react";
import { SEGMENT_EVENT } from "@/lib/segment";
import { emptyProfile, type VisitorProfile } from "./profileTypes";

// Client-side read of the shared visitor profile. A CMS page cannot read it on the
// server without dropping out of ISR (see the caching rule in profile.ts), so blocks
// and chrome that need it fetch /api/profile from the browser instead.
//
// One in-flight request per tab: concurrent callers share a promise rather than each
// firing their own request. The cached promise is cleared on every settle so the next
// revalidation actually refetches.

let inFlight: Promise<VisitorProfile> | null = null;

async function fetchProfile(fresh: boolean): Promise<VisitorProfile> {
  if (!fresh && inFlight) return inFlight;
  const request = fetch(`/api/profile${fresh ? "?fresh=1" : ""}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? (res.json() as Promise<VisitorProfile>) : emptyProfile()))
    .catch(() => emptyProfile())
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });
  if (!fresh) inFlight = request;
  return request;
}

export type UseVisitorProfile = {
  profile: VisitorProfile | null;
  loading: boolean;
  /** Refetch now. `fresh` also bypasses the 5-min ODP segment cache. */
  refresh: (fresh?: boolean) => void;
};

/**
 * `enabled: false` skips the request entirely. Callers mounted in the root layout use
 * it to avoid adding an /api/profile round trip to every page load for visitors who
 * cannot benefit from it.
 */
export function useVisitorProfile({ enabled = true }: { enabled?: boolean } = {}): UseVisitorProfile {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [loading, setLoading] = useState(enabled);
  // Bumping this re-runs the fetch effect. Kept as state rather than calling the
  // fetch directly so the effect body never calls setState synchronously.
  const [request, setRequest] = useState({ n: 0, fresh: false });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchProfile(request.fresh).then((next) => {
      if (cancelled) return;
      setProfile(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [request, enabled]);

  const refresh = useCallback((fresh = false) => {
    setLoading(true);
    setRequest((prev) => ({ n: prev.n + 1, fresh }));
  }, []);

  // The persona changes client-side (AutoTracker derives it from the path on every
  // navigation) with no server round trip, so without this the profile would show a
  // stale persona for the rest of the session.
  useEffect(() => {
    const onSegmentChange = () => refresh();
    window.addEventListener(SEGMENT_EVENT, onSegmentChange);
    return () => window.removeEventListener(SEGMENT_EVENT, onSegmentChange);
  }, [refresh]);

  return { profile, loading, refresh };
}
