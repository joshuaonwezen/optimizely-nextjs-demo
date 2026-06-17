"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface TocEntry {
  id: string;
  label: string;
}

export default function DemoTableOfContents() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Re-scan DOM on every route change (layout persists across navigations in App Router)
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    const found = sections
      .map((el) => {
        const h2 = el.querySelector("h2");
        if (!h2) return null;
        const clone = h2.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("a").forEach((a) => a.remove());
        const label = clone.textContent?.trim() ?? "";
        return label ? { id: el.id, label } : null;
      })
      .filter((e): e is TocEntry => e !== null);
    setEntries(found);
    setActiveId(null);
  }, [pathname]);

  useEffect(() => {
    if (entries.length === 0) return;
    observerRef.current?.disconnect();

    const intersectingIds = new Set<string>();
    observerRef.current = new IntersectionObserver(
      (records) => {
        records.forEach((entry) => {
          const id = (entry.target as HTMLElement).id;
          entry.isIntersecting ? intersectingIds.add(id) : intersectingIds.delete(id);
        });
        const first = entries.find((e) => intersectingIds.has(e.id));
        if (first) setActiveId(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    entries.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    history.pushState(null, "", `#${id}`);
  }

  return (
    <nav data-component="DemoTableOfContents" aria-label="On this page" className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 pb-0.5">
        On this page
      </p>
      <ul className="relative border-l-2 border-outline-variant/20 space-y-px">
        {entries.map(({ id, label }) => {
          const isActive = activeId === id;
          return (
            <li key={id} className="relative">
              {isActive && (
                <span className="absolute -left-0.5 inset-y-0 w-0.5 bg-brand rounded-full" />
              )}
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className={`block text-xs leading-snug py-1.5 pl-4 pr-1 rounded-r-lg transition-colors duration-150 truncate ${
                  isActive
                    ? "text-brand font-medium"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
