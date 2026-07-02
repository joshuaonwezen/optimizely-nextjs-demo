import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const webhookRouteTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/webhooks/route.ts"),
  "utf8"
);
const registerWebhookMjs = fs.readFileSync(
  path.join(process.cwd(), "scripts/register-webhook.mjs"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Webhooks & On-Demand Revalidation",
};

const FLOW_SNIPPET = `Editor clicks Publish in the CMS
        |
        v
CMS syncs the content item to Optimizely Graph
        |
        v
Graph finishes indexing and POSTs to every registered webhook:
  POST https://your-app.com/api/webhooks?secret=...
        |
        v
The route handler verifies the secret, then invalidates the ISR cache:
  revalidateTag("page")  revalidateTag("navigation")  ...
        |
        v
Next visitor request re-fetches from Graph and gets the new content

Without the webhook the site still updates - but only when each page's
ISR TTL (60s for pages, 300s for navigation) expires. The webhook makes
publishes visible in seconds instead of minutes.`;

const REGISTRATION_SNIPPET = `// scripts/register-webhook.mjs (run with: npm run webhook:register)
//
// Graph's webhook API authenticates with HTTP Basic auth using the
// OPTIMIZELY_APP_KEY / OPTIMIZELY_APP_SECRET pair (the same credentials
// used for the Content Source API - created in CMS Settings > API Keys).

const credentials = Buffer.from(\`\${APP_KEY}:\${APP_SECRET}\`).toString("base64");

await fetch("https://cg.optimizely.com/api/webhooks", {
  method: "POST",
  headers: {
    Authorization: \`Basic \${credentials}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    disabled: false,
    request: {
      // Graph only lets you control the URL, not custom headers - so the
      // shared secret rides along as a query parameter.
      url: "https://your-app.com/api/webhooks?secret=<OPTIMIZELY_REVALIDATE_SECRET>",
      method: "post",
    },
    topic: ["*.*"],   // all events; narrow to e.g. ["doc.updated"] if preferred
  }),
});

// List registered webhooks at any time:
//   curl -u '<app-key>:<app-secret>' https://cg.optimizely.com/api/webhooks`;

const PAYLOAD_SNIPPET = `// The three payload topics Graph sends:
//
//   bulk.completed  - Graph finished processing a content sync
//                     (fires after a publish, and after seed scripts run)
//   doc.updated     - a single content item was updated in the index
//   doc.expired     - a content item reached its StopPublish date
//
// Example doc.updated body:
{
  "timestamp": "2026-07-02T09:41:00Z",
  "tenantId": "...",
  "topic": "doc.updated",
  "subject": {
    "type": "doc",
    "event": "updated",
    "docId": "abc123_en_published"
  }
}`;

const RECEIVER_SNIPPET = `// src/app/api/webhooks/route.ts
export async function POST(request: NextRequest) {
  // 1. Verify the sender. Anyone who can POST here can flush the whole ISR
  //    cache, so the registered URL carries a shared secret. Deny by default.
  const secret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-revalidate-secret");

  if (secret !== process.env.OPTIMIZELY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Invalidate by tag. Every graphqlFetch in the app declares the tag its
  //    data belongs to ("page", "navigation", "banner", "quotes") - the
  //    webhook busts them all because any publish can affect any of them.
  revalidatePath("/", "layout");
  revalidateTag("page");
  revalidateTag("navigation");
  revalidateTag("banner");
  revalidateTag("quotes");

  return NextResponse.json({ received: true, timestamp: Date.now() });
}`;

const LOCAL_DEV_SNIPPET = `# Graph can't reach localhost - expose your dev server with a tunnel first:
npx ngrok http 3000          # or: cloudflared tunnel --url http://localhost:3000

# Then register the tunnel URL:
npm run webhook:register
# > Enter your public base URL: https://<random>.ngrok-free.app

# Test the receiver by hand (should be 401 without the secret):
curl -X POST http://localhost:3000/api/webhooks
curl -X POST "http://localhost:3000/api/webhooks?secret=$OPTIMIZELY_REVALIDATE_SECRET" \\
  -H "Content-Type: application/json" -d '{"topic":"doc.updated"}'`;

export default function WebhooksDemoPage() {
  return (
    <>
      <DemoHero
        title="Webhooks & On-Demand Revalidation"
        description={<>How Optimizely Graph tells this app that content changed - so a publish in the
            CMS shows up on the site in seconds, not when the ISR TTL happens to expire. Covers
            registration, payload types, the receiver route, and testing locally.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="flow">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The publish-to-revalidate loop
            <SectionAnchor id="flow" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every CMS query in this app is cached by Next.js ISR with a TTL and a named tag
            (see <Link href="/demo/caching" className="text-brand hover:underline font-medium">Caching</Link>).
            The webhook is the push half of that strategy: instead of waiting out the TTL, Graph
            notifies the app the moment its index changes and the app invalidates the affected tags.
          </p>
          <CodeBlock code={FLOW_SNIPPET} label="Publish flow, end to end" />
        </section>

        <section id="registration">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Registering a webhook
            <SectionAnchor id="registration" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Webhooks are registered against Graph&apos;s management endpoint with Basic auth
            (<code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_APP_KEY</code> /{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_APP_SECRET</code>).
            Registration controls only the URL and method - you can&apos;t attach custom headers - so this
            app appends its shared secret as a query parameter. The interactive script wraps this in a
            prompt for your public base URL.
          </p>
          <CodeBlock code={REGISTRATION_SNIPPET} label="POST https://cg.optimizely.com/api/webhooks" />
        </section>

        <section id="payloads">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Payload topics
            <SectionAnchor id="payloads" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph publishes three topics. This app subscribes to all of them
            (<code className="bg-surface-low px-1 rounded font-mono text-xs">topic: [&quot;*.*&quot;]</code>)
            and treats every event the same way - bust all content tags - because any publish can affect
            navigation labels, the banner, or page content. A larger site could switch on the topic and
            revalidate more surgically.
          </p>
          <CodeBlock code={PAYLOAD_SNIPPET} label="bulk.completed / doc.updated / doc.expired" />
        </section>

        <section id="receiver">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The receiver route
            <SectionAnchor id="receiver" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The handler does two things: verify the shared secret, then map the event to cache
            invalidations. Verification matters even on a demo - an unauthenticated receiver lets
            anyone repeatedly flush the ISR cache, forcing every request back to Graph. The tag names
            here are the same ones declared by each{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">graphqlFetch</code> call
            (<code className="bg-surface-low px-1 rounded font-mono text-xs">next: {"{ tags: [\"page\"] }"}</code>),
            which is what makes targeted busting possible.
          </p>
          <CodeBlock code={RECEIVER_SNIPPET} label="src/app/api/webhooks/route.ts" />
        </section>

        <section id="local-dev">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Testing locally
            <SectionAnchor id="local-dev" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Graph needs a public URL to deliver events, so local development requires a tunnel.
            You can also exercise the receiver directly with curl - useful for checking the 401
            path before registering anything.
          </p>
          <CodeBlock code={LOCAL_DEV_SNIPPET} label="Tunnel + manual testing" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Webhooks are the push half of the caching strategy.</strong> ISR TTLs guarantee eventual freshness; the webhook makes a publish visible in seconds.</>,
          <><strong className="text-on-surface">Registration is URL-only.</strong> Graph won&apos;t send custom headers, so authenticate the receiver with a secret in the registered URL&apos;s query string.</>,
          <><strong className="text-on-surface">Always verify the sender.</strong> An open receiver is a free cache-flush endpoint. Compare against OPTIMIZELY_REVALIDATE_SECRET and deny by default.</>,
          <><strong className="text-on-surface">Revalidate by tag, not by path.</strong> Tags declared on each graphqlFetch let one webhook bust exactly the queries a publish affects.</>,
          <><strong className="text-on-surface">Local dev needs a tunnel.</strong> Graph can&apos;t reach localhost - use ngrok or cloudflared, then re-run npm run webhook:register.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "api/webhooks/route.ts", path: "src/app/api/webhooks/route.ts", content: webhookRouteTs },
            { label: "register-webhook.mjs", path: "scripts/register-webhook.mjs", content: registerWebhookMjs },
          ]}
        />

      </div>
    </>
  );
}
