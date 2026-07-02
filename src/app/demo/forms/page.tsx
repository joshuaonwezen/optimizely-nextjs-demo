import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import OptiFormsContainer from "@/components/blocks/OptiFormsContainer";
import OptiFormsTextbox from "@/components/blocks/OptiFormsTextbox";
import OptiFormsTextarea from "@/components/blocks/OptiFormsTextarea";
import OptiFormsSelection from "@/components/blocks/OptiFormsSelection";
import OptiFormsSubmit from "@/components/blocks/OptiFormsSubmit";

export const metadata: Metadata = {
  title: "Forms Demo",
};

const FRAGMENT_SNIPPET = `// Native Optimizely Forms types - no contentType() needed, they are pre-registered
// in the CMS after activation. The SDK auto-generates GraphQL fragments from the
// schema hints in componentRegistry.ts so all properties are fetched automatically.

// src/components/blocks/OptiFormsContainer/index.tsx
export default function OptiFormsContainer(props) {
  const data = props.content ?? props;
  return (
    <section
      data-form-submit-url={data.SubmitUrl?.default ?? "/api/form-submit"}
      data-form-success-message={data.SubmitConfirmationMessage}
    >
      <h2>{data.Title}</h2>
      <p>{data.Description}</p>
    </section>
  );
}

// src/components/blocks/OptiFormsTextbox/index.tsx
export default function OptiFormsTextbox(props) {
  const data = props.content ?? props;
  const name = data.Label?.toLowerCase().replace(/\\s+/g, "_") ?? "field";
  const required = isRequired(data.Validators);  // checks for RequiredValidator in JSON array
  return (
    <div>
      <label htmlFor={name}>{data.Label}{required && " *"}</label>
      <input id={name} name={name} type="text" placeholder={data.Placeholder} required={required} />
    </div>
  );
}

// src/components/blocks/OptiFormsSelection/index.tsx
// Options is a JSON scalar from Graph - parse it to get the choice array.
// AllowMultiSelect (boolean) controls single vs. multi-select.
export default function OptiFormsSelection(props) {
  const data = props.content ?? props;
  const items = data.Options ? JSON.parse(data.Options) : [];
  return (
    <select multiple={data.AllowMultiSelect ?? false}>
      {items.map((item, i) => (
        <option key={i} value={item.value ?? item.label}>{item.label}</option>
      ))}
    </select>
  );
}

// src/components/blocks/OptiFormsSubmit/index.tsx - "use client"
// Same DOM-scoped collection as before: scans closest("main") for all inputs,
// reads data-form-submit-url, validates required fields, POSTs JSON payload.`;

const SUBMIT_SNIPPET = `// OptiFormsSubmit - "use client"
async function handleClick() {
  const scope     = ref.current?.closest("main") ?? document.body;
  const configEl  = scope.querySelector("[data-form-submit-url]");
  const submitUrl = configEl?.getAttribute("data-form-submit-url") ?? "/api/form-submit";
  const msg       = configEl?.getAttribute("data-form-success-message");

  // Collect every input, textarea, and select within the same page scope.
  // Works because Visual Builder renders form elements as flat siblings.
  const inputs  = scope.querySelectorAll("input, textarea, select");
  const payload: Record<string, string> = {};
  let valid = true;
  inputs.forEach((el) => {
    if (el.name) payload[el.name] = el.value;
    if (el.required && !el.value) valid = false;
  });

  if (!valid) { inputs.forEach((el) => el.required && !el.value && el.reportValidity()); return; }

  const res = await fetch(submitUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) { setStatus("success"); if (msg) setSuccessMessage(msg); }
}`;

const REGISTRY_SNIPPET = `// src/lib/optimizely/componentRegistry.ts
//
// Native form type schemas live here - NOT in src/components/**/*.tsx -
// so opti:push (which globs src/components/**/*.tsx) does not try to push
// them. They are already in the CMS after activation.

const OptiFormsContainerDataType = contentType({
  key: "OptiFormsContainerData",
  baseType: "_component",
  properties: {
    Title: { type: "string" }, Description: { type: "string" },
    SubmitUrl: { type: "url" }, SubmitConfirmationMessage: { type: "string" },
  },
});

// OptiFormsSelectionElement - field names differ from what you might guess:
//   Options (JSON scalar, not Items[])      AllowMultiSelect (not AllowMultipleChoices)
// Getting these wrong causes ALL pages to 404 - the SDK includes these fields in its
// auto-generated composition fragment, and Graph returns a schema error for unknown fields.
const OptiFormsSelectionElementType = contentType({
  key: "OptiFormsSelectionElement",
  baseType: "_component",
  properties: {
    Label: { type: "string" },
    AllowMultiSelect: { type: "boolean" },  // NOT AllowMultipleChoices
    Options: { type: "string" },            // JSON scalar in Graph, NOT an Items array
    Validators: { type: "string" },
  },
});

initContentTypeRegistry([
  ...otherTypes,
  OptiFormsContainerDataType,
  OptiFormsSelectionElementType,
  // OptiFormsTextboxElementType, OptiFormsTextareaElementType, OptiFormsSubmitElementType
]);

initReactComponentRegistry({ resolver: {
  OptiFormsContainerData: OptiFormsContainer,
  OptiFormsTextboxElement: OptiFormsTextbox,
  OptiFormsTextareaElement: OptiFormsTextarea,
  OptiFormsSelectionElement: OptiFormsSelection,
  OptiFormsSubmitElement: OptiFormsSubmit,
}});`;

const API_ROUTE_SNIPPET = `// src/app/api/form-submit/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  // body = { "Full Name": "Jane", "Email Address": "jane@...", "Message": "..." }
  // Keys are the Label values of each form element (slugified to snake_case).

  // Log the submission (swap for your CRM / ODP integration here)
  console.log("[Form Submission]", body);

  // To send to Optimizely Data Platform as a customer event:
  // await fetch("https://api.zaius.com/v3/events", {
  //   method: "POST",
  //   headers: { "x-api-key": process.env.ODP_API_KEY },
  //   body: JSON.stringify({ type: "form_submit", identifiers: { email: body.email }, data: body }),
  // });

  return NextResponse.json({ success: true });
}`;

const PERSONALIZATION_SNIPPET = `// The submit to ODP to FX loop:

// 1. User submits the form (email captured in body.email)

// 2. /api/form-submit POSTs to ODP as a customer event
//    ODP builds a customer profile: { email, logged_in: true, ... }

// 3. Next request: FX evaluates "cms_personalization" flag for this user
//    Audience condition: logged_in = true to variation "returning_users"

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
        description="Native Optimizely Forms - activate in CMS settings, build forms in the form builder, drag them into any Visual Builder experience. Submissions post to your webhook endpoint and feed the personalization loop: capture to ODP profile to FX audience to targeted content."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            OptiFormsContainerData · OptiFormsTextboxElement · OptiFormsTextareaElement · OptiFormsSelectionElement · OptiFormsSubmitElement
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            /api/form-submit
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            ODP · FX audience to CMS variation
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* Live Demo */}
        <section id="demo">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Demo <a href="#demo" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            The form below is rendered directly by the five{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">OptiFormsXxx</code> components
            with static mock data - the same props the SDK passes when serving a real form from Visual Builder.
            Fill it in and submit: the button collects all fields via DOM query, POSTs to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/form-submit</code>, and
            shows the exact payload sent and the API response received.
          </p>
          <div className="border border-ghost-border rounded-2xl overflow-hidden bg-surface-lowest">
            <OptiFormsContainer
              Title="Contact Support"
              Description="Send us a message and we'll get back to you within one business day."
              SubmitUrl={{ default: "/api/form-submit" }}
              SubmitConfirmationMessage="Thank you! We'll be in touch soon."
            />
            <OptiFormsTextbox
              Label="Full Name"
              Placeholder="Jane Smith"
              Validators={JSON.stringify([{ type: "RequiredValidator" }])}
            />
            <OptiFormsTextbox
              Label="Email Address"
              Placeholder="jane@example.com"
              Validators={JSON.stringify([{ type: "RequiredValidator" }])}
            />
            <OptiFormsSelection
              Label="Topic"
              Options={JSON.stringify([
                { label: "Account help", value: "account" },
                { label: "Card query", value: "card" },
                { label: "Mortgage", value: "mortgage" },
                { label: "Other", value: "other" },
              ])}
            />
            <OptiFormsTextarea
              Label="Message"
              Placeholder="Describe what you need help with..."
              Validators={JSON.stringify([{ type: "RequiredValidator" }])}
            />
            <OptiFormsSubmit
              Label="Send Message"
              showDebug
            />
          </div>
        </section>

        {/* Activation */}
        <section id="activation">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            1. Activate Forms in the CMS <a href="#activation" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Before creating forms, go to <strong>Settings &gt; Forms Settings &gt; Activate</strong> in the CMS admin.
            This is a one-time, irreversible step that enables the native form content types
            (<code className="bg-surface-low px-1 rounded text-xs font-mono">OptiFormsContainerData</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">OptiFormsTextboxElement</code>, and others)
            in the GraphQL schema and in Visual Builder&apos;s block picker. After activation, build forms
            using the CMS form builder and drag them into any DynamicExperience page.
          </p>
          <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4 max-w-3xl">
            <p className="text-xs font-semibold text-on-surface mb-1">Important constraints</p>
            <ul className="text-xs text-on-surface-variant leading-relaxed space-y-1 list-disc list-inside">
              <li>Native forms only work inside <strong>DynamicExperience</strong> (Visual Builder). Dragging a form onto a ContentArea in a traditional page has no effect.</li>
              <li>Do <strong>not</strong> run <code className="bg-surface px-1 rounded font-mono">opti:push</code> for native form types - they are already in the CMS. The SDK schema hints for fragment generation live in <code className="bg-surface px-1 rounded font-mono">componentRegistry.ts</code>, not in <code className="bg-surface px-1 rounded font-mono">src/components/**/*.tsx</code>.</li>
              <li><strong>OptiFormsSelectionElement field names are not what you expect.</strong> The Graph schema uses <code className="bg-surface px-1 rounded font-mono">Options</code> (a JSON scalar, not an <code className="bg-surface px-1 rounded font-mono">Items</code> array) and <code className="bg-surface px-1 rounded font-mono">AllowMultiSelect</code> (not <code className="bg-surface px-1 rounded font-mono">AllowMultipleChoices</code>). Registering the wrong field names in <code className="bg-surface px-1 rounded font-mono">componentRegistry.ts</code> breaks the SDK&apos;s auto-generated composition fragment and causes <strong>every page</strong> to return 404 - Graph rejects the unknown fields at schema validation time.</li>
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            2. How It Works <a href="#how-it-works" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Native form elements render as flat siblings in a Visual Builder experience. The submit
            element uses DOM-scoped field collection (the same approach as before) - no React
            context or prop-drilling needed.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">1. OptiFormsContainerData</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  The form container. Renders the title and description. Sets{" "}
                  <code className="bg-surface px-1 rounded font-mono">data-form-submit-url</code> and{" "}
                  <code className="bg-surface px-1 rounded font-mono">data-form-success-message</code>{" "}
                  from <code className="bg-surface px-1 rounded font-mono">SubmitUrl.default</code> and{" "}
                  <code className="bg-surface px-1 rounded font-mono">SubmitConfirmationMessage</code>.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">2. Form element components</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Each native element type renders the appropriate HTML element.{" "}
                  <code className="bg-surface px-1 rounded font-mono">OptiFormsTextboxElement</code> - input,{" "}
                  <code className="bg-surface px-1 rounded font-mono">OptiFormsTextareaElement</code> - textarea,{" "}
                  <code className="bg-surface px-1 rounded font-mono">OptiFormsSelectionElement</code> - select.
                  The <code className="bg-surface px-1 rounded font-mono">name</code> attribute is derived from{" "}
                  <code className="bg-surface px-1 rounded font-mono">Label</code> (slugified). Required state
                  comes from the <code className="bg-surface px-1 rounded font-mono">Validators</code> array.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">3. OptiFormsSubmitElement</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  A <code className="bg-surface px-1 rounded font-mono">"use client"</code> component.
                  On click: reads <code className="bg-surface px-1 rounded font-mono">data-form-submit-url</code>,
                  collects all inputs in the page scope via DOM query, validates required fields, POSTs JSON,
                  shows success or error state.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">4. /api/form-submit</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Receives the JSON payload (keys are slugified Label values). In production: forward to
                  your CRM or Optimizely Data Platform. The demo logs to console and returns{" "}
                  <code className="bg-surface px-1 rounded font-mono">{"{ success: true }"}</code>.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Submit element - DOM-scoped collection</p>
              <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed h-full">
                <code>{SUBMIT_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Component registration */}
        <section id="registration">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            3. Component Registration <a href="#registration" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Native form types are already registered in the CMS after activation - no{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">opti:push</code> needed for them.
            We provide schema hints to the SDK in{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">componentRegistry.ts</code> so it
            includes the correct properties in its auto-generated composition GraphQL fragments, then register
            the React rendering components under each native type key.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{REGISTRY_SNIPPET}</code>
          </pre>
        </section>

        {/* Component implementations */}
        <section id="components">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            4. Component Implementations <a href="#components" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Each native form type maps to a React component in{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">src/components/blocks/OptiFormsXxx/index.tsx</code>.
            Components do <strong>not</strong> call <code className="bg-surface-low px-1 rounded text-xs font-mono">contentType()</code>{" "}
            - the schema is provided in <code className="bg-surface-low px-1 rounded text-xs font-mono">componentRegistry.ts</code>.
            Property names are PascalCase to match the native CMS schema (
            <code className="bg-surface-low px-1 rounded text-xs font-mono">Label</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">Placeholder</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">SubmitUrl</code>, etc.).
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{FRAGMENT_SNIPPET}</code>
          </pre>
        </section>

        {/* API route */}
        <section id="submit-handler">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            5. The Submit Handler <a href="#submit-handler" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The route receives a flat JSON object keyed by slugified{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">Label</code> value (the native
            forms&apos; field identifier). The Submit URL on the form container is set to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/form-submit</code> in the
            CMS form builder. Swap the console log for any integration - CRM, email service, or
            Optimizely Data Platform.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{API_ROUTE_SNIPPET}</code>
          </pre>
        </section>

        {/* Personalization loop */}
        <section id="personalization-loop">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            6. Closing the Personalization Loop <a href="#personalization-loop" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            A form submission is the beginning of a customer profile, not the end.
            Connect the submit handler to Optimizely Data Platform (ODP) and the
            submission feeds straight into Feature Experimentation audience conditions -
            which the CMS page route already reads to serve targeted content variations.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 overflow-x-auto mb-8">
            <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">{`User submits form (email captured)
        |
        +-> POST /api/form-submit
                +-> POST to ODP: { type: "form_submit", identifiers: { email }, data: payload }
                        +-> ODP builds customer profile: { email, logged_in: true, ... }

Next page request (same user, identified by cookie)
        +-> FX evaluates "cms_personalization" flag
                Audience: logged_in = true -> variation "returning_users"
                +-> Graph returns the CMS variation built for returning users
                        +-> OptimizelyComponent renders it - zero extra code`}</pre>
          </div>

          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{PERSONALIZATION_SNIPPET}</code>
          </pre>
        </section>

      </div>
    </>
  );
}
