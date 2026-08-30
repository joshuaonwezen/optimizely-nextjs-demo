"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ODP cross-session personalization: if the visitor abandoned the contact form on an earlier
// visit (ODP real-time audience `abandoned_contact_form`, built on mb_form_abandon), greet them
// with a "pick up where you left off" nudge. The membership check runs client-side against the
// existing /api/demo/odp-segments endpoint so the rest of the site stays static/ISR - only the
// homepage reads ODP server-side today.
const RECOVERY_SEGMENT = "abandoned_contact_form";
const CONTACT_URL = "/en/help/contact";
const DISMISS_KEY = "mb_recovery_dismissed";

export default function OdpRecoveryBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // sessionStorage unavailable - fall through and let the fetch decide
    }

    let cancelled = false;
    fetch("/api/demo/odp-segments", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { qualifiedSegments?: string[] }) => {
        if (!cancelled && (data.qualifiedSegments ?? []).includes(RECOVERY_SEGMENT)) {
          setShow(true);
        }
      })
      .catch(() => {
        // ODP unreachable / not configured - simply show nothing
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore - dismissal just won't persist across pages
    }
  }

  if (!show) return null;

  return (
    <div
      data-component="OdpRecoveryBanner"
      className="bg-brand text-on-brand"
      role="region"
      aria-label="Continue your enquiry"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center gap-3 text-sm">
        <span className="font-medium">Still thinking it over?</span>
        <span className="hidden sm:inline text-on-brand/90">
          Pick up your enquiry where you left off.
        </span>
        <Link
          href={CONTACT_URL}
          className="ml-auto shrink-0 underline underline-offset-2 font-semibold hover:no-underline"
        >
          Finish your enquiry →
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-on-brand/80 hover:text-on-brand text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
