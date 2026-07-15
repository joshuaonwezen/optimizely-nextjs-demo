"use client";

import { useEffect, useState } from "react";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";

const COLOR_CLASSES: Record<string, string> = {
  blue:   "bg-blue-600 text-white",
  green:  "bg-green-600 text-white",
  red:    "bg-red-600 text-white",
  purple: "bg-purple-600 text-white",
  amber:  "bg-amber-500 text-white",
};

const STYLE_MODIFIERS: Record<string, string> = {
  outline: "!bg-transparent border-2 border-current",
  filled:  "",
};

const DEFAULT_CLASS = "hover-lift font-display inline-block px-8 py-3.5 rounded-lg font-semibold bg-surface-lowest text-brand";

function getCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

interface Props {
  href?: string | null;
  label?: string | null;
  isEditMode?: boolean;
  ctaUrlDisplay?: string | null;
  paAttrs?: Record<string, string>;
  paUrlAttrs?: Record<string, string>;
}

export function ProductHeroCtaClient({ href, label, isEditMode, ctaUrlDisplay, paAttrs, paUrlAttrs }: Props) {
  const [ctaClass, setCtaClass] = useState(DEFAULT_CLASS);

  useEffect(() => {
    void (async () => {
      const userId = getCookie("optimizelyEndUserId");
      if (!userId) return;
      const client = await getOptimizelyBrowserClient();
      if (!client) return;
      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const demoPersona = getCookie("demo_persona");
      const bucketingId = getCookie("demo_bucketing_id");
      const ctx = client.createUserContext(userId, {
        device,
        hostname: window.location.hostname,
        logged_in: !!bucketingId,
        ...(demoPersona ? { persona: demoPersona } : {}),
      });
      const decision = ctx?.decide("add_to_cart", []); // fire bucketing event
      if (decision?.enabled) {
        const color = decision.variables.button_color as string;
        const style = decision.variables.button_style as string;
        const colorClass = COLOR_CLASSES[color] || "bg-surface-lowest text-brand";
        const styleMod = STYLE_MODIFIERS[style] || "";
        setCtaClass(`hover-lift font-display inline-block px-8 py-3.5 rounded-lg font-semibold ${colorClass} ${styleMod}`.trim());
      }
    })();
  }, []);

  return (
    <div data-component="ProductHeroCtaClient">
      <a href={isEditMode ? undefined : (href ?? undefined)} className={ctaClass}>
        <span {...paAttrs}>{label ?? "Learn More"}</span>
      </a>
      {isEditMode && (
        <p {...paUrlAttrs} className="mt-2 text-xs font-mono text-on-brand-subtle/70 cursor-pointer hover:text-on-brand-subtle transition-colors">
          {ctaUrlDisplay || "Click to set CTA URL…"}
        </p>
      )}
    </div>
  );
}
