"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { getCurrentLocale, localizeHref } from "@/lib/localeUrl";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

export function FooterCtaClient() {
  const pathname = usePathname();
  const decision = useFxDecision("footer_cta");
  if (!decision?.enabled) return null;

  const ctaStyle = (decision.variables.style as string) || "app_download";

  return (
    <>
      <div className="border-b border-ghost-border">
        <div className="max-w-7xl mx-auto px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {ctaStyle === "open_account" ? (
            <>
              <div>
                <p className="font-display font-bold text-xl text-on-surface">Start earning today</p>
                <p className="text-sm text-on-surface-variant mt-1">Open an account in 3 minutes. No fees, no minimums.</p>
              </div>
              <Link
                href={localizeHref("/personal/checking", getCurrentLocale(pathname))}
                className="flex-shrink-0 px-6 py-3 rounded-full bg-brand text-on-brand text-sm font-semibold hover:bg-brand-dim transition-colors"
              >
                Open an account &rarr;
              </Link>
            </>
          ) : (
            <>
              <div>
                <p className="font-display font-bold text-xl text-on-surface">Bank on the go</p>
                <p className="text-sm text-on-surface-variant mt-1">Available on iOS and Android. 4.9★ rated.</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href="#"
                  className="px-5 py-2.5 rounded-xl bg-on-surface text-surface text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  App Store
                </a>
                <a
                  href="#"
                  className="px-5 py-2.5 rounded-xl bg-on-surface text-surface text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Google Play
                </a>
              </div>
            </>
          )}
        </div>
      </div>
      <FxBucketingEvent flagKey="footer_cta" />
    </>
  );
}
