"use client";
import { useEffect, useState } from "react";
import { trackEvent, subscribe, type DispatchRecord } from "@/lib/tracking";

const MAX_LOG_ENTRIES = 8;

const STATUS_STYLES: Record<string, string> = {
  sent:    "bg-green-50 text-green-700 border-green-200",
  skipped: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-700 border-red-200",
};

function readCookie(name: string): string {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

export default function ConversionDemo() {
  const [userId, setUserId] = useState("");
  const [clicks, setClicks] = useState(0);
  const [log, setLog] = useState<DispatchRecord[]>([]);

  useEffect(() => {
    setUserId(readCookie("optimizelyEndUserId"));
    return subscribe((record) => {
      setLog((prev) => [record, ...prev].slice(0, MAX_LOG_ENTRIES));
    });
  }, []);

  return (
    <div data-component="ConversionDemo" className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setClicks((c) => c + 1);
            void trackEvent("demo_cta_click", { source: "demo-page", clickNumber: clicks + 1 });
          }}
          className="bg-gradient-brand text-on-brand text-sm font-semibold px-6 py-3 rounded-xl hover-lift transition-all"
        >
          Open a savings account
        </button>
        <div className="text-xs text-on-surface-variant space-y-1">
          <p>
            Conversions fired: <strong className="text-on-surface font-mono">{clicks}</strong>
          </p>
          <p>
            Visitor ID:{" "}
            <code className="bg-surface px-1 rounded font-mono">{userId || "(cookie not set yet)"}</code>
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-on-surface-variant mb-2">
          Live dispatch log - every trackEvent() call on this page, including the automatic{" "}
          <code className="bg-surface px-1 rounded font-mono">mb_*</code> events fired by AutoTracker
          as you scroll and navigate.
        </p>
        {log.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic">
            No events yet. Click the button above, or scroll the page to trigger{" "}
            <code className="bg-surface px-1 rounded font-mono">mb_scroll_depth</code>.
          </p>
        ) : (
          <ul className="space-y-2">
            {log.map((record) => (
              <li
                key={`${record.event.key}-${record.event.timestamp}`}
                className="bg-surface rounded-xl px-4 py-3 text-xs flex flex-wrap items-center gap-2"
              >
                <span className="font-mono font-semibold text-on-surface">{record.event.key}</span>
                {Object.keys(record.event.tags).length > 0 && (
                  <span className="font-mono text-on-surface-variant truncate max-w-60">
                    {JSON.stringify(record.event.tags)}
                  </span>
                )}
                <span className="ml-auto flex gap-1.5">
                  {record.results.map((r) => (
                    <span
                      key={r.destination}
                      className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[r.status]}`}
                    >
                      {r.destination}: {r.status}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-on-surface-variant border-t border-ghost-border pt-3">
        The log is fed by <code className="bg-surface px-1 rounded font-mono">subscribe()</code> from{" "}
        <code className="bg-surface px-1 rounded font-mono">src/lib/tracking</code> - an in-memory
        observer on the same fan-out that delivers to the real destinations. ODP shows{" "}
        <em>skipped</em> unless the zaius script is configured.
      </p>
    </div>
  );
}
