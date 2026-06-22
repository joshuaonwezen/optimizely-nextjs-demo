"use client";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

export default function RatesBar() {
  const decision = useFxDecision("rates_bar");
  if (!decision?.enabled) return null;

  const apy     = (decision.variables.apy     as string) || "";
  const product = (decision.variables.product as string) || "";
  if (!apy) return null; // control variation has empty apy

  const productLabel = product === "savings" ? "high-yield savings" : product;

  return (
    <>
      <div data-component="RatesBar" className="bg-surface-low border-y border-ghost-border">
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-on-surface-variant">
            Today&apos;s rate:{" "}
            <span className="font-semibold text-on-surface">{apy} APY</span>
            {" "}on {productLabel}
          </p>
          <a
            href="/personal/savings"
            className="text-sm font-semibold text-brand hover:underline flex-shrink-0"
          >
            Open a savings account &rarr;
          </a>
        </div>
      </div>
      <FxBucketingEvent flagKey="rates_bar" />
    </>
  );
}
