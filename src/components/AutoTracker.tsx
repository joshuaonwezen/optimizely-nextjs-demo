"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/tracking";

function parseTags(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function isOutbound(href: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("/")) return false;
  try {
    const url = new URL(href, window.location.origin);
    return url.host !== window.location.host;
  } catch {
    return false;
  }
}

export default function AutoTracker() {
  const pathname = usePathname();
  const scrollMarks = useRef(new Set<number>());
  const timeMarks = useRef(new Set<number>());
  const pageStart = useRef(Date.now());
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      const trackEl = target.closest("[data-track-event]") as HTMLElement | null;

      if (trackEl) {
        const key = trackEl.getAttribute("data-track-event")!;
        const tags = parseTags(trackEl.getAttribute("data-track-tags"));
        if (anchor && !("href" in tags)) (tags as Record<string, unknown>).href = anchor.getAttribute("href") ?? "";
        trackEvent(key, tags as Record<string, string | number | boolean>);
      }

      if (anchor) {
        const href = anchor.getAttribute("href") ?? "";
        if (isOutbound(href)) {
          trackEvent("mb_outbound_click", { href, label: anchor.textContent?.trim().slice(0, 120) ?? "" });
        }
      }
    }

    function onToggle(e: Event) {
      const el = e.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLDetailsElement)) return;
      const wrap = el.closest("[data-track-toggle]") as HTMLElement | null;
      if (!wrap) return;
      if (!el.open) return;
      const key = wrap.getAttribute("data-track-toggle")!;
      const tags = parseTags(wrap.getAttribute("data-track-tags"));
      const summary = el.querySelector("summary")?.textContent?.trim().slice(0, 200);
      if (summary && !("label" in tags)) (tags as Record<string, unknown>).label = summary;
      trackEvent(key, tags as Record<string, string | number | boolean>);
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLElement | null;
      if (!form) return;
      const wrap = form.closest("[data-track-submit]") as HTMLElement | null;
      if (!wrap) return;
      const key = wrap.getAttribute("data-track-submit")!;
      const tags = parseTags(wrap.getAttribute("data-track-tags"));
      trackEvent(key, tags as Record<string, string | number | boolean>);
    }

    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max <= 0) return;
      const pct = Math.round((window.scrollY / max) * 100);
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !scrollMarks.current.has(mark)) {
          scrollMarks.current.add(mark);
          trackEvent("mb_scroll_depth", { depth: mark, path: window.location.pathname });
        }
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    scrollMarks.current = new Set();
    timeMarks.current = new Set();
    pageStart.current = Date.now();

    if (pathname?.startsWith("/demo")) {
      trackEvent("mb_demo_page_view", { path: pathname });
    }

    const timers = [30, 60, 180].map((secs) =>
      window.setTimeout(() => {
        if (timeMarks.current.has(secs)) return;
        timeMarks.current.add(secs);
        trackEvent("mb_time_on_page", { seconds: secs, path: pathname ?? "" });
      }, secs * 1000)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [pathname]);

  return null;
}
