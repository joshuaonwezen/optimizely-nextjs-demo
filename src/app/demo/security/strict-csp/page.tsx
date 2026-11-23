import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import CodeBlock from "@/components/demo/CodeBlock";
import InlineCode from "@/components/demo/InlineCode";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import SecurityCheck from "../SecurityCheck";

// The middleware mints a nonce per request, so this page can never be served from
// a cache: a cached copy would carry a nonce that no longer matches its header.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Strict CSP",
};

export default async function StrictCspPage() {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce");
  const policy = requestHeaders.get("content-security-policy") ?? "";

  return (
    <>
      <DemoHero
        title="Strict CSP"
        description="The same layout and third parties as the rest of the site, with no 'unsafe-inline' for scripts. Every inline script either carries this response's nonce or matches a hash."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">
        <section id="this-response">
          <DemoSectionHeading id="this-response">This response</DemoSectionHeading>
          <div className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-4 mb-6">
            <p>
              Nonce: <InlineCode>{nonce ?? "(none: the middleware did not run)"}</InlineCode>. Reload and it
              changes. Next reads it out of the request&apos;s CSP header and stamps it on its own inline scripts.
              The four inline scripts in the root layout (gtag, GTM, theme, ODP queue) never change, so the policy
              allows them by SHA-256 hash, and the layout never has to read the nonce. If it did, every page on the
              site would turn dynamic.
            </p>
            <p>
              The price is on this page: it renders on every request, and no CDN can cache it. That is why
              the rest of the site uses the allowlist policy described on{" "}
              <Link href="/demo/security#csp-tradeoffs" className="text-brand underline underline-offset-2">
                Security &amp; Trust
              </Link>
              .
            </p>
          </div>
          <CodeBlock code={policy.split("; ").join(";\n")} label="Content-Security-Policy (enforced)" language="text" />
        </section>

        <section id="live-check">
          <DemoSectionHeading id="live-check">Live check</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
            All three should come back blocked. Anything else in the violations list is a script this page
            loads that the strict policy does not allow, which is exactly what a report-only rollout is for
            finding. Expect a run of <InlineCode>script-src-elem</InlineCode> blocks from{" "}
            <InlineCode>gtm.js</InlineCode>: GTM writes its tags as inline scripts, and passes a nonce on to them
            only when the container is set up to read one. That is the usual first casualty of a strict policy.
          </p>
          <LiveDemoShell label="The strict policy, tested in your browser">
            <SecurityCheck />
          </LiveDemoShell>
        </section>
      </div>
    </>
  );
}
