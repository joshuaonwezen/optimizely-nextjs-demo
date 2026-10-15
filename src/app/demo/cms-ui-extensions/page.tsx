import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import { Chip, Pipeline } from "@/components/demo/Pipeline";
import { StepBadge } from "@/components/ui/StepBadge";

export const metadata: Metadata = {
  title: "CMS UI Extensions",
};

const INJECTION_POINTS = [
  {
    point: "sidebar",
    where: "A panel beside the content editor, opened from a tab on the editor's right-hand rail",
    bound: "The item open in the editor",
    api: "content.get() / content.subscribe()",
  },
  {
    point: "view",
    where: "A full-width page, opened from Extensions in the CMS navigation rail",
    bound: "Nothing - instance-wide",
    api: "invokeFunction() only",
  },
  {
    point: "property-editor",
    where: "Replaces the built-in editor for a single property",
    bound: "One property of the item",
    api: "property.get() / set() / subscribe() (SDK 1.1.0+)",
  },
];

const CONTEXT_API = [
  { call: "extension.setReady()", returns: "void", note: "Tells the CMS the panel finished loading, so it drops its loading state." },
  { call: "extension.getDefinition()", returns: "{ id, displayName, type, configuration }", note: "The extension's own registration." },
  { call: "extension.invokeFunction(id, payload)", returns: "{ statusCode, data }", note: "Calls your OCP function. The only way to reach a backend - the function has no public URL." },
  { call: "content.get() / content.subscribe(cb)", returns: "{ key, version, locale, publicUrl }", note: "The item open in the editor. Fires again when the editor switches item, locale or version." },
  { call: "property.get() / set(v) / subscribe(cb)", returns: "{ value, readonly, settings }", note: "property-editor only. set() writes the bound property in the editor." },
];

const TROUBLESHOOTING = [
  {
    symptom: "No sidebar tab and no Extensions button - not even for Optimizely's own sample app",
    cause: "The CMS instance does not have UI extensions enabled (beta). Installing an app does not turn them on.",
    fix: "Ask Optimizely to enable CMS UI extensions for the instance UUID. Prove it first with the official unsplash_viewer sample, so you are not debugging your own app.",
  },
  {
    symptom: "Unknown flag --scope on ocp directory install",
    cause: "CLI older than 2.0.15.",
    fix: "ocp update",
  },
  {
    symptom: "Preview track [dev/<user>] was not found",
    cause: "Installing without a version follows a preview track, and none exists yet.",
    fix: "Install a pinned version: app@0.0.1-dev.2.",
  },
  {
    symptom: "The install landed in an OCP account you did not expect",
    cause: "A CMS-scoped install goes into the OCP account that manages that CMS instance, not into your own OCP account.",
    fix: "Pass the instance UUID with --scope and let OCP resolve the account. Your personal OCP account may manage no CMS instance at all.",
  },
  {
    symptom: "A new dev version is published but the CMS still runs the old one",
    cause: "Installs are pinned to a version.",
    fix: "ocp directory upgrade app --scope <uuid> -v <version> once the new version reports PUBLISHED.",
  },
  {
    symptom: "ocp app logs is empty",
    cause: "CMS-scoped apps need --scope, and a function only logs what you log.",
    fix: "ocp app logs --appId app --scope <uuid> --tail, and log each action you route.",
  },
];

const APP_YML = `meta:
  app_id: fx_cms_experiments
  display_name: FX Experiments
  version: 0.0.1-dev.0
  vendor: optimizely
  summary: Turn a page's CMS variations into an FX A/B test from the editor.
  support_url: https://www.optimizely.com
  contact_email: you@example.com
  categories:
    - Testing & Utilities
  availability:
    - all

runtime: node22-cms-ext            # the CMS UI extension runtime

functions:
  cms_extension:
    entry_point: CmsUiExtension
    accepts: cms_ui_extension      # callable only through invokeFunction, never by URL

ui_extensions:
  sidebar:
    - name: fx-experiment
      entry_point: FxExperiment    # build must emit dist/cms-ui-extensions/FxExperiment.js
      display_name: Experiment
  view:
    - name: fx-experiments
      entry_point: FxExperiments
      display_name: Experiments`;

const PROPERTY_EDITOR_YML = `ui_extensions:
  property-editor:
    - name: brand-color
      entry_point: BrandColor
      display_name: Brand color
      metadata:
        property_type: string        # string | richtext | integer | float | boolean
        property_format: shortstring # optional refinement`;

const OCP_CONFIG = `// ocp-app.config.mjs - adds the ui_extensions manifest schema and the bundle validator
import { defineConfig } from "@zaiusinc/app-sdk";
import { cmsUiExtensions } from "@optimizely/ocp-cms-ui-extensions-sdk";

export default defineConfig({ plugins: [cmsUiExtensions()] });`;

const SIDEBAR_SNIPPET = `// src/cms-ui-extensions/fx/FxExperiment.sidebar.tsx
// The <Name>.<injection-point>.tsx suffix is how the Vite config finds entries.
import { AxiomProvider, Button, Text } from "@optiaxiom/react";
import { register, type ContentState, type ExtensionContext } from "@optimizely/cms-extensibility-sdk";
import { useEffect, useState } from "react";

function FxExperiment({ context }: { context: ExtensionContext }) {
  const [content, setContent] = useState<ContentState>(null);
  const [status, setStatus] = useState<unknown>(null);

  useEffect(() => {
    void context.extension.setReady();
    void context.content.get().then(setContent);
    return context.content.subscribe(setContent); // returns its own unsubscribe
  }, [context]);

  async function load() {
    const res = await context.extension.invokeFunction("cms_extension", {
      action: "getStatus",
      params: { content },
    });
    setStatus(res.data); // whatever the OCP function returned
  }

  return content?.key ? <Button onClick={load}>Load experiment</Button> : <Text>Open a page</Text>;
}

register((context) => (
  <AxiomProvider>
    <FxExperiment context={context} />
  </AxiomProvider>
));`;

const FUNCTION_SNIPPET = `// src/backend/functions/CmsUiExtension.ts - one function, routed by action
import * as App from "@zaiusinc/app-sdk";
import { storage } from "@zaiusinc/app-sdk";

export class CmsUiExtension extends App.Function {
  public async perform(): Promise<App.Response> {
    const { action, params } = this.request.bodyJSON ?? {};

    // Per-install values saved through forms/settings.yml
    const fx = await storage.settings.get<{ apiToken?: string; projectId?: string }>("fx");
    if (!fx.apiToken) return new App.Response(412, { ok: false, error: "not_configured" });

    switch (action) {
      case "getStatus":
        return new App.Response(200, { ok: true, result: await getStatus(fx, params) });
      default:
        return new App.Response(400, { ok: false, error: "unknown_action" });
    }
  }
}`;

const SETTINGS_YML = `# forms/settings.yml - OCP renders this as the app's settings screen
sections:
  - key: fx
    label: Feature Experimentation
    elements:
      - type: secret
        key: apiToken
        label: Personal access token
        help: Leave blank to keep the saved one.   # every input needs help, or validate fails
      - type: text
        key: projectId
        label: Project ID
        help: The FX project the site's SDK key belongs to.
      - type: button
        label: Save
        action: saveFx       # -> Lifecycle.onSettingsForm("fx", "saveFx", formData)
        style: primary`;

const LOCAL_DEV = `yarn validate          # lint + typecheck + build + ocp-app-sdk validate
ocp dev -p 3100        # 3000 is usually taken by next dev

# Mock CMS at http://localhost:3100 renders the sidebar and view bundles and routes
# invokeFunction to your local backend. Settings are read from .ocp-local/settings.json -
# keep .ocp-local/ in .gitignore, it holds your secrets.`;

const INSTANCE_ID = `# The CMS API token names its own instance - no guessing from a list of names
curl -s -X POST https://api.cms.optimizely.com/oauth/token \\
  -H "Content-Type: application/json" \\
  -d "{\\"grant_type\\":\\"client_credentials\\",\\"client_id\\":\\"$CLIENT_ID\\",\\"client_secret\\":\\"$CLIENT_SECRET\\"}" \\
| node -e 'const t = JSON.parse(require("fs").readFileSync(0)).access_token;
  const c = JSON.parse(Buffer.from(t.split(".")[1], "base64url"));
  console.log(c.instanceId, c.siteUrl)'`;

const DEPLOY = `ocp update                                         # --scope needs CLI 2.0.15+
ocp app register --appId fx_cms_experiments --name "FX Experiments" --product HUB --personal
ocp app prepare --bump-dev-version --publish       # build on OCP and publish a dev version

ocp directory status fx_cms_experiments@0.0.1-dev.1   # wait for PUBLISHED
ocp directory install fx_cms_experiments@0.0.1-dev.1 --scope <cms-instance-uuid>

# Every later version
ocp directory upgrade fx_cms_experiments --scope <cms-instance-uuid> -v 0.0.1-dev.2
ocp app logs --appId fx_cms_experiments --scope <cms-instance-uuid> --tail`;

const FX_FACTS = [
  {
    title: "CMS variations in, FX experiment out",
    body: "The sidebar reads the open page's variations through the CMS REST API, then creates the FX flag, one FX variation per CMS variation plus control, and an A/B rule with traffic, audience and metrics.",
  },
  {
    title: "Variable defaults, not per-variation values",
    body: "cms_flag and cms_route are set as flag variable defaults, so a variation added later in the FX UI is still picked up by the site's middleware.",
  },
  {
    title: "control is the original page",
    body: "No CMS variation is named control, so Graph serves the base item - and the catch-all still fires the FX impression for it, so the baseline arm is counted.",
  },
  {
    title: "Results link comes from FX",
    body: "The rule's fetch_results_ui_url, which FX only creates the first time the experiment starts.",
  },
];

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="bg-surface-low border-b border-ghost-border">
        {columns.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function EditorSchematic() {
  return (
    <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
      <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
        Where extensions appear in the editor
      </p>
      <div className="grid grid-cols-[64px_1fr_minmax(0,220px)_44px] gap-2 h-64 text-[11px]">
        <div className="bg-surface-low rounded-xl flex flex-col items-center gap-2 py-3">
          {["Home", "Content", "Settings"].map((item) => (
            <span key={item} className="w-10 h-6 rounded bg-surface-lowest border border-ghost-border" aria-hidden="true" />
          ))}
          <span className="mt-auto px-1.5 py-1 rounded bg-brand/10 text-brand font-mono text-center leading-tight">
            view
          </span>
        </div>
        <div className="bg-surface-low rounded-xl p-3 flex flex-col gap-2">
          <span className="font-mono text-on-surface-variant">Content editor</span>
          <span className="h-3 w-3/4 rounded bg-surface-lowest" aria-hidden="true" />
          <span className="h-3 w-1/2 rounded bg-surface-lowest" aria-hidden="true" />
          <span className="flex-1 rounded bg-surface-lowest border border-dashed border-ghost-border flex items-center justify-center text-on-surface-variant">
            property-editor replaces one field here
          </span>
        </div>
        <div className="rounded-xl border-2 border-brand/50 bg-brand/5 p-3 flex flex-col gap-1.5">
          <span className="font-mono text-brand">sidebar panel</span>
          <span className="text-on-surface-variant leading-snug">
            Your bundle in an iframe, bound to the open item
          </span>
        </div>
        <div className="bg-surface-low rounded-xl flex flex-col items-center gap-2 py-3">
          <span className="w-7 h-7 rounded bg-brand text-on-brand flex items-center justify-center font-mono" aria-label="Sidebar extension tab">
            Ex
          </span>
          <span className="w-7 h-7 rounded bg-surface-lowest border border-ghost-border" aria-hidden="true" />
        </div>
      </div>
      <p className="text-xs text-on-surface-variant mt-4 max-w-3xl">
        A sidebar gets a tab on the editor&apos;s right-hand rail and opens beside the content.
        A view is reached from the Extensions button in the navigation rail. A property editor
        takes the place of one field&apos;s built-in input.
      </p>
    </div>
  );
}

function SetupStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <StepBadge>{n}</StepBadge>
      <div className="flex-1 min-w-0 space-y-4">
        <h3 className="font-display font-semibold text-on-surface pt-1">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const code = (text: string) => (
  <code className="bg-surface-low px-1 rounded font-mono text-xs">{text}</code>
);

export default function CmsUiExtensionsDemoPage() {
  return (
    <>
      <DemoHero
        title="CMS UI Extensions"
        description="Add your own panels to the Optimizely SaaS CMS editor. An extension is a CMS-scoped OCP app: a React bundle the CMS renders in an iframe, plus a backend function on OCP that holds the credentials and talks to other APIs."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            Beta
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Sidebar, view, property editor
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Backend runs on OCP
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            React + Axiom
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        <section id="overview">
          <DemoSectionHeading id="overview">What an extension is</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            SaaS CMS runs no code of yours, so an extension lives somewhere else: an OCP app with
            runtime {code("node22-cms-ext")}. Its UI bundle runs in the editor&apos;s browser inside
            an iframe, and its backend function runs on OCP. The two only talk through{" "}
            {code("invokeFunction")} - API keys never reach the browser and there is no CORS to set up.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One request from the sidebar
            </p>
            <Pipeline
              steps={[
                { label: "Editor opens a page", sub: "CMS knows key + version" },
                { label: "Sidebar iframe", sub: "your React bundle", highlight: true },
                { label: "invokeFunction", sub: "{ action, params }" },
                { label: "OCP function", sub: "node22-cms-ext", highlight: true },
                { label: "Your APIs", sub: "FX, CMS REST, anything" },
              ]}
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-sm">
              <TableHead columns={["Injection point", "Where it appears", "Bound to", "Context it reads"]} />
              <tbody className="divide-y divide-ghost-border">
                {INJECTION_POINTS.map((row) => (
                  <tr key={row.point} className="bg-surface-lowest hover:bg-surface-low transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-on-surface whitespace-nowrap">{row.point}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.where}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.bound}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.api}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <EditorSchematic />
        </section>

        <section id="context">
          <DemoSectionHeading id="context">What the extension can see</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            {code("register(factory)")} from {code("@optimizely/cms-extensibility-sdk")} mounts your
            React tree and hands it an {code("ExtensionContext")}. That context is the whole
            contract with the CMS - small on purpose.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-ghost-border mb-6">
            <table className="w-full text-sm">
              <TableHead columns={["Call", "Returns", "Notes"]} />
              <tbody className="divide-y divide-ghost-border">
                {CONTEXT_API.map((row) => (
                  <tr key={row.call} className="bg-surface-lowest hover:bg-surface-low transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-on-surface whitespace-nowrap">{row.call}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.returns}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout variant="warning">
            <strong>No variation, no content type and no CMS token.</strong>{" "}
            The context names the item and its version, nothing more. If the extension needs the
            item&apos;s variations, type or properties, the backend reads them from the CMS REST
            API with its own API client - for example {code("GET /v1/content/{key}/locales/{locale}")}{" "}
            lists every version, and named variations carry a {code("variation")} field. The
            editor&apos;s Variations dropdown and toolbar cannot be extended.
          </Callout>
        </section>

        <section id="setup">
          <DemoSectionHeading id="setup">Setting one up</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Start from Optimizely&apos;s sample,{" "}
            <a
              href="https://github.com/optimizely/unsplash-viewer-cms-ui-extension-ocp-app"
              className="text-brand hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              unsplash-viewer-cms-ui-extension-ocp-app
            </a>
            , and keep its Vite and OCP configs verbatim - they encode the bundle layout OCP
            expects. You need an OCP developer account, OCP CLI 2.0.15 or later, and a CMS
            instance with UI extensions enabled.
          </p>

          <div className="space-y-12">
            <SetupStep n={1} title="Declare the app and its extensions">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                An app with {code("ui_extensions")} is CMS-scoped: one install per CMS instance. That
                rules out data sync sources and Opal tools, and its functions cannot be global or
                use {code("installation_resolution")}. Each {code("entry_point")} must build to{" "}
                {code("dist/cms-ui-extensions/<entry_point>.js")}.
              </p>
              <div className="grid lg:grid-cols-2 gap-6">
                <CodeBlock code={APP_YML} language="yaml" label="app.yml" />
                <div className="space-y-6">
                  <CodeBlock code={PROPERTY_EDITOR_YML} language="yaml" label="app.yml - a property editor" />
                  <CodeBlock code={OCP_CONFIG} language="javascript" label="ocp-app.config.mjs" />
                </div>
              </div>
            </SetupStep>

            <SetupStep n={2} title="Write the UI bundle">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                Any framework works; the sample uses React 19 with{" "}
                {code("@optiaxiom/react")}, Optimizely&apos;s Axiom design system, so the panel looks
                native. Call {code("setReady()")} once mounted and always return the{" "}
                {code("subscribe")} unsubscribe from your effect.
              </p>
              <CodeBlock code={SIDEBAR_SNIPPET} language="tsx" label="FxExperiment.sidebar.tsx" />
            </SetupStep>

            <SetupStep n={3} title="Route actions in one backend function">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                One function, an {code("{ action, params }")} body, and an{" "}
                {code("{ ok, result } | { ok: false, error }")} envelope keeps every surface on the
                same backend. Credentials come from the per-install settings store, never from the
                browser.
              </p>
              <CodeBlock code={FUNCTION_SNIPPET} language="ts" label="CmsUiExtension.ts" />
            </SetupStep>

            <SetupStep n={4} title="Add a settings form">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                OCP renders {code("forms/settings.yml")} as the app&apos;s settings screen and calls{" "}
                {code("Lifecycle.onSettingsForm")} on save - validate the credentials against the
                real APIs there and only then {code("storage.settings.put")} them. A secret field
                comes back blank unless the editor retypes it, so keep the stored value when it is
                empty.
              </p>
              <CodeBlock code={SETTINGS_YML} language="yaml" label="forms/settings.yml" />
            </SetupStep>

            <SetupStep n={5} title="Test locally against a mock CMS">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                {code("ocp dev")} renders sidebar and view bundles inside a simulated CMS and runs
                your backend locally. Its <strong>Extension dev tools</strong> panel sets the
                ContentState - key, version, locale, publicUrl - and broadcasts it to the sidebar,
                so you can point the panel at a real content key. Property editors can only be
                tested after publishing.
              </p>
              <CodeBlock code={LOCAL_DEV} language="bash" label="terminal" />
            </SetupStep>

            <SetupStep n={6} title="Find the CMS instance UUID">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                Installs are scoped to a CMS instance UUID. {code("ocp accounts whoami")} lists every
                instance your login can reach - including other organizations&apos; - so do not pick
                one by name. The instance&apos;s own API token carries an {code("instanceId")} claim.
              </p>
              <CodeBlock code={INSTANCE_ID} language="bash" label="terminal" />
            </SetupStep>

            <SetupStep n={7} title="Publish, install and configure">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                {code("prepare")} uploads the source and builds it on OCP; the UI bundles are
                hosted by the platform, not by your app. Install only once the version reports
                PUBLISHED, then fill in the settings form for that install in the OCP App
                Directory and reload the CMS.
              </p>
              <CodeBlock code={DEPLOY} language="bash" label="terminal" />
            </SetupStep>
          </div>
        </section>

        <section id="gotchas">
          <DemoSectionHeading id="gotchas">Iframe and build gotchas</DemoSectionHeading>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Popups and the clipboard can be blocked",
                body: "The editor iframe may refuse window.open and the Clipboard API. Check what window.open returns and fall back to showing the URL with a copy button that uses execCommand.",
              },
              {
                title: "Inline the fonts",
                body: "Relative font URLs 404 from the CMS iframe. The sample's Vite config inlines web fonts as data URIs and injects CSS from JS, so each bundle is self-contained.",
              },
              {
                title: "Yarn Berry needs node-modules",
                body: "Plug'n'Play is not supported: set nodeLinker: node-modules in .yarnrc.yml. Yarn classic works as is.",
              },
              {
                title: "Shared code stays neutral",
                body: "src/shared is compiled into both the browser and the Node bundle, so it can use neither Node built-ins nor browser globals. Put the action contract and pure helpers there.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
                <h3 className="font-display font-semibold text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="troubleshooting">
          <DemoSectionHeading id="troubleshooting">When nothing shows up</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Installed is not the same as visible. Work down this list before changing code - the
            first row is the most common, and no amount of redeploying fixes it.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-sm">
              <TableHead columns={["Symptom", "Cause", "Fix"]} />
              <tbody className="divide-y divide-ghost-border">
                {TROUBLESHOOTING.map((row) => (
                  <tr key={row.symptom} className="bg-surface-lowest hover:bg-surface-low transition-colors align-top">
                    <td className="px-4 py-3 text-xs font-medium text-on-surface">{row.symptom}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.cause}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="fx-experiments">
          <DemoSectionHeading id="fx-experiments">Example: FX Experiments</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The extension built for this site, in the sibling repo{" "}
            {code("fx-experiments-cms-extension")}. An <strong>Experiment</strong> sidebar turns the
            open page&apos;s CMS variations into a Feature Experimentation A/B test - start, pause,
            add variations later, edit metrics and jump to results - and an{" "}
            <strong>Experiments</strong> view lists every page under test.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              Create experiment
            </p>
            <Pipeline
              steps={[
                { label: "CMS variations", sub: "made in the dropdown" },
                { label: "FX flag", sub: "cms_flag + cms_route" },
                { label: "Variations", sub: "control + one per CMS variation", highlight: true },
                { label: "A/B rule", sub: "traffic, audience, metrics" },
                { label: "Results", sub: "fetch_results_ui_url" },
              ]}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {FX_FACTS.map(({ title, body }) => (
              <div key={title} className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
                <h3 className="font-display font-semibold text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">
              Backend actions
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              Every action re-reads the page from the CMS and the rule from FX before answering,
              so the panel never shows stale state.
            </p>
            <div className="flex flex-wrap gap-2">
              {["getStatus", "createExperiment", "syncVariations", "setMetrics", "setRunning", "setRoute", "linkExisting", "unlink", "listEvents", "createEvent", "listExperiments"].map((a) => (
                <Chip key={a}>{a}</Chip>
              ))}
            </div>
          </div>

          <Callout variant="note">
            <strong>The CMS API cannot create variations.</strong>{" "}
            So the direction is one way: create the variation in the Variations dropdown, named
            exactly as the FX variation key, and the sidebar mirrors it to FX. The variation name
            rules, the {code("__v_")} URL segment and the {code("control")} impression are covered
            on the Feature Experimentation demo.
          </Callout>
        </section>

        <section id="related">
          <DemoSectionHeading id="related">Related Demos</DemoSectionHeading>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                href: "/demo/feature-experimentation",
                title: "Feature Experimentation",
                body: "How the site serves CMS variations from FX decisions - the contract the example extension writes to",
              },
              {
                href: "/demo/management-api",
                title: "Management API",
                body: "The CMS REST API an extension's backend uses to read versions, variations and properties",
              },
              {
                href: "/demo/mcp-server",
                title: "CMS MCP Server",
                body: "The other way to extend the authoring workflow - an AI assistant instead of a panel",
              },
            ].map(({ href, title, body }) => (
              <Link
                key={href}
                href={href}
                className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
              >
                <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Related Demo</p>
                <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                  {title} →
                </p>
                <p className="text-xs text-on-surface-variant">{body}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
