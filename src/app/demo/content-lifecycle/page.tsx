import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";

export const metadata: Metadata = {
  title: "Content Lifecycle",
};

const STATE_MACHINE_SNIPPET = `# CMS editorial state machine
#
# ┌─────────┐   Edit    ┌────────────┐  Request review  ┌───────────┐
# │ (none)  │ ────────> │   Draft    │ ──────────────> │ In Review │
# └─────────┘           └────────────┘                  └───────────┘
#                             ↑ Reject                        │ Approve
#                             └──────────────────────────────┘
#                                                             ↓
#              ┌──────────────┐  startPublish date   ┌───────────────┐
#              │  Scheduled   │ <──────────────────── │   Approved    │
#              └──────────────┘    (future date set)  └───────────────┘
#                     │                                      │ Publish now
#                     │ Date arrives                         ↓
#                     └─────────────────────────────> ┌───────────────┐
#                                                      │   Published   │
#                                                      └───────────────┘
#                                                             │
#                                               stopPublish   │  date arrives
#                                                             ↓
#                                                      ┌─────────────┐
#                                                      │   Expired   │
#                                                      └─────────────┘
#
# Only Published items are visible in Optimizely Graph queries.
# Draft, In Review, Approved, and Scheduled items are invisible to public queries.
# Expired items are also removed from Graph results.`;

const SCHEDULED_FIELDS_SNIPPET = `// startPublish and stopPublish are built-in fields on every content type.
// Editors set them in the CMS - no custom property definition needed.

// startPublish - the item goes live on this date (status → Published)
// stopPublish  - the item expires on this date  (status → Expired → removed from Graph)

// In the Graph schema - these are on _IContent._metadata:
query GetPageWithSchedule {
  LandingPage(limit: 5) {
    items {
      _metadata {
        published    # date the current version was last published
        changed      # date the content was last saved (any state)
        url { default }
      }
    }
  }
}

// Note: Graph does not expose startPublish or stopPublish in queries -
// they are CMS-side scheduling fields, not indexed delivery fields.
// The effect is that items simply appear or disappear from Graph results.`;

const GRAPH_VISIBILITY_SNIPPET = `// Graph only returns Published items. Other states are invisible.
//
// This means:
//   - A Scheduled item won't appear in queries until its startPublish date
//   - Calling notFound() is correct for Approved-but-not-yet-published items
//     (they don't exist in Graph yet - the URL returning 404 is expected)
//   - An Expired item disappears from results after stopPublish without any app code
//
// You do NOT need to filter by status in your queries - Graph handles it.
// Published = visible. Everything else = invisible.

// ✅ This is all you need - no status filter required:
query GetPage($url: String!) {
  _Content(where: { _metadata: { url: { default: { eq: $url } } } }) {
    items { ... }
  }
}

// ❌ This would be wrong - "status" is not a Graph filter field:
_Content(where: { _metadata: { status: { eq: "Published" } } })   // doesn't exist`;

const PREVIEW_SCHEDULED_SNIPPET = `// How to preview content before its startPublish date arrives.
//
// The CMS generates a preview token when an editor clicks "Preview" in Visual Builder.
// This token is scoped to that editor's session and bypasses the Published filter -
// it returns Draft, In Review, Approved, and Scheduled content.
//
// In the catch-all route, getContentByPath with a previewToken fetches draft content:

// src/app/preview/page.tsx
import { getPreviewContent } from "@optimizely/cms-sdk/server";

export default async function PreviewPage({ searchParams }) {
  const { token, url } = searchParams;

  if (!token) redirect("/");

  const content = await getPreviewContent(url, { previewToken: token });
  if (!content) redirect(\`/en\${url}\`);

  return <OptimizelyComponent content={content} />;
}

// An editor can preview a Scheduled item at any time before startPublish.
// The preview URL contains the token - share it with reviewers for approval.`;

const WEBHOOK_EVENTS_SNIPPET = `// Webhook events tied to the content lifecycle
// Register these endpoints in CMS Settings → Events

// CMS publish webhook (POST /api/publish):
// Fires when any content item is published - status → Published.
// Use this to invalidate ISR caches immediately on publish.
revalidatePath("/", "layout");
revalidateTag("navigation");
revalidateTag("banner");

// Graph webhook (POST /api/webhooks):
// Fires when Graph finishes indexing a change (slightly after the CMS publish).
// Use this for fine-grained revalidation when you know which path changed.
// Payload types:
//   "bulk.completed"  - Graph sync finished (all changes indexed)
//   "doc.updated"     - a single item was updated in Graph's index
//   "doc.expired"     - an item reached its stopPublish date and was removed

// Responding to doc.expired:
if (body.type === "doc.expired") {
  const url = body.data?.url;
  if (url) revalidatePath(url);     // bust the ISR cache for the expired URL
  revalidatePath("/", "layout");    // in case it appeared in listing pages
}`;

const APPROVAL_HOOKS_SNIPPET = `// Approval workflow automation - webhook on status change
//
// Register a webhook in CMS Settings → Events → "Content Status Changed".
// Useful for: Slack notifications, CI step triggers, downstream sync.

// POST /api/content-status-changed
// Body: { contentKey, url, status, locale, updatedBy }

export async function POST(request: NextRequest) {
  const { contentKey, url, status, updatedBy } = await request.json();

  if (status === "InReview") {
    // Notify reviewers in Slack
    await notifySlack({
      text: \`📝 \${updatedBy} submitted \${url} for review\`,
      channel: "#content-review",
    });
  }

  if (status === "Published") {
    // Trigger a downstream sync (e.g. push to a CDN edge config)
    await triggerEdgeSync({ contentKey, url });
  }

  return NextResponse.json({ received: true });
}`;

const VERSION_HISTORY_SNIPPET = `// Content versioning - every save creates a new version.
// The Management API exposes version history for a content item.

const token   = await getManagementToken();
const ENDPOINT = \`\${process.env.OPTIMIZELY_CMS_URL}/preview3/experimental/content\`;

// List all versions of an item:
const res = await fetch(\`\${ENDPOINT}/\${key}/versions\`, {
  headers: { Authorization: \`Bearer \${token}\` },
  cache: "no-store",
});
const versions = await res.json();
// versions = [{ version: 3, status: "published", created: "...", ... }, ...]

// Publish a specific older version (rollback):
await fetch(\`\${ENDPOINT}/\${key}/versions/\${version}\`, {
  method: "PATCH",
  headers: {
    Authorization:  \`Bearer \${token}\`,
    "Content-Type": "application/merge-patch+json",
  },
  body: JSON.stringify({ locale: "en", status: "published" }),
  cache: "no-store",
});`;

export default function ContentLifecycleDemoPage() {
  return (
    <>
      <DemoHero
        title="Content Lifecycle"
        description="The editorial state machine - Draft, Scheduled, Published, Expired - how each state affects Graph queries, ISR caches, and what the app needs to handle."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="state-machine">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The editorial state machine
            <SectionAnchor id="state-machine" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Content in Optimizely CMS moves through a series of states from creation to expiry.
            The state controls who can edit it, whether it appears in Graph queries, and what
            webhook events fire. From the app&apos;s perspective, only one state matters -{" "}
            <strong>Published</strong>.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/4-create-content.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <CodeBlock code={STATE_MACHINE_SNIPPET} label="State transitions - only Published is visible in Graph" />

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { state: "Draft", visible: false, desc: "Editor is working on it. Not visible in Graph. Can be previewed with a preview token." },
              { state: "In Review / Approved", visible: false, desc: "Awaiting editorial approval. Not visible in Graph. Can be previewed. URL returns 404 to public visitors." },
              { state: "Scheduled", visible: false, desc: "Approved with a future startPublish date. Not visible in Graph yet. Automatically publishes when the date arrives." },
              { state: "Published", visible: true, desc: "Live - appears in all Graph queries. ISR cache is warm. Webhook fires on publish to bust stale caches." },
              { state: "Expired", visible: false, desc: "stopPublish date was reached. Automatically removed from Graph results. doc.expired webhook fires." },
            ].map(({ state, visible, desc }) => (
              <div key={state} className={`bg-surface-lowest rounded-2xl p-5 border ${visible ? "border-green-200" : "border-ghost-border"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold ${visible ? "text-green-700" : "text-on-surface"}`}>{state}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${visible ? "bg-green-100 text-green-700" : "bg-surface-low text-on-surface-variant"}`}>
                    {visible ? "visible in Graph" : "invisible in Graph"}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="scheduled">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Scheduled publishing - <code className="font-mono text-xl">startPublish</code> &amp; <code className="font-mono text-xl">stopPublish</code>
            <SectionAnchor id="scheduled" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Editors set <code className="bg-surface-low px-1 rounded font-mono text-xs">startPublish</code> to
            schedule a page to go live at a future date, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">stopPublish</code> to expire it
            automatically. Both are handled entirely by the CMS - the app receives no advance notice. Items
            simply appear in (or disappear from) Graph results when the dates arrive. The{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">doc.expired</code> webhook fires
            when <code className="bg-surface-low px-1 rounded font-mono text-xs">stopPublish</code> is reached.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={SCHEDULED_FIELDS_SNIPPET} label="startPublish / stopPublish - built-in CMS fields" />
            <CodeBlock code={GRAPH_VISIBILITY_SNIPPET} label="Graph only exposes Published items - no status filter needed" />
          </div>
        </section>

        <section id="preview-scheduled">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Previewing scheduled content before it goes live
            <SectionAnchor id="preview-scheduled" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Editors and reviewers need to see scheduled content before its{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">startPublish</code> date. The
            preview token issued by the CMS bypasses Graph&apos;s Published filter - it returns content
            in any state. Pass the token to{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getPreviewContent()</code> to
            render the exact version that will go live.
          </p>
          <CodeBlock code={PREVIEW_SCHEDULED_SNIPPET} label="Preview route - preview token bypasses the Published filter" />
        </section>

        <section id="webhooks">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Webhook events across the lifecycle
            <SectionAnchor id="webhooks" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The CMS and Graph emit webhooks at lifecycle transition points. Use them to invalidate ISR
            caches on publish, bust expired content caches on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">stopPublish</code>, and
            drive editorial workflow automation on status changes.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={WEBHOOK_EVENTS_SNIPPET} label="Lifecycle webhook events + ISR revalidation" />
            <CodeBlock code={APPROVAL_HOOKS_SNIPPET} label="Status-change webhook for Slack / CI automation" />
          </div>
        </section>

        <section id="versioning">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Version history and rollback
            <SectionAnchor id="versioning" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every save creates a new version in the CMS. The Management API exposes the full version
            history for any content item - useful for rollback scripts and audit trails. Publish an
            older version by PATCHing it to{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">status: &quot;published&quot;</code>.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/13-cli-commands.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <CodeBlock code={VERSION_HISTORY_SNIPPET} label="List versions + publish an older version (rollback)" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Graph only returns Published items.</strong> Draft, Scheduled, In Review, Approved, and Expired content is invisible to public queries. No status filter needed - the CMS handles it.</>,
          <><strong className="text-on-surface">startPublish and stopPublish are CMS-side fields.</strong> They are not queryable in Graph. Items simply appear or disappear from results when the dates arrive.</>,
          <><strong className="text-on-surface">A Scheduled item returns 404 until its startPublish date.</strong> The URL doesn&apos;t exist in Graph yet. This is expected - don&apos;t treat it as an error.</>,
          <><strong className="text-on-surface">The preview token bypasses the Published filter.</strong> It returns Draft, Scheduled, Approved content - use it to let editors review before going live.</>,
          <><strong className="text-on-surface">doc.expired webhook fires when stopPublish is reached.</strong> Handle it by calling revalidatePath() for the expired URL to remove it from ISR caches.</>,
          <><strong className="text-on-surface">Every save creates a version.</strong> The Management API lets you list versions and publish an older one - useful for quick rollbacks without re-editing in the CMS UI.</>,
        ]} />

      </div>
    </>
  );
}
