import type { Metadata } from "next";
import FormContainerBlock from "@/components/blocks/FormContainerBlock";
import FormTextInput from "@/components/blocks/FormTextInput";
import FormTextArea from "@/components/blocks/FormTextArea";
import FormSelect from "@/components/blocks/FormSelect";
import FormSubmitButton from "@/components/blocks/FormSubmitButton";
import DemoHero from "@/components/demo/DemoHero";

export const metadata: Metadata = {
  title: "Forms Demo",
};


const BLOCK_SCHEMA_SNIPPET = `// FormContainerBlock - heading, description, submitUrl, successMessage
export const FormContainerBlockType = contentType({
  key: "FormContainerBlock",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading:        { type: "string", displayName: "Heading" },
    description:    { type: "string", displayName: "Description" },
    submitUrl:      { type: "url",    displayName: "Submit URL" },
    successMessage: { type: "string", displayName: "Success Message" },
  },
});

// FormTextInput - label, placeholder, fieldName, inputType (text/email/tel), required
// FormTextArea  - label, placeholder, fieldName, required
// FormSelect    - label, fieldName, options (comma-separated string), required
// FormSubmitButton - label`;

const SUBMIT_SNIPPET = `// FormSubmitButton is a "use client" component.
// Rather than wrapping all fields in a <form>, it scans the page scope -
// this works because Visual Builder compositions are flat siblings, not nested.

async function handleClick() {
  const scope     = ref.current?.closest("main") ?? document.body;
  const configEl  = scope.querySelector("[data-form-submit-url]");
  const submitUrl = configEl?.getAttribute("data-form-submit-url") ?? "/api/form-submit";

  // Collect every input, textarea, and select within the same page scope
  const inputs  = scope.querySelectorAll("input, textarea, select");
  const payload: Record<string, string> = {};
  inputs.forEach((el) => { if (el.name) payload[el.name] = el.value; });

  const res = await fetch(submitUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}`;

const API_ROUTE_SNIPPET = `// src/app/api/form-submit/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  // body = { name: "Jane", email: "jane@...", interest: "Enterprise", message: "..." }

  // Log the submission (swap for your CRM / ODP integration here)
  console.log("[Form Submission]", body);

  // To send to Optimizely Data Platform as a customer event:
  // await fetch("https://api.zaius.com/v3/events", {
  //   method: "POST",
  //   headers: { "x-api-key": process.env.ODP_API_KEY },
  //   body: JSON.stringify({
  //     type: "form_submit",
  //     identifiers: { email: body.email },
  //     data: body,
  //   }),
  // });

  return NextResponse.json({ success: true });
}`;

const PERSONALIZATION_SNIPPET = `// The submit → ODP → FX loop:

// 1. User submits the form (email captured in body.email)

// 2. /api/form-submit POSTs to ODP as a customer event
//    ODP builds a customer profile: { email, logged_in: true, ... }

// 3. Next request: FX evaluates "cms_personalization" flag for this user
//    Audience condition: logged_in = true → variation "returning_users"

// 4. [[...slug]]/page.tsx passes variation key to Graph
const [page] = await client.getContentByPath(url, {
  variation: {
    include: "SOME",
    value: ["returning_users"],
    includeOriginal: true,
  },
});

// 5. Graph returns the CMS variation an editor built in Visual Builder
//    specifically for logged-in / returning users
return <OptimizelyComponent content={page} />;`;


export default function FormsPage() {
  return (
    <>
      <DemoHero
        title="Forms & Data Capture"
        description="CMS-managed forms built from composable blocks - editors configure fields in Visual Builder, the submit handler captures data, and each submission feeds the personalization loop: capture → ODP profile → FX audience → targeted content."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            FormContainerBlock · FormTextInput · FormTextArea · FormSelect · FormSubmitButton
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            /api/form-submit
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            ODP · FX audience → CMS variation
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Live demo form */}
        <section id="live-form">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Form <a href="#live-form" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The form below is assembled from the five form block components - the same
            components an editor would drag into Visual Builder. Try submitting it
            and watch the network tab: it POSTs JSON to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/form-submit</code>.
          </p>

          <div className="border border-ghost-border rounded-2xl bg-surface-lowest overflow-hidden max-w-2xl">
            <FormContainerBlock
              heading="Contact Us"
              description="Fill in the form and we'll get back to you within one business day."
              submitUrl={{ default: "/api/form-submit" }}
              successMessage="Thanks! We'll be in touch soon."
            />
            <FormTextInput
              label="Name"
              placeholder="Jane Smith"
              inputType="text"
              required={true}
            />
            <FormTextInput
              label="Email"
              placeholder="jane@company.com"
              inputType="email"
              required={true}
            />
            <FormSelect
              label="Area of interest"
              options="Developer Experience, Experimentation, CMS, Personalization"
              required={false}
            />
            <FormTextArea
              label="Message"
              placeholder="Tell us what you're building..."
              required={false}
            />
            <FormSubmitButton label="Send Message" />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How It Works <a href="#how-it-works" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Form blocks are independent components that cooperate via the DOM rather
            than a shared React state tree. This makes them composable in Visual Builder
            alongside any other block - a form can sit in any column, any section.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">1. FormContainerBlock</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Renders the heading and description. Sets{" "}
                  <code className="bg-surface px-1 rounded font-mono">data-form-submit-url</code> and{" "}
                  <code className="bg-surface px-1 rounded font-mono">data-form-success-message</code> as
                  data attributes - no React context needed.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">2. Field blocks</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Each renders an <code className="bg-surface px-1 rounded font-mono">input</code>,{" "}
                  <code className="bg-surface px-1 rounded font-mono">textarea</code>, or{" "}
                  <code className="bg-surface px-1 rounded font-mono">select</code> with a
                  derived <code className="bg-surface px-1 rounded font-mono">name</code> attribute
                  (from the <code className="bg-surface px-1 rounded font-mono">fieldName</code> or{" "}
                  slugified <code className="bg-surface px-1 rounded font-mono">label</code> property).
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">3. FormSubmitButton</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  A <code className="bg-surface px-1 rounded font-mono">"use client"</code> component.
                  On click: reads <code className="bg-surface px-1 rounded font-mono">data-form-submit-url</code>,
                  collects all inputs in the page scope, validates required fields, POSTs JSON, shows
                  success or error state.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">4. /api/form-submit</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Receives the JSON payload. In production: forward to your CRM or
                  Optimizely Data Platform as a customer event. The demo logs to console
                  and returns <code className="bg-surface px-1 rounded font-mono">{"{ success: true }"}</code>.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Submit button - DOM-scoped collection</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{SUBMIT_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Block schema */}
        <section id="block-schemas">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Block Schemas <a href="#block-schemas" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            All five block types are registered in{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">componentRegistry.ts</code>{" "}
            so editors can place them in any Visual Builder composition. The{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">submitUrl</code> on{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">FormContainerBlock</code> lets
            editors point different forms at different endpoints - a contact form, a newsletter
            signup, and a demo request can all live in the same CMS with separate handlers.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{BLOCK_SCHEMA_SNIPPET}</code>
          </pre>
        </section>

        {/* API route */}
        <section id="submit-handler">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The Submit Handler <a href="#submit-handler" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The route receives a flat JSON object keyed by field name. Swap the
            console log for any integration - CRM, email service, or Optimizely Data Platform.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{API_ROUTE_SNIPPET}</code>
          </pre>
        </section>

        {/* Personalization loop */}
        <section id="personalization-loop">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Closing the Personalization Loop <a href="#personalization-loop" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            A form submission is the beginning of a customer profile, not the end.
            Connect the submit handler to Optimizely Data Platform (ODP) and the
            submission feeds straight into Feature Experimentation audience conditions -
            which the CMS page route already reads to serve targeted content variations.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 overflow-x-auto mb-8">
            <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">{`User submits form (email captured)
        │
        └─→ POST /api/form-submit
                └─→ POST to ODP: { type: "form_submit", identifiers: { email }, data: payload }
                        └─→ ODP builds customer profile: { email, logged_in: true, ... }

Next page request (same user, identified by cookie)
        └─→ FX evaluates "cms_personalization" flag
                Audience: logged_in = true → variation "returning_users"
                └─→ Graph returns the CMS variation built for returning users
                        └─→ OptimizelyComponent renders it - zero extra code`}</pre>
          </div>

          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{PERSONALIZATION_SNIPPET}</code>
          </pre>
        </section>

      </div>
    </>
  );
}
