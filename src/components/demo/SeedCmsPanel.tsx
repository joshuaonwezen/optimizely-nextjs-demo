"use client";

import { useEffect, useRef, useState } from "react";
import { SEED_INSTANCES } from "@/lib/optimizely/seedInstances";

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
};

const FIELDS: FieldDef[] = [
  {
    name: "OPTIMIZELY_CMS_URL",
    label: "CMS URL",
    type: "text",
    placeholder: "https://app-<slug>.cms.optimizely.com",
  },
  {
    name: "OPTIMIZELY_CMS_CLIENT_ID",
    label: "CMS Client ID",
    type: "text",
    placeholder: "Content API key client ID",
  },
  {
    name: "OPTIMIZELY_CMS_CLIENT_SECRET",
    label: "CMS Client Secret",
    type: "password",
    placeholder: "Content API key client secret",
  },
  {
    name: "OPTIMIZELY_GRAPH_SINGLE_KEY",
    label: "Graph Single Key",
    type: "password",
    placeholder: "Graph single-key from CMS API Keys",
  },
  {
    name: "OPTIMIZELY_GRAPH_GATEWAY",
    label: "Graph Gateway",
    type: "text",
    placeholder: "https://cg.optimizely.com/content/v2",
  },
  {
    name: "OPTIMIZELY_ROOT_CONTAINER",
    label: "Root Container",
    type: "text",
    placeholder: "Optional - auto-discovered",
  },
  {
    name: "OPTIMIZELY_APP_KEY",
    label: "App Key",
    type: "password",
    placeholder: "Optional - Content Source API (quotes step)",
  },
  {
    name: "OPTIMIZELY_APP_SECRET",
    label: "App Secret",
    type: "password",
    placeholder: "Optional - Content Source API (quotes step)",
  },
];

export default function SeedCmsPanel() {
  const [instance, setInstance] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [log, setLog] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<"success" | "failure" | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function runSeed() {
    setRunning(true);
    setResult(null);
    setLog("");
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instance ? { instance } : values),
      });
      if (!res.ok || !res.body) {
        setLog(await res.text());
        setResult("failure");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setLog(full);
      }
      setResult(/\[seed\] exited with code 0/.test(full) ? "success" : "failure");
    } catch (err) {
      setLog((prev) => prev + `\n[client] ${(err as Error).message}`);
      setResult("failure");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div data-component="SeedCmsPanel" className="space-y-5">
      <label className="flex flex-col gap-1.5 max-w-sm">
        <span className="text-xs font-semibold text-on-surface">Instance</span>
        <select
          value={instance}
          onChange={(e) => setInstance(e.target.value)}
          disabled={running}
          className="bg-surface border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-on-surface"
        >
          <option value="">No instance - enter values manually</option>
          {SEED_INSTANCES.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-on-surface-variant">
          {instance
            ? "Credentials are resolved from .env.local on the server"
            : "Pick a stored instance, or fill in the fields below"}
        </span>
      </label>

      {!instance && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-on-surface">{field.label}</span>
            <input
              type={field.type}
              value={values[field.name] ?? ""}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={running}
              autoComplete="off"
              className="bg-surface border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50"
            />
            <span className="text-xs text-on-surface-variant">
              Leave blank to use the value from .env.local
            </span>
          </label>
        ))}
      </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={runSeed}
          disabled={running}
          className="bg-brand text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {running ? "Seeding... (takes several minutes)" : "Seed CMS"}
        </button>
        {result === "success" && (
          <span className="text-sm font-semibold text-green-600">Seed completed</span>
        )}
        {result === "failure" && (
          <span className="text-sm font-semibold text-red-600">Seed finished with errors</span>
        )}
      </div>

      {log && (
        <pre
          ref={logRef}
          className="font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto rounded-xl border border-ghost-border bg-surface-container-low p-4 text-on-surface-variant"
        >
          {log}
        </pre>
      )}
    </div>
  );
}
