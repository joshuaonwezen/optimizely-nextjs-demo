"use client";

import { usePathname } from "next/navigation";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { getCurrentLocale, localizeHref } from "@/lib/localeUrl";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { Button } from "@/components/ui/Button";

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
              <Button
                href={localizeHref("/personal/checking", getCurrentLocale(pathname))}
                pill
                size="compact"
                fontClassName=""
                className="flex-shrink-0"
              >
                Open an account &rarr;
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="font-display font-bold text-xl text-on-surface">Bank on the go</p>
                <p className="text-sm text-on-surface-variant mt-1">Available on iOS and Android. 4.9★ rated.</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button href="#" size="compact" fontClassName="" variant="custom" className="bg-on-surface text-surface hover:opacity-90">
                  App Store
                </Button>
                <Button href="#" size="compact" fontClassName="" variant="custom" className="bg-on-surface text-surface hover:opacity-90">
                  Google Play
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <FxBucketingEvent flagKey="footer_cta" />
    </>
  );
}
