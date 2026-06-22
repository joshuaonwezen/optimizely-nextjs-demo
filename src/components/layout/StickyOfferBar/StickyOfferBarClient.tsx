"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

export function StickyOfferBarClient() {
  const decision = useFxDecision("sticky_offer_bar");
  const message = (decision?.variables.message as string) || "";
  const linkText = (decision?.variables.linkText as string) || null;
  const linkUrl = (decision?.variables.linkUrl as string) || null;
  const expiryLabel = (decision?.variables.expiryLabel as string) || null;

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!message) return;
    if (!sessionStorage.getItem(`offer-dismissed:${message}`)) {
      setDismissed(false);
    }
  }, [message]);

  function dismiss() {
    sessionStorage.setItem(`offer-dismissed:${message}`, "1");
    setDismissed(true);
  }

  if (!decision?.enabled || !message) return null;
  if (dismissed) return <FxBucketingEvent flagKey="sticky_offer_bar" />;

  return (
    <>
    <div
      data-component="StickyOfferBar"
      className="fixed bottom-0 inset-x-0 z-40 bg-gradient-brand text-on-brand shadow-xl border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
        {expiryLabel && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 flex-shrink-0">
            &#9889; {expiryLabel}
          </span>
        )}
        <span className="flex-1 text-sm font-medium">{message}</span>
        {linkText && linkUrl && (
          <Link
            href={linkUrl}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold bg-surface-lowest text-brand hover:opacity-90 transition-opacity"
          >
            {linkText}
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss offer"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
    <FxBucketingEvent flagKey="sticky_offer_bar" />
    </>
  );
}
