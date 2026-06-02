"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PERSONAS = [
  { key: "",             label: "Default" },
  { key: "personal",     label: "Personal Banking" },
  { key: "business",     label: "Business Banking" },
];

export default function AudienceSwitcher({ initialPersona }: { initialPersona: string }) {
  const [current, setCurrent] = useState(initialPersona);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentLabel = PERSONAS.find((p) => p.key === current)?.label ?? "Default";

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function select(key: string) {
    if (key === current || loading) return;
    setLoading(true);
    setOpen(false);
    await fetch("/api/demo/set-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: key }),
    });
    setCurrent(key);
    setLoading(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-xl overflow-hidden w-52">
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
            Audience
          </p>
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              onClick={() => select(p.key)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                p.key === current
                  ? "text-brand font-semibold bg-brand/5"
                  : "text-on-surface hover:bg-surface-low"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  p.key === current ? "bg-brand" : "bg-outline-variant"
                }`}
              />
              {p.label}
            </button>
          ))}
          <div className="px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant leading-snug">
              Sets <code className="font-mono">demo_persona</code> cookie to force a Graph variation.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 bg-surface-lowest border border-outline-variant rounded-full pl-3 pr-4 py-2 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-on-surface disabled:opacity-60"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-brand shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-on-surface-variant text-xs">Audience</span>
        <span>{loading ? "Switching…" : currentLabel}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
