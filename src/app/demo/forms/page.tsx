import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import OptiFormsContainer from "@/components/blocks/OptiFormsContainer";
import OptiFormsTextbox from "@/components/blocks/OptiFormsTextbox";
import OptiFormsTextarea from "@/components/blocks/OptiFormsTextarea";
import OptiFormsSelection from "@/components/blocks/OptiFormsSelection";
import OptiFormsSubmit from "@/components/blocks/OptiFormsSubmit";
import ContactFormBlock from "@/components/blocks/ContactFormBlock";
import CodeBlock from "@/components/demo/CodeBlock";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";

export const metadata: Metadata = {
  title: "Forms Demo",
};

// The shapes below are exactly what Graph returns for a native form. Validators
// and Options are `type: "json"`, so they arrive as arrays, not strings - and
// toValidators() returns [] for anything that is not already an array, so a
// JSON string here would silently disable validation.
const REQUIRED = [{ type: "RequiredValidator", errorMessage: "This field is required." }];
const EMAIL_VALIDATORS = [
  { type: "RequiredValidator", errorMessage: "This field is required." },
  { type: "EmailValidator", errorMessage: "Please enter a valid email address." },
];
const TOPIC_OPTIONS = [
  { label: "Account help", value: "account" },
  { label: "Card query", value: "card" },
  { label: "Mortgage", value: "mortgage" },
  { label: "Other", value: "other" },
];

const FIELD_SNIPPET = `// Native Optimizely Forms types - no contentType() needed. The SDK ships their
// schemas and initForms() registers them, so a field component is only ever the
// markup: useFormField does the naming, validation and rule visibility.

// src/components/blocks/OptiFormsTextbox/index.tsx - "use client"
export default function OptiFormsTextbox(props) {
  const data = props.content ?? props;
  const validators = toValidators(data.Validators);   // Graph returns JSON, not a string

  const { fieldProps, isRequired, errors, showErrors, errorProps } = useFormField({
    content: asFieldContent(data),
    name: fieldName(data),                            // slugify(getFieldName(data))
    validators,
  });

  // EmailValidator -> type="email", RegularExpressionValidator -> pattern="..."
  const { type, ...validationAttrs } = getHtmlValidationAttributes(validators);

  return (
    <FormElement content={data}>                      {/* dependency rules can hide it */}
      <label htmlFor={fieldProps.id}>{data.Label}{isRequired && " *"}</label>
      <input {...fieldProps} {...validationAttrs} type={type ?? "text"} />
      {showErrors && <p {...errorProps}>{errors[0]}</p>}
    </FormElement>
  );
}`;

const SHELL_SNIPPET = `// src/components/blocks/OptiFormsContainer/FormShell.tsx - "use client"
//
// THE TRAP: FormWrapper calls useFormSubmission() but does NOT render
// FormSubmissionProvider itself. It only wraps its children in the validation and
// rules providers. Leave the provider out and the form throws on first render.

export default function FormShell(props) {
  return (
    <FormSubmissionProvider>      {/* required, and not supplied by FormWrapper */}
      <FormBody {...props} />
    </FormSubmissionProvider>
  );
}

function FormBody({ action, successMessage, steps, rules, children }) {
  const { formSuccess, errorMessage } = useFormSubmission();

  // Resolving means success, throwing means failure. That contract is the whole
  // interface: FormWrapper resets the fields, returns to step 0 and scrolls to
  // #form-alert on success, and surfaces an Error's message on failure.
  const submitHandler = async (formData, context) => {
    const res = await fetch(action, { method: "POST", body: json(formData) });
    if (!res.ok) throw new Error(\`Submission failed with status \${res.status}\`);
    trackEvent("mb_form_submit", { ... });
    identifyCustomer({ email: payload.email });
  };

  return (
    <FormWrapper action={action} submitHandler={submitHandler} steps={steps} rules={rules}>
      {formSuccess ? <SuccessPanel id="form-alert" /> : children}
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </FormWrapper>
  );
}`;

const CONTAINER_SNIPPET = `// src/components/blocks/OptiFormsContainer/index.tsx - a SERVER component.
// It keeps its "use cache" Graph self-fetch (a referenced shared Form Container
// arrives without its scalar props) and renders the client shell around
// server-rendered children.

// Editors put Next / Previous / Submit wherever they like, often each in its own
// row. partitionFormNodes pulls them out at any depth and drops the rows left
// empty behind them, so they lay out as one footer however the form was authored.
const { content, buttons } = partitionFormNodes(nodes);
const steps = content.filter(n => n.nodeType === "step");

<FormShell action={...} steps={steps} rules={data.DependencyRules}>
  {steps.map((step, index) => (
    // OptimizelyGridSection has NO handler for nodeType "step" - it renders one as
    // a bare fragment, which is why every step used to show at once. Wrapping is
    // the consumer's job.
    <FormStep key={step.key} index={index} node={step}>
      <OptimizelyGridSection nodes={step.nodes} row={NodeWrapper} column={NodeWrapper} />
    </FormStep>
  ))}
  <OptimizelyGridSection nodes={buttons} row={NodeWrapper} column={NodeWrapper} />
</FormShell>`;

const REGISTRY_SNIPPET = `// src/lib/optimizely/componentRegistry.ts
//
// initForms() is the whole registration: it registers the SDK's own OptiForms type
// schemas AND maps your components onto them. Nothing here is ever pushed - the
// types are already in the CMS after activation, and opti:push only globs
// src/components/**/*.tsx anyway.
//
// Import from react/server, NOT the package root. 3.0.0 exported it from both,
// which made the root entry pull in react (a peer dependency) and broke every
// standalone npx @optimizely/cms-cli call. 3.0.1 reverted that re-export.
import { initForms } from "@optimizely/cms-sdk/react/server";

initForms({
  container: OptiFormsContainer,
  textbox:   OptiFormsTextbox,
  textarea:  OptiFormsTextarea,
  selection: OptiFormsSelection,
  submit:    OptiFormsSubmit,
  // The SDK registers all ten element types whether or not you map one, and an
  // unmapped type renders a visible "No component found" box rather than nothing.
  // So map every one. Range shares the number component: the CMS models both as a
  // numeric field, and a slider with no configured bounds is worse than an input.
  number: OptiFormsNumber, range: OptiFormsNumber, url: OptiFormsUrl,
  choice: OptiFormsChoice, reset: OptiFormsReset,
});

// Order does not matter: initForms writes to lists the SDK keeps separate from
// initContentTypeRegistry / initReactComponentRegistry, so neither wipes the other.
initContentTypeRegistry([...yourOwnTypes]);
initReactComponentRegistry({ resolver: yourOwnResolver });`;

const VALIDATION_SNIPPET = `// @optimizely/cms-sdk/forms/validation - framework-free, usable on the server too.

isFieldRequired(validators)          // folds "requirevalidator" / "requiredvalidator"
validateField(value, validators)     // -> FormFieldError[], all seven validator types
getErrorMessages(errors)             // -> the editor's own ErrorMessage strings
getHtmlValidationAttributes(v)       // -> { required, type: "email", pattern, ... }
getFieldName(field)                  // SubmissionFieldName || Label - see the note below
getSelectionOptions(field)           // Options as an array, string form accepted too
toValidators(value)                  // Validators is unknown JSON; [] for a non-array

// extractValidatorType() lowercases and folds the naming variants, so you never
// compare raw CMS casing by hand. Verified against live Graph, a seeded form's
// Validators come back as:
//   [{ "type": "RequiredValidator", "errorMessage": "This field is required." },
//    { "type": "EmailValidator",    "errorMessage": "Please enter a valid email address." }]`;

const STEPS_SNIPPET = `// Multi-step forms. The composition nests one level deeper than a grid section:
//   section(layoutType:"form") > step > row > column > element
// The SDK probes whether a page holds a form and expands the composition to depth
// 8 when it does, leaving ordinary compositions at 4. Nothing to configure.

<FormWrapper steps={steps}>        // steps let rules resolve their jump targets
  <FormStep index={0} node={step}> // inactive steps stay mounted under display:none,
    ...fields                      // so values survive stepping back and submitting
  </FormStep>                      // validates every step, not just the visible one
</FormWrapper>

// Buttons carry no role property. Optimizely Forms has ONE button element for
// Next, Previous, Submit and Reset, told apart only by the label:
useFormButton(content)             // "next" -> next, "previous"/"back" -> previous,
                                   // anything else -> submit (case-insensitive)
useFormButton(content, { role: "reset" })   // reset has to be passed explicitly

// Dependency rules (OptiFormsDependencyRule) show and hide fields:
<FormRulesProvider rules={container.DependencyRules}>   // FormWrapper does this
  <FormElement content={field}>...</FormElement>        // each field opts in
// A field hidden by a rule is unregistered from validation, so a hidden required
// field cannot block submission. In edit mode it renders anyway, or an editor
// would be left with an empty selectable block.`;

const API_ROUTE_SNIPPET = `// src/app/api/form-submit/route.ts
export async function POST(request: NextRequest) {
  // The SDK's createJsonSubmitHandler posts { targetUrl, payload, formKey } rather
  // than the field values on their own. The hand-built ContactFormBlock still posts
  // a flat object, so accept both and unwrap to the same shape.
  const { body, envelope } = unwrap(await request.json());
  // body = { full_name: "Jane", email: "jane@...", topic: "account", message: "..." }

  console.log("[Form Submission]", body);

  // Forwarded to Optimizely Data Platform as a customer event. Fire and forget:
  // a failure is warned and the route still returns 200, so a visitor's submission
  // never fails because ODP is down.
  await forwardToOdp(body).catch(err => console.warn(err));

  return NextResponse.json({ success: true, message: "...", received: body });
}

// forwardToOdp keys on email and fs_user_id - NOT vuid. OdpSetup stitches the FX
// visitor id into ODP under fs_user_id, so that is where the profile lives.`;

const CUSTOM_FORM_SNIPPET = `// src/components/blocks/ContactFormBlock/ContactForm.tsx - "use client"
// The hand-built alternative: a normal content type with normal properties, and a
// field list fixed in code rather than authored in the CMS.

const [values, setValues] = useState({ full_name: "", email: "", message: "" });

async function handleSubmit(e) {
  e.preventDefault();
  const res = await fetch(submitUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),          // flat body, no envelope
  });
  if (res.ok) { trackSubmit(...); identifyCustomer({ email: values.email }); }
}

// contentType({ key: "ContactFormBlock", properties: {
//   heading, intro, submitLabel, successMessage, submitUrl
// }})
// An editor controls the copy and the endpoint. They cannot add, remove, reorder
// or validate a field without a developer.`;

const PERSONALIZATION_SNIPPET = `// The submit to ODP to FX loop:

// 1. User submits the form (email captured in body.email)

// 2. /api/form-submit POSTs to ODP as a customer event
//    ODP builds a customer profile: { email, logged_in: true, ... }

// 3. Next request: FX evaluates "cms_personalization" flag for this user
//    Audience condition: logged_in = true to variation "returning_users"

// 4. [[...slug]]/page.tsx passes a variation filter to Graph.
//    includeOriginal: true keeps a visitor who matches no variation served:
//    Graph returns the base version alongside any match. stored: false is
//    required with it - a Graph stored query template binds the variation
//    value of whichever request registered it, so every visitor would get
//    the first variation served.
const [page] = await client.getContentByPath(url, {
  variation: {
    include: "SOME",
    value: ["returning_users"],
    includeOriginal: true,
  },
  stored: false,
});

// 5. Graph returns the CMS variation an editor built in Visual Builder
//    specifically for logged-in / returning users
return <OptimizelyComponent content={page} />;`;

export default function FormsPage() {
  return (
    <>
      <DemoHero
        title="Forms & Data Capture"
        description="Native Optimizely Forms - activate in CMS settings, build forms in the form builder, drag them into any Visual Builder experience. Rendered by the SDK's own form runtime: validation, multi-step and conditional fields come with it. Submissions post to your endpoint and feed the personalization loop: capture to ODP profile to FX audience to targeted content."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            OptiFormsContainerData · OptiFormsTextboxElement · OptiFormsTextareaElement · OptiFormsSelectionElement · OptiFormsSubmitElement
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            @optimizely/cms-sdk/forms/react
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
          <DemoSectionHeading id="demo">Live Demo</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Two ways to put a form on a page, side by side and both live. On the left, a{" "}
            <strong>native Optimizely Form</strong> rendered by the SDK&apos;s form runtime from the
            same props Visual Builder passes. On the right, a{" "}
            <strong>hand-built block</strong> whose fields live in React, not in the CMS. Submit
            either one: both POST to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/form-submit</code>,
            and the native one prints the exact request and response.
          </p>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            Try submitting the native form empty, or with{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">not-an-email</code> in
            the email field. The messages you get back are the editor&apos;s own{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">ErrorMessage</code>{" "}
            strings from the CMS, enforced by{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">validateField()</code>.
          </p>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Native form - CMS authored, SDK rendered
              </p>
              <div className="border border-ghost-border rounded-2xl overflow-hidden bg-surface-lowest">
                <OptiFormsContainer
                  Title="Contact Support"
                  Description="Send us a message and we'll get back to you within one business day."
                  SubmitUrl={{ default: "/api/form-submit" }}
                  SubmitConfirmationMessage="Thank you! We'll be in touch soon."
                  showDebug
                >
                  <OptiFormsTextbox
                    Label="Full Name"
                    Placeholder="Jane Smith"
                    AutoComplete="name"
                    Validators={REQUIRED}
                  />
                  <OptiFormsTextbox
                    Label="Email"
                    Placeholder="jane@example.com"
                    AutoComplete="email"
                    Validators={EMAIL_VALIDATORS}
                  />
                  <OptiFormsSelection Label="Topic" Options={TOPIC_OPTIONS} />
                  <OptiFormsTextarea
                    Label="Message"
                    Placeholder="Describe what you need help with..."
                    Validators={REQUIRED}
                  />
                  <OptiFormsSubmit Label="Send Message" />
                </OptiFormsContainer>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Hand-built block - fields fixed in React
              </p>
              <div className="border border-ghost-border rounded-2xl overflow-hidden bg-surface-lowest">
                <ContactFormBlock
                  heading="Contact Support"
                  intro="The same three fields, written by hand. An editor owns the copy and the endpoint, not the field list."
                  submitLabel="Send Message"
                  successMessage="Thank you! We'll be in touch soon."
                  submitUrl={{ default: "/api/form-submit" }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mt-8">
            <table className="w-full text-xs border border-ghost-border rounded-xl overflow-hidden">
              <thead className="bg-surface-low">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-on-surface">&nbsp;</th>
                  <th className="text-left px-3 py-2 font-semibold text-on-surface">Native form</th>
                  <th className="text-left px-3 py-2 font-semibold text-on-surface">Hand-built block</th>
                </tr>
              </thead>
              <tbody className="text-on-surface-variant">
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Who owns the fields</td>
                  <td className="px-3 py-2">An editor, in the CMS form builder</td>
                  <td className="px-3 py-2">A developer, in JSX</td>
                </tr>
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Validation</td>
                  <td className="px-3 py-2">Seven validator types, editor-authored messages</td>
                  <td className="px-3 py-2">Whatever the markup declares</td>
                </tr>
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Multi-step, conditional fields</td>
                  <td className="px-3 py-2">Built in</td>
                  <td className="px-3 py-2">Write it yourself</td>
                </tr>
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Where it can go</td>
                  <td className="px-3 py-2">DynamicExperience only (Visual Builder)</td>
                  <td className="px-3 py-2">Any content area or composition</td>
                </tr>
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Posted body</td>
                  <td className="px-3 py-2"><code className="font-mono">{"{ targetUrl, payload, formKey }"}</code></td>
                  <td className="px-3 py-2">Flat JSON object</td>
                </tr>
                <tr className="border-t border-ghost-border">
                  <td className="px-3 py-2 font-medium text-on-surface">Reach for it when</td>
                  <td className="px-3 py-2">Marketing needs to change the form without a deploy</td>
                  <td className="px-3 py-2">The form is part of a product flow with bespoke behaviour</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            Both also appear together on a real CMS page:{" "}
            <Link href="/contact-form" className="text-brand hover:underline">/contact-form</Link>{" "}
            is a DynamicExperience carrying the hand-built block as a component node and the shared
            Form Container as a form section, seeded by{" "}
            <code className="bg-surface-low px-1 rounded font-mono">scripts/seed-contact-form.ts</code>.
          </p>
        </section>

        {/* Activation */}
        <section id="activation">
          <DemoSectionHeading id="activation">1. Activate Forms in the CMS</DemoSectionHeading>
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
              <li>The Management API <strong>cannot create</strong> an <code className="bg-surface px-1 rounded font-mono">OptiFormsContainerData</code> block. Author it once by hand in Visual Builder; its composition (the steps, rows and elements) can then be PATCHed by a script, which is what <code className="bg-surface px-1 rounded font-mono">scripts/seed-form-block.ts</code> does.</li>
              <li>Do <strong>not</strong> run <code className="bg-surface px-1 rounded font-mono">opti:push</code> for native form types - they are already in the CMS. Since cms-sdk 3.0.0 the SDK owns their schemas, so <code className="bg-surface px-1 rounded font-mono">initForms()</code> is the only registration you write.</li>
              <li><strong>The SDK registers all ten element types, not just the ones you implement.</strong> An element with no component renders a visible <em>&quot;No component found for content type X&quot;</em> box rather than nothing. Map every one.</li>
              <li><strong>Field names are not what you would guess</strong> - <code className="bg-surface px-1 rounded font-mono">Options</code> is JSON, not an <code className="bg-surface px-1 rounded font-mono">Items</code> array, and the flag is <code className="bg-surface px-1 rounded font-mono">AllowMultiSelect</code>, not <code className="bg-surface px-1 rounded font-mono">AllowMultipleChoices</code>. This used to be a footgun: a hand-declared schema with a wrong field name made the SDK ask Graph for unknown fields, and <strong>every page</strong> 404&apos;d. The SDK now supplies these names, so the risk is gone - but <code className="bg-surface px-1 rounded font-mono">Validators</code> and <code className="bg-surface px-1 rounded font-mono">Options</code> are typed <code className="bg-surface px-1 rounded font-mono">json</code>, so Graph hands them back already parsed, not as strings to <code className="bg-surface px-1 rounded font-mono">JSON.parse</code>.</li>
              <li><strong>Forms nest one level deeper than an ordinary composition</strong> (section, step, row, column, element). The SDK probes whether the page holds a form and uses depth 8 when it does, leaving ordinary compositions at 4. Nothing to configure, and the hand-patched depth rewrite this app used before 3.0.0 must not come back - it string-matched the SDK&apos;s generated fragment, and 3.0.0 changed that text, so it would silently no-op.</li>
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works">
          <DemoSectionHeading id="how-it-works">2. How It Works</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            The container is a server component, so it keeps its Graph fetch and its cache. Everything
            that needs state - validation, steps, submission - lives in a client shell it renders
            around the fields. The fields themselves are client components bound by{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">useFormField</code>.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">1. OptiFormsContainerData (server)</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Renders the title and description, and resolves its own scalar properties from
                  Graph by display name - a shared Form Container referenced in a page composition
                  arrives with only the section&apos;s structural fields. Splits the composition into
                  steps and buttons, then hands both to the client shell.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">2. FormShell (client)</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <code className="bg-surface px-1 rounded font-mono">FormSubmissionProvider</code> wrapping{" "}
                  <code className="bg-surface px-1 rounded font-mono">FormWrapper</code>. FormWrapper owns
                  the <code className="bg-surface px-1 rounded font-mono">&lt;form&gt;</code>, the
                  validation and rules contexts, the step machine and the submit lifecycle.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">3. Field components (client)</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Each element type renders its control and spreads{" "}
                  <code className="bg-surface px-1 rounded font-mono">fieldProps</code> from{" "}
                  <code className="bg-surface px-1 rounded font-mono">useFormField</code>: name, value,
                  required, <code className="bg-surface px-1 rounded font-mono">aria-invalid</code> and{" "}
                  <code className="bg-surface px-1 rounded font-mono">aria-describedby</code> all come
                  from the hook, wired to the element&apos;s own Validators.
                </p>
              </div>
              <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4">
                <p className="text-xs font-semibold text-on-surface mb-1">4. /api/form-submit</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Unwraps the SDK envelope, logs the payload, and forwards it to Optimizely Data
                  Platform as a <code className="bg-surface px-1 rounded font-mono">form_submit</code>{" "}
                  event keyed on <code className="bg-surface px-1 rounded font-mono">email</code> and{" "}
                  <code className="bg-surface px-1 rounded font-mono">fs_user_id</code>.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">The client shell</p>
              <CodeBlock code={SHELL_SNIPPET} className="h-full" />
            </div>
          </div>
        </section>

        {/* Component registration */}
        <section id="registration">
          <DemoSectionHeading id="registration">3. Component Registration</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Native form types are already registered in the CMS after activation - no{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">opti:push</code> needed for them.
            Until cms-sdk 3.0.0 you also had to hand-write each type&apos;s property schema so the SDK would
            include the right fields in its auto-generated composition fragments. The SDK now ships those
            schemas, so <code className="bg-surface-low px-1 rounded text-xs font-mono">initForms()</code> is
            the whole registration: it registers the types <em>and</em> maps your components onto them.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/3-modelling.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </p>
          <CodeBlock code={REGISTRY_SNIPPET} />
        </section>

        {/* Component implementations */}
        <section id="components">
          <DemoSectionHeading id="components">4. Component Implementations</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Each native form type maps to a React component in{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">src/components/blocks/OptiFormsXxx/index.tsx</code>.
            Components do <strong>not</strong> call <code className="bg-surface-low px-1 rounded text-xs font-mono">contentType()</code>{" "}
            - the SDK ships the schemas. Property names are PascalCase to match the native CMS schema (
            <code className="bg-surface-low px-1 rounded text-xs font-mono">Label</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">Placeholder</code>,{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">SubmitUrl</code>, etc.).
          </p>
          <CodeBlock code={FIELD_SNIPPET} />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mt-8 mb-2">
            The container
          </p>
          <CodeBlock code={CONTAINER_SNIPPET} />
        </section>

        {/* Validation */}
        <section id="validation">
          <DemoSectionHeading id="validation">5. Validation</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            <code className="bg-surface-low px-1 rounded text-xs font-mono">@optimizely/cms-sdk/forms/validation</code>{" "}
            carries no React, so a server component can use it too. Validation runs on every keystroke
            but only <em>shows</em> once a field has been touched or a submit has been attempted, and a
            failed submit moves focus to the first invalid field - across steps, if it has to.
          </p>
          <CodeBlock code={VALIDATION_SNIPPET} />

          <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4 mt-6 max-w-3xl">
            <p className="text-xs font-semibold text-on-surface mb-1">
              getFieldName() returns the RAW label, not a slug
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <code className="bg-surface px-1 rounded font-mono">getFieldName(field)</code> is{" "}
              <code className="bg-surface px-1 rounded font-mono">SubmissionFieldName || Label</code>{" "}
              and nothing else, so a field labelled &quot;Full Name&quot; posts under the key{" "}
              <code className="bg-surface px-1 rounded font-mono">&quot;Full Name&quot;</code>, spaces and
              all. This app wraps it as{" "}
              <code className="bg-surface px-1 rounded font-mono">slugify(getFieldName(field))</code>{" "}
              in <code className="bg-surface px-1 rounded font-mono">_shared/formFields.ts</code>: the
              editor-settable Submission Field Name is honoured, but the payload keys stay snake_case,
              which is what <code className="bg-surface px-1 rounded font-mono">/api/form-submit</code>{" "}
              and the ODP <code className="bg-surface px-1 rounded font-mono">email</code> identifier are
              built on. Anything reading the posted payload downstream depends on that choice, so
              dropping the wrapper is a data-shape change, not a refactor.
            </p>
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-xl p-4 mt-4 max-w-3xl">
            <p className="text-xs font-semibold text-on-surface mb-1">
              One more thing the hook decides for you
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <code className="bg-surface px-1 rounded font-mono">fieldProps.id</code> is the field{" "}
              <em>name</em>, not a generated id. That is what lets{" "}
              <code className="bg-surface px-1 rounded font-mono">aria-describedby</code> point at the
              right error message, but it also means two fields sharing a label on one page collide.
              Give one of them a Submission Field Name in the CMS.
            </p>
          </div>
        </section>

        {/* Steps and rules */}
        <section id="steps-and-rules">
          <DemoSectionHeading id="steps-and-rules">6. Multi-step and Conditional Fields</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            These are the two things a hand-rolled form never gets around to. Both are authored in the
            CMS form builder and need no code beyond wrapping each step and each field.
          </p>
          <CodeBlock code={STEPS_SNIPPET} />
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            The one piece the SDK does <strong>not</strong> do for you:{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">OptimizelyGridSection</code>{" "}
            has no handler for <code className="bg-surface-low px-1 rounded text-xs font-mono">nodeType: &quot;step&quot;</code>{" "}
            and renders one as a bare fragment, so without an explicit{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">FormStep</code> wrapper every
            step of a multi-step form shows at once.
          </p>
        </section>

        {/* API route */}
        <section id="submit-handler">
          <DemoSectionHeading id="submit-handler">7. The Submit Handler</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The Submit URL on the form container is set to{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">/api/form-submit</code> in the
            CMS form builder, and reaches the handler as{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">context.action</code>. Point a
            submit handler at a <strong>same-origin</strong> route and forward server-side from there:
            a browser POST straight to an external webhook is a CORS problem, and any credential it
            needs would be in the page. That is exactly what the SDK&apos;s{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">createJsonSubmitHandler</code>{" "}
            is for.
          </p>
          <CodeBlock code={API_ROUTE_SNIPPET} />
        </section>

        {/* Custom form */}
        <section id="custom-form">
          <DemoSectionHeading id="custom-form">8. The Hand-built Alternative</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Native forms are not always the right answer. A form that is part of a product flow -
            with its own steps, its own server calls, or fields derived from the signed-in user -
            is usually better as an ordinary block. The trade is editor control: an editor can change
            this form&apos;s copy and its endpoint, but not its fields.
          </p>
          <CodeBlock code={CUSTOM_FORM_SNIPPET} />
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            Both forms share one endpoint, so the ODP and analytics path downstream is identical. The
            route accepts the SDK envelope and a flat body alike - see section 7.
          </p>
        </section>

        {/* Personalization loop */}
        <section id="personalization-loop">
          <DemoSectionHeading id="personalization-loop">9. Closing the Personalization Loop</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
            A form submission is the beginning of a customer profile, not the end.
            The submit handler feeds Optimizely Data Platform (ODP), and the
            submission then reaches Feature Experimentation audience conditions -
            which the CMS page route already reads to serve targeted content variations.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 overflow-x-auto mb-8">
            <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">{`User submits form (email captured)
        |
        +-> POST /api/form-submit
                +-> POST to ODP: { type: "event", action: "form_submit", identifiers: { email }, data: payload }
                        +-> ODP builds customer profile: { email, logged_in: true, ... }

Next page request (same user, identified by cookie)
        +-> FX evaluates "cms_personalization" flag
                Audience: logged_in = true -> variation "returning_users"
                +-> Graph returns the CMS variation built for returning users
                        +-> OptimizelyComponent renders it - zero extra code`}</pre>
          </div>

          <CodeBlock code={PERSONALIZATION_SNIPPET} />
        </section>

      </div>
    </>
  );
}
