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
    where: "Replaces the built-in editor on the properties an admin binds it to (property settings > Editor)",
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
    symptom: "A new dev version is published but the editor still shows the old one",
    cause: "Publishing a dev version moves the existing installs onto it once it reports PUBLISHED, but an editor tab that is already open keeps the bundle it loaded.",
    fix: "Check ocp directory list-installs app@<version> lists the install, then reload the editor.",
  },
  {
    symptom: "The panel shows \"[ExtensionService] Failed to invoke function:\" with nothing after it",
    cause: "The backend threw instead of answering. Most often storage.settings.get on an install that has never saved its settings - it throws rather than returning an empty object.",
    fix: "Read ocp app logs for the real error. Guard settings reads and keep every await inside the function's try (step 3).",
  },
  {
    symptom: "A property editor publishes and installs, but the field keeps its built-in input",
    cause: "Nobody bound it to the property. The CMS mounts a property editor only where it is picked as the property's Editor, and only properties of the kind the manifest declares offer it - property_type string with no property_format means long strings, so a shortString or choice field doesn't list it.",
    fix: "Settings > Content Types > the type > the property > User Interface > Editor: pick the extension. Do it on every instance - the binding isn't in the content-type API, so a code push doesn't set it. If the Editor list doesn't show the extension, make the field a long string (type \"string\" with no format).",
  },
  {
    symptom: "ocp app logs is empty",
    cause: "CMS-scoped apps need the managing OCP account and the instance, and a function only logs what you log.",
    fix: "ocp app logs --appId app --trackerId <ocp-account> --scope <uuid> --from 1h, and log each action you route.",
  },
];

const APP_YML = `meta:
  app_id: fx_cms_experiments
  display_name: Feature Experimentation
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
      display_name: Feature Experimentation   # the panel title and rail tooltip
  view:
    - name: fx-experiments
      entry_point: FxExperiments
      display_name: Experiments`;

const PROPERTY_EDITOR_YML = `ui_extensions:
  property-editor:
    - name: product-picker
      entry_point: ProductPicker
      display_name: Product picker
      metadata:
        property_type: string   # string | richtext | integer | float | boolean
        # no property_format: offered on long strings (string, no format).
        # property_format: shortstring is the only format, and only for string.
        # json and reference properties can't get a custom editor.
        # An admin binds it per property: property settings > Editor`;

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
import { logger, storage, type ValueHash } from "@zaiusinc/app-sdk";

// Per-install values saved through forms/settings.yml. On an install that has never
// saved them, the store THROWS ("Failed to get value at app-data/<install>/settings").
async function readSection<T extends ValueHash>(key: string): Promise<T> {
  try {
    return await storage.settings.get<T>(key);
  } catch {
    return {} as T;
  }
}

export class CmsUiExtension extends App.Function {
  public async perform(): Promise<App.Response> {
    const { action, params } = this.request.bodyJSON ?? {};

    // Anything that escapes perform() reaches the editor as an empty
    // "[ExtensionService] Failed to invoke function:" - so all of it goes in the try.
    try {
      const fx = await readSection<{ apiToken?: string; projectId?: string }>("fx");
      if (!fx.apiToken) return new App.Response(412, { ok: false, error: "not_configured" });

      switch (action) {
        case "getStatus":
          return new App.Response(200, { ok: true, result: await getStatus(fx, params) });
        default:
          return new App.Response(400, { ok: false, error: "unknown_action" });
      }
    } catch (error) {
      logger.error("CmsUiExtension failure", action, error);
      return new App.Response(500, { ok: false, error: "internal_error" });
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
        key: sdkKey
        label: Site SDK key
        help: The project and environment are read from its datafile.
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
ocp app register --appId fx_cms_experiments --name "Feature Experimentation" --product HUB --personal
#   --name is fixed here: a later app.yml display_name doesn't rename the directory entry
ocp app prepare --bump-dev-version --publish       # build on OCP and publish a dev version

ocp directory status fx_cms_experiments@0.0.1-dev.1   # wait for PUBLISHED
ocp directory install fx_cms_experiments@0.0.1-dev.1 --scope <cms-instance-uuid>

# Every later dev version: publishing moves the existing installs onto it
ocp app prepare --bump-dev-version --publish
ocp directory list-installs fx_cms_experiments@0.0.1-dev.2   # which installs run it
# Move one install to a specific version
ocp directory upgrade fx_cms_experiments --scope <cms-instance-uuid> -v 0.0.1-dev.2
ocp app logs --appId fx_cms_experiments --trackerId <ocp-account> --scope <cms-instance-uuid> --from 1h`;

const GITHUB = "https://github.com/joshuaonwezen";

const EXTENSIONS = [
  {
    name: "Feature Experimentation",
    anchor: "fx-experiments",
    repo: "fx-experiments-cms-extension",
    surface: "Sidebar + view",
    talksTo: "FX Flags API, CMS REST API",
    settings: "FX token with write access and the site's SDK key; a CMS API client (write access to end tests)",
    perInstance: "-",
    reuse: "convention",
    expects: "A front end that serves CMS variations by FX decision: the CMS variation name is the FX variation key, the cms_flag and cms_route flag variables say where, and the original page counts as the control arm.",
    elsewhere: "Build that into the front end (the Feature Experimentation demo shows this site's version); the repo's docs/site-contract.md lists every rule. The extension needs only credentials, and a site with different variable names changes one object in its code.",
  },
  {
    name: "Share preview",
    anchor: "share-preview",
    repo: "preview-link-cms-extension",
    surface: "Sidebar",
    talksTo: "CMS REST API, this site's /preview/share",
    settings: "The site's preview secret; a CMS API client. Site URL optional - taken from the page's application in CMS Settings > Applications",
    perInstance: "-",
    reuse: "convention",
    expects: "A /preview/share route on the front end that checks the same signature (HMAC-SHA256 over key, version and locale) and renders the draft through Graph's App Key and secret.",
    elsewhere: "Add that route - src/lib/preview/shareLink.ts and src/app/preview/share are the reference - or point shareUrl() in the extension at your own route.",
  },
  {
    name: "Page performance",
    anchor: "page-performance",
    repo: "page-performance-cms-extension",
    surface: "Sidebar",
    talksTo: "GA4 Data API, FX Flags API and experiment results",
    settings: "GA4 property ID and service account key; FX token (read) and the site's SDK key - each optional",
    perInstance: "-",
    reuse: "partial",
    expects: "GA4 that records page paths - nothing site-specific. The experiments half reads the site's FX datafile and finds flags by this site's cms_flag and cms_route variables, per-variation values included.",
    elsewhere: "The GA4 half works as it is. For experiments, use the same flag variables, or change pageExperiments() to however your flags name their pages.",
  },
  {
    name: "Product picker",
    anchor: "product-picker",
    repo: "product-picker-cms-extension",
    surface: "Property editor",
    talksTo: "This site's /api/catalog/products",
    settings: "Site URL",
    perInstance: "Bind Product Spotlight > Product",
    reuse: "convention",
    expects: "A catalog at {site}/api/catalog/products answering { updatedAt, products: [{ id, name, category, rate }] }, and a block that renders the product from its ID.",
    elsewhere: "Serve that shape from your own API, or change the one file that reads it (src/backend/lib/catalog.ts). Bind the property on each instance.",
  },
  {
    name: "Color picker",
    anchor: "color-picker",
    repo: "color-picker-cms-extension",
    surface: "Property editor",
    talksTo: "Nothing - the palette is an app setting",
    settings: "Brand palette (optional)",
    perInstance: "Bind Campaign Banner > Background color",
    reuse: "plug",
    expects: "A long-string property to bind it to. The front end renders the stored #rrggbb however it likes.",
    elsewhere: "Nothing to change: bind the property and, optionally, save your brand palette in the settings.",
  },
  {
    name: "Link checker",
    anchor: "link-checker",
    repo: "link-checker-cms-extension",
    surface: "Sidebar",
    talksTo: "CMS REST API, Graph, this site and external URLs",
    settings: "Graph single key; a CMS API client (read). Site URL optional - taken from the page's application in CMS Settings > Applications",
    perInstance: "-",
    reuse: "plug",
    expects: "Any SaaS CMS instance. Internal links are checked at the URLs Graph gives pages, so the front end should serve those paths, as a Graph-routed site does.",
    elsewhere: "Nothing to change: fill in the Graph key and CMS client; each page is checked on the site its CMS application lists. A front end that rewrites page URLs (other domains per language, extra prefixes) would show false 404s.",
  },
  {
    name: "Redirects",
    anchor: "redirects",
    repo: "redirect-manager-cms-extension",
    surface: "View + sidebar",
    talksTo: "Graph, this site's /api/redirects, CMS REST API (writes)",
    settings: "Graph single key; a CMS API client with write access. Site URL only when the CMS serves several sites",
    perInstance: "-",
    reuse: "convention",
    expects: "This site's content model: Redirect Config and Redirect Rule types with the same keys and properties, a front end that applies them the way this site's middleware does (including never following a destination that leaves the site), and optionally /api/redirects for the live check.",
    elsewhere: "Push those two types and port the middleware check (src/lib/redirects.ts), or change graph.ts and manager.ts to your own redirect model.",
  },
  {
    name: "Translation status",
    anchor: "translations",
    repo: "translation-status-cms-extension",
    surface: "Sidebar + view",
    talksTo: "CMS REST API, Graph",
    settings: "A CMS API client (read); a Graph single key for the view and the full language list",
    perInstance: "-",
    reuse: "plug",
    expects: "Any SaaS CMS instance: it only reads the CMS REST API and Graph.",
    elsewhere: "Nothing to change: fill in the Graph key and CMS client.",
  },
];

const REUSE_LABELS: Record<string, string> = {
  plug: "Plug and play",
  partial: "Partly",
  convention: "Needs code on the site",
};

const REUSE_ORDER = ["plug", "partial", "convention"];

const OWN_COPY = `git clone https://github.com/joshuaonwezen/link-checker-cms-extension
cd link-checker-cms-extension && yarn install

# App ids are unique across OCP: pick your own in app.yml (and package.json "name")
#   meta.app_id: acme_link_checker

ocp app register --appId acme_link_checker --name "Link checker" --product HUB --personal
ocp app prepare --bump-dev-version --publish
ocp directory install acme_link_checker@0.0.1-dev.1 --scope <your-cms-instance-uuid>
# then fill in the settings for that install in the OCP App Directory`;

const FX_FACTS = [
  {
    title: "CMS variations in, FX experiment out",
    body: "The sidebar reads the open page's variations through the CMS REST API, then creates the FX flag, one FX variation per CMS variation plus control, and an A/B rule with traffic, audiences (picked by name) and metrics. Flag key, name and route are suggested and tucked under Advanced.",
  },
  {
    title: "Variable defaults, overrides read too",
    body: "cms_flag and cms_route are set as flag variable defaults, so a variation added later in the FX UI is still picked up by the site's middleware. A flag that sets them per variation instead (savings_offer does) is read correctly, because the extension takes the effective value from each variation.",
  },
  {
    title: "Routes for every URL of the page",
    body: "The middleware compares the raw request path, and English pages answer at both /savings and /en/savings. The suggested route covers both forms, and the panel flags a route that misses one, with a one-click fix. That is how cms_personal_banking, created as /en/personal-banking, would have been caught.",
  },
  {
    title: "A checklist before Start",
    body: "The page and every variation in the test must be published: a draft arm would show visitors the original page while counting them as the variation. The backend refuses to start until they are. It also warns about a missing metric, a route that misses a URL, other tests or personalization on the page, and wx_ variations.",
  },
  {
    title: "control is the original page",
    body: "No CMS variation is named control, so Graph serves the base item - and the catch-all still fires the FX impression for it, so the baseline arm is counted.",
  },
  {
    title: "The site's datafile is the authority",
    body: "The settings take the site's SDK key; project and environment are read from its datafile, so experiments land where the site decides. The same datafile tells the panel when a started test is live, which audiences exist, and which rules are serving CMS content right now.",
  },
  {
    title: "Personalization counts as a clash",
    body: "The site buckets a visitor into every CMS flag whose route covers the page, but the page shows one variation. So a running test on an overlapping route and a targeted delivery both count: the homepage persona deliveries on / and /en would otherwise take control visitors away from a homepage test. The panel names them and the button becomes Start anyway.",
  },
  {
    title: "Results in the panel",
    body: "The sidebar shows the primary metric per variation - visitors, conversion rate, lift - with significant lifts marked, read from GET /v2/experiments/{layer_experiment_id}/results. End experiment preselects a significant winner; the full FX results page is one click away.",
  },
  {
    title: "Ending a test ships the winner",
    body: "End experiment pauses the A/B rule and either adds a targeted delivery serving the winner to everyone, or publishes a new version of the page with the winner's content (an approval workflow is respected, and the step resumes once approved). Each step checks what is already done, so a retry picks up where it stopped.",
  },
  {
    title: "Cleaning up the variations",
    body: "After a test ends, the panel offers to delete its variations from the CMS - only when an admin has turned that on, after a typed confirmation, and never a winner FX still serves or a variation another live rule uses on the page. The CMS refuses to delete a published version, so those are listed for removal in the editor.",
  },
  {
    title: "Variation names it won't use",
    body: "control is the original page, and off and on are the variations FX gives every new flag, so no CMS variation may carry those names. wx_ variations belong to Web Experimentation and are never added. Adding or removing a variation on a running test asks first, and adding one keeps a custom split's proportions.",
  },
  {
    title: "A link is the extension's own record",
    body: "One row per page and locale in the install's OCP key-value store: flag, rule, environment, route, and how the test ended. Link existing flag picks from the project's CMS flags and changes nothing in FX. The site never reads links - visitors are served from FX decisions alone, so unlinking changes nothing for them.",
  },
  {
    title: "Checked input, logged changes",
    body: "Every action's parameters are checked against allow-lists before they reach an FX or CMS URL or a JSON Patch path. The extension isn't told which editor is using it, so every change it makes is logged in the app logs without a name.",
  },
  {
    title: "Settings",
    body: "Credentials only: an FX personal access token with write access to flags and events, the site's SDK key, a CMS API client (write access for ending tests) and a switch that allows deleting variations. Nothing about the site is configured - the convention is fixed in the extension, and URL forms are worked out per page.",
  },
];

const FX_FLAG_SNIPPET = `public async createFlag(
  flagKey: string,
  name: string,
  description: string,
  route: string,
  profile: SiteProfile,
): Promise<FxFlag> {
  const {markerVariable, routeVariable} = profile;
  const flag = await this.request<FxFlag>('Create flag', \`\${this.flagsBase}/flags\`, {
    method: 'POST',
    body: JSON.stringify({
      key: flagKey,
      name,
      description,
      variable_definitions: {
        [markerVariable]: {key: markerVariable, type: 'boolean', default_value: 'true'},
        [routeVariable]: {key: routeVariable, type: 'string', default_value: route},
      },
    }),
  });
  return flag as FxFlag;
}`;

const FX_LINKS_SNIPPET = `export async function getLink(contentKey: string, locale: string): Promise<ExperimentLink | null> {
  const id = field(contentKey, locale);
  const row = await storage.kvStore.get<KVHash>(LINKS_KEY, [id]);
  const link = row[id] as unknown as ExperimentLink | undefined;
  return link?.flagKey ? link : null;
}

export async function saveLink(link: ExperimentLink): Promise<void> {
  const id = field(link.contentKey, link.locale);
  await storage.kvStore.patch<KVHash>(LINKS_KEY, {[id]: link} as unknown as KVHash);
}`;

const SHARE_FACTS = [
  {
    title: "Signed by the extension, not the site",
    body: "The backend signs key, version and locale with the site's OPTIMIZELY_PREVIEW_SECRET exactly as src/lib/preview/shareLink.ts does, so the site needs no new endpoint. A unit test in the extension pins a signature produced by the site's own code, so the two can't drift apart unnoticed.",
  },
  {
    title: "Pinned to one version",
    body: "A variation is a version, so a link to a variation shows that variation's content. A link never follows later edits - share a new one after editing - and never expires. Rotating the secret on the site revokes every link at once.",
  },
  {
    title: "It checks the link opens",
    body: "After signing, the backend opens the link the way a recipient would. A 404 means the preview secret or site URL is wrong, or Graph hasn't indexed a draft you just saved.",
  },
  {
    title: "Settings",
    body: "The site's preview secret and a CMS API client to read the page's versions and which variation each belongs to. The site address comes from the page's application in CMS Settings > Applications - the editor's page URL counts only when its host is listed there - and a Site URL setting overrides it.",
  },
  {
    title: "Pages only",
    body: "The sidebar also opens on images and folders. The site only renders pages, so for those it says so instead of showing the CMS's 404.",
  },
];

const SHARE_SIGN_SNIPPET = `// Must stay identical to the signing in optimizely-nextjs-demo src/lib/preview/shareLink.ts:
// HMAC-SHA256 over "key\\nver\\nloc" with the site's OPTIMIZELY_PREVIEW_SECRET, base64url.
// The site's /preview/share checks it and renders that version through Graph's App
// Key/Secret, not the CMS's ~5-minute preview token, so the link never expires.
// Rotating the secret on the site revokes every link at once.
export function signShare(t: ShareTarget, secret: string): string {
  return createHmac('sha256', secret).update(\`\${t.key}\\n\${t.ver}\\n\${t.loc}\`).digest('base64url');
}

/** \`siteUrl\` is an origin (plus optional path) without a trailing slash. */
export function shareUrl(siteUrl: string, t: ShareTarget, secret: string): string {
  const params = new URLSearchParams({key: t.key, loc: t.loc, ver: t.ver, sig: signShare(t, secret)});
  return \`\${siteUrl}/preview/share?\${params.toString()}\`;
}`;

const SHARE_CHECK_SNIPPET = `export async function checkLink(deps: Deps, ref: ContentRef, version: string): Promise<LinkCheck> {
  if (!version) throw new ActionError('missing_version', 'No version to check.');
  const target = await resolveTarget(deps, ref);
  const url = shareUrl(deps.site.url, {key: target.key, loc: target.locale, ver: version}, deps.site.previewSecret);
  try {
    const res = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)});
    return {status: res.status, ok: res.status === 200};
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : 'failed';
    throw new ActionError('site_unreachable', \`Opening the link on \${deps.site.url} \${reason}.\`);
  }
}`;

const PERFORMANCE_FACTS = [
  {
    title: "Experiments without a site API",
    body: "The site's FX datafile (read from the SDK key) gives the running rules on flags whose cms_flag and cms_route - defaults or per-variation values - make them serve the page, checked for both /page and /en/page like the middleware sees them; the Flags API list adds names and paused experiments. Results come from GET /v2/experiments/{layer_experiment_id}/results, shown with the FX extension's own results table.",
  },
  {
    title: "GA4 through a service account",
    body: "The backend signs a JWT with the service account's key (node:crypto, no Google SDK) and queries the Data API for the page's path, with or without the locale prefix: 28 days against the 28 before, a daily chart and the top sources.",
  },
  {
    title: "What it shows",
    body: "Up front: page views against the previous 28 days with a daily chart, and each experiment with its status, visitors, conversion rate, lift and a named winner, plus links to FX. Under More detail: users, engagement, key events, top sources and a table view.",
  },
  {
    title: "Each source is optional",
    body: "GA4 and Feature Experimentation are separate settings sections, and the sidebar shows whichever is configured. The service account needs Viewer access on the GA4 property; a read-only FX token and the site's SDK key are enough, since it only reads the datafile, lists flags and reads results.",
  },
  {
    title: "Analytics can't split FX variations",
    body: "The middleware serves every FX variation on the same URL, so GA4 sees one page. The per-variation numbers come from the experiment results, not from analytics.",
  },
];

const PERFORMANCE_ROUTE_SNIPPET = `/**
 * Whether a flag's cms_route covers \`path\`, by the rules of routeMatches() in the
 * site's middleware: comma-separated entries, "/*" for everything, "/x/*" for a prefix
 * (including "/x" itself), otherwise exact. An empty route covers every path.
 */
export function routeMatches(path: string, cmsRoute: string | null | undefined): boolean {
  if (!cmsRoute || !cmsRoute.trim()) return true;
  const clean = path.replace(/\\/$/, '') || '/';
  return cmsRoute.split(',').some((raw) => {
    const entry = raw.trim();
    if (!entry) return false;
    if (entry === '/*') return true;
    if (entry.endsWith('/*')) {
      const prefix = entry.slice(0, -2).replace(/\\/$/, '') || '/';
      return clean === prefix || clean.startsWith(\`\${prefix}/\`);
    }
    return clean === (entry.replace(/\\/$/, '') || '/');
  });
}`;

const PERFORMANCE_RULES_SNIPPET = `export function pageExperiments(flags: FxFlagListItem[], cfg: FxConfig, path: string): ExperimentWithoutResults[] {
  const found = flags.flatMap((flag) => {
    const env = flag.environments?.[cfg.environmentKey];
    const cmsFlag = flag.variable_definitions?.[CMS_FLAG_VARIABLE]?.default_value;
    const route = flag.variable_definitions?.[CMS_ROUTE_VARIABLE]?.default_value ?? '';
    if (flag.archived || !env || String(cmsFlag).toLowerCase() !== 'true' || !routeMatches(path, route)) return [];
    return (env.rules_detail ?? [])
      .filter((rule) => EXPERIMENT_RULE_TYPES.has(rule.type) && rule.status !== 'archived')
      .map(
        (rule): ExperimentWithoutResults => ({
          flagKey: flag.key,
          ruleKey: rule.key,
          // ... name, type, status, traffic, variations, results and flag links
          experimentId: rule.layer_experiment_id ? String(rule.layer_experiment_id) : null,
        }),
      );
  });
  return found.sort((a, b) => Number(b.live) - Number(a.live));
}`;

const PICKER_FACTS = [
  {
    title: "The content stores an ID, the site renders the rest",
    body: "Editors pick from GET /api/catalog/products - this site's stand-in for a core-banking product API. The Product Spotlight block stores only the product ID, and renders the current name, rate and link from the same catalog, so a rate change never needs a content edit.",
  },
  {
    title: "Bound to one property",
    body: "Settings > Content Types > Product Spotlight > Product > User Interface > Editor: Product picker, on each instance - the binding isn't in the content-type REST API, so opti:push can't set it. It then works the same on a shared block and on an inline Visual Builder element. Product Spotlight's only long string is productId, so that is the only field there that offers it.",
  },
  {
    title: "Small and forgiving",
    body: "Native select, no component library: ~220 KB per iframe. If the catalog can't be read (no site URL saved, site down), the field falls back to a plain text field that says why. A stored ID the catalog no longer lists is kept and marked, not wiped.",
  },
  {
    title: "Settings",
    body: "Only the site URL - the catalog lives at /api/catalog/products, and saving checks that it lists products. The extension needs no CMS credentials.",
  },
];

const PICKER_HOOK_SNIPPET = `/** The bound string property of a property-editor extension, kept in sync with the editor. */
export function useStringProperty(context: ExtensionContext) {
  const [value, setValue] = useState('');
  const [readonly, setReadonly] = useState(true);
  // ... settings, loaded and saveError are kept the same way

  useEffect(() => {
    let active = true;
    const apply = (state: PropertyState) => {
      if (!active) return;
      setValue(typeof state.value === 'string' ? state.value : '');
      setReadonly(state.readonly);
    };
    // Initial value - subscribe() only reports later changes.
    void context.property.get().then(apply);
    const unsubscribe = context.property.subscribe(apply);
    void context.extension.setReady();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [context]);

  const save = useCallback(
    async (next: string) => {
      setValue(next);
      const result = await context.property.set(next);
      setSaveError(result.success ? null : result.error || 'The CMS rejected the value.');
    },
    [context],
  );

  return {value, readonly, settings, loaded, save, saveError};
}`;

const PICKER_SELECT_SNIPPET = `const picked = options.find((o) => o.value === value);
const groups = new Map<string, ProductOption[]>();
for (const o of options) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);

return (
  <>
    {/* Native select: the browser draws its menu, so the field's iframe can't clip it. */}
    <select aria-label="Product" disabled={readonly} onChange={(e) => onPick(e.target.value)} style={CONTROL} value={value}>
      <option value="">- Choose a product -</option>
      {/* Keep a stored ID the catalog no longer lists, so opening the item doesn't wipe it. */}
      {value && !picked && <option value={value}>{value} (not in the catalog)</option>}
      {[...groups].map(([group, items]) => (
        <optgroup key={group} label={group}>
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
    {/* ... the picked product's rate, and a warning for an ID the catalog dropped */}
  </>
);`;

const CATALOG_SNIPPET = `{
  "updatedAt": "2026-11-06",
  "products": [
    {
      "id": "easy-access-saver",
      "name": "Easy Access Saver",
      "category": "savings",
      "rate": { "value": 4.6, "label": "AER", "basis": "variable" },
      "summary": "Save from £1 and take your money out whenever you need it, with no penalties.",
      "features": ["Withdraw any time, no notice", "Open with £1", "FSCS protected up to £85,000"],
      "url": "/personal/savings/easy-access-savings",
      "icon": "savings"
    }
  ]
}`;

const COLOR_FACTS = [
  {
    title: "A color field, not a text box",
    body: "A native color swatch, a hex input that only ever saves a valid #rrggbb (or nothing), the brand palette as one-click swatches, and a readout of whether white or dark text reads better on the color, with its WCAG contrast ratio.",
  },
  {
    title: "Campaign Banner uses it",
    body: "The Campaign Banner block's Background color is a long string made for it - bind it under Settings > Content Types > Campaign Banner > Background color > Editor: Color picker, on each instance. The site picks white or dark text by the same contrast rule (src/lib/color.ts), so what the editor is shown is what renders.",
  },
  {
    title: "Brand palette in the app settings",
    body: "An admin lists the swatches as \"Lime #abff44, Mosey green #197050, ...\"; one unreadable entry rejects the whole list rather than silently dropping a brand color. Until one is saved, editors get the Mosey Bank brand colors - and can still pick any other color.",
  },
  {
    title: "Safe with bad values",
    body: "Typing #abc saves #aabbcc. A value that isn't a hex color is flagged, never saved, and snaps back when the field loses focus; dragging the native picker saves once it settles (300 ms), not on every step. On the site, the banner falls back to Mosey green and tells editors why in edit mode.",
  },
];

const COLOR_RULE_SNIPPET = `/** "#1a73e8" for a #rgb or #rrggbb value (any case, spaces trimmed), else null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return \`#\${v[1]}\${v[1]}\${v[2]}\${v[2]}\${v[3]}\${v[3]}\`;
  return null;
}

// ... luminance() and contrastRatio(): the WCAG 2.x formulas

/** White or ink text, whichever reads better on the background, and how well. */
export function readableText(background: string): {color: string; ratio: number} {
  const onWhite = contrastRatio(background, WHITE);
  const onInk = contrastRatio(background, INK);
  return onWhite >= onInk ? {color: WHITE, ratio: onWhite} : {color: INK, ratio: onInk};
}`;

const COLOR_INPUT_SNIPPET = `const commitLater = (next: string) => {
  cancelPending();
  timer.current = window.setTimeout(() => {
    timer.current = null;
    if (next !== value) void save(next);
  }, SAVE_DELAY_MS);
};

<input
  aria-invalid={invalid}
  aria-label="Hex color"
  disabled={disabled}
  onBlur={() => {
    typing.current = false;
    // Only a valid color (or nothing) is ever saved; anything else snaps back.
    if (hex || draft.trim() === '') commit(hex ?? '');
    else setDraft(value);
  }}
  onChange={(e) => {
    const next = e.target.value;
    setDraft(next);
    const valid = normalizeHex(next);
    if (valid || next.trim() === '') commitLater(valid ?? '');
    else cancelPending();
  }}
  value={draft}
/>`;

const LINKS_COLLECT_SNIPPET = `private string(value: string, where: string, propType: string | undefined, name: string) {
  if (contentKeyOf(value)) {
    // A url field links to the content; a contentReference field renders it.
    return this.add(value, propType === 'url' ? 'link' : 'reference', where);
  }
  if (looksLikeHtml(value)) return this.html(value, where);
  const linkish = propType === 'url' || ((propType === undefined || propType === 'unknown') && LINKISH_NAME.test(name));
  if (linkish && looksLikeUrl(value)) this.add(value, 'link', where);
}`;

const LINKS_CONTENT_SNIPPET = `async function judgeContent(link: FoundLink, key: string, locale: string): Promise<Partial<CheckedLink> & Judgement> {
  const isLink = link.kind === 'link';
  if (!(await item(key))) {
    return isLink
      ? {
          verdict: 'broken',
          status: 'Points at deleted content',
          hint: "The site renders nothing for this link. Pick the target again, or remove the link.",
        }
      : {verdict: 'broken', status: 'Deleted content', hint: 'This leaves a gap on the page. Remove it, or pick other content.'};
  }
  const live: PublishedItem | null = await published(\`\${key}|\${locale}\`);
  if (!live) {
    return isLink
      ? {
          verdict: 'broken',
          status: \`Target not published in \${locale}\`,
          hint: "The site hides links to content visitors can't see. Publish the target, or pick another page.",
        }
      : {verdict: 'warning', status: \`Not published in \${locale}\`, hint: "Visitors don't see it until it is published."};
  }
  if (live.url && (isLink || live.isPage)) {
    const page = await judgePage(live.url, live.url);
    return {...page, status: \`\${live.url}: \${page.status}\`};
  }
  if (isLink) return {verdict: 'warning', status: 'Links to an item with no URL', hint: 'Only pages can be linked to.'};
  return {verdict: 'ok', status: 'Published'};
}`;

const REDIRECTS_TRACE_SNIPPET = `/** Every redirect a visitor to \`path\` goes through: the browser follows each one back through the middleware. */
export function trace<R extends RedirectRule>(path: string, rules: R[]): Trace<R> {
  const hops: Array<Hop<R>> = [];
  let current = path;
  const seen = new Set([norm(current)]);
  while (!isAbsolute(current)) {
    const hit = matchRule(current, rules);
    if (!hit) break;
    hops.push({from: current, to: hit.toPath, status: hit.status, rule: hit.rule});
    current = hit.toPath;
    if (hops.length >= MAX_HOPS || (!isAbsolute(current) && seen.has(norm(current)))) return {hops, final: current, loop: true};
    seen.add(norm(current));
  }
  return {hops, final: current, loop: false};
}`;

const REDIRECTS_WRITE_SNIPPET = `/**
 * Publishes a new version of \`key\` with some properties changed and every other one kept.
 *
 * POST /versions makes a BLANK draft - it does not copy the properties of the published
 * version - so publishing a partial patch would wipe the rest. This is the site's
 * patchPublishedPageProperties() (scripts/_shared.ts): read the published properties, make
 * the draft, merge-patch the full set onto it, publish.
 */
export async function publishWithChanges(
  cms: CmsClient,
  key: string,
  locale: string,
  label: string,
  change: (current: PropertyData) => PropertyData,
): Promise<{published: boolean; version: string}> {
  const versions = await cms.listVersions(key, locale, 20);
  const live = versions.find((v) => v.status === 'published' && !v.variation);
  if (!live) throw new ActionError('not_published', \`\${label} has no published version to change.\`);

  // Someone's unpublished edit, based on the old published version, would undo this change
  // when they publish it.
  const pending = versions.find((v) => !v.variation && Number(v.version) > Number(live.version) && v.status !== 'previous');
  if (pending) {
    throw new ActionError(
      'unpublished_changes',
      \`\${label} has unpublished changes (version \${pending.version}, \${pending.status}). Publish or discard them in the CMS first, or they would undo this change.\`,
    );
  }

  await cms.createDraft(key, locale, live.displayName);
  const draft = newestDraftAfter(await cms.listVersions(key, locale, 5), live);
  if (!draft) throw new ActionError('no_draft', \`The CMS didn't create a draft of \${label}. Try again.\`);

  await cms.patchVersion(key, draft.version, {properties: change({...(live.properties ?? {})})});
  return {published: await cms.publish(key, draft.version), version: draft.version};
}`;

const TRANSLATIONS_COMPARE_SNIPPET = `export function compareFields(source: LocalizedField[], target: LocalizedField[]): Comparison {
  const byId = new Map(target.map((f) => [f.id, f]));
  const byPosition = new Map(target.map((f) => [f.position, f]));
  const result: Comparison = {empty: [], same: [], translated: 0, total: 0};
  for (const field of source) {
    if (!field.text) continue;
    result.total++;
    const text = (byId.get(field.id) ?? byPosition.get(field.position))?.text ?? '';
    if (!text) result.empty.push(field);
    else if (normalize(text) === normalize(field.text) && field.text.length > 3 && /\\p{L}/u.test(field.text)) result.same.push(field);
    else result.translated++;
  }
  return result;
}`;

const TRANSLATIONS_LOCALES_SNIPPET = `/**
 * The instance's languages, from Graph's Locales enum - the same source as the site's
 * getSupportedLocales(). The enum spells region locales with an underscore (ja_JP); the CMS
 * REST API and _metadata.locale use a hyphen (ja-JP).
 */
export async function instanceLocales(cfg: GraphConfig): Promise<string[]> {
  const data = await graphQuery<{__type?: {enumValues?: Array<{name: string}>}}>(cfg, '{ __type(name: "Locales") { enumValues { name } } }');
  return (data.__type?.enumValues ?? [])
    .map((v) => v.name)
    .filter((n) => n !== 'ALL' && n !== 'NEUTRAL')
    .map((n) => n.replace(/_/g, '-'));
}`;

const LINK_FACTS = [
  {
    title: "Finds the links the site hides",
    body: "A url field that points at internal content is stored as cms://content/{key}. When that content is deleted or unpublished, Graph can't resolve it and the site's resolveLinkHref() returns nothing - the button disappears with no error anywhere. The sidebar reports it as broken, with where it sits on the page.",
  },
  {
    title: "No per-type code",
    body: "It walks the version's properties and Visual Builder composition generically: url fields, <a href> and <img src> in rich text and HTML (a Raw HTML block included), blocks in content areas and image fields, and the shared blocks the page uses, one level deep. Content type definitions only supply the labels.",
  },
  {
    title: "Opened the way a visitor would",
    body: "Site paths are fetched on the site with redirects off: a 404 is broken, a redirect to another page is worth a look (link to the target directly), and a trailing-slash redirect is followed to where it lands. External URLs get HEAD, then GET; a 401, 403 or 429 means it couldn't check, not that the link is broken.",
  },
  {
    title: "Settings",
    body: "The instance's Graph single key (published content only - what visitors get) and a read-only CMS API client. Each page is checked on its own site, taken from its application in CMS Settings > Applications; a Site URL setting overrides that. Variation versions can't be read through the CMS API, so on one it offers to check the original page instead.",
  },
  {
    title: "Never fetches internal addresses",
    body: "External URLs come from page content, so each check is screened before it runs: http(s) on ports 80 and 443, no internal host names or IP addresses, every address the host resolves to must be public, and redirects are followed by hand with each hop screened again. A refused link shows as not checked, with the reason.",
  },
];

const REDIRECT_FACTS = [
  {
    title: "The same rules as the middleware",
    body: "src/shared/redirects.ts reproduces this site's normalizeRedirectPath(), the filter and sort in getRedirectRules() and matchRedirect(), and a test pins their behavior - so Test a URL shows exactly the hops a visitor gets. A rule the site ignores - a path a browser would read as another website, or an http destination - shows as ignored, never as fine. As on the site, only the newest Redirect Config counts.",
  },
  {
    title: "A check on every rule",
    body: "Loops, chains (point A at C directly), duplicates that never fire, rules that point at themselves, destinations that 404 on the site, rules that hide a published page, and rules saved in the CMS that the site's /api/redirects doesn't serve yet.",
  },
  {
    title: "Per page, in the sidebar",
    body: "The redirects that end on the open page (/x and /en/x count as one page, as the catch-all does), a warning when a rule makes the page's own URL unreachable, and older URL segments of the page that nothing redirects - one click adds the redirect.",
  },
  {
    title: "Writes that keep everything else",
    body: "Adding a rule creates a Redirect Rule block in the config's own folder and publishes a new Redirect Config version with every property of the published one plus the new reference. It refuses while someone else has unpublished changes, and leaves drafts for a reviewer on an approval instance. The CMS history shows the API client, not the editor.",
  },
  {
    title: "Risky changes ask first",
    body: "Adding a redirect to another website, to a page that doesn't exist, from a published page's own URL, or for a whole top-level section asks for confirmation before anything is written. Every change is written to the app log, since the CMS history only shows the API client.",
  },
];

const TRANSLATION_FACTS = [
  {
    title: "Field by field",
    body: "Each language's newest version is compared with the published version of the language the item was created in: fields that are empty, fields still word for word the source, and whether it was last changed before the source. Only fields their content type marks isLocalized count, inline Visual Builder blocks included.",
  },
  {
    title: "The instance's languages, from Graph",
    body: "The Locales enum, the same source as the site's getSupportedLocales(), so a language with no version yet still shows, as not translated. The enum spells ja_JP where the CMS API and _metadata.locale say ja-JP; the extension uses the hyphen. Without the Graph key the sidebar still compares the languages the item has, and says untranslated ones can't be listed.",
  },
  {
    title: "Coverage across the site",
    body: "The Translations view counts the published pages per language from Graph, flags those older than the source and lists pages with gaps first. The single key sees published versions only, so a draft-only language counts as missing there; the sidebar shows drafts too.",
  },
  {
    title: "It catches an empty source too",
    body: "When the source language's own localized fields are empty, there is nothing to translate - the sidebar says so. That is how a page whose properties were wiped by a blank version shows up.",
  },
];

const TESTING_FACTS = [
  {
    title: "yarn validate in every repo",
    body: "Lint, typecheck, unit tests, the build and ocp-app-sdk validate. The unit tests cover the pure parts: route matching, the traffic split, the share signature, the catalog mapping, hex parsing and contrast, link collection, redirect loops and chains, field comparison, and the settings forms.",
  },
  {
    title: "Live suites against the real APIs",
    body: "Every sidebar or view extension has a tests/live suite behind an env flag (FX_LIVE, PREVIEW_LIVE, PERF_LIVE, LINKS_LIVE, REDIRECTS_LIVE, TRANSLATIONS_LIVE). Only the FX one writes: it creates throwaway cms_ext_smoke_* and cms_ext_e2e_* flags and archives them afterwards. The others only read - the Redirects writes are tried by hand, on a throwaway rule.",
  },
  {
    title: "Held to the site's own code",
    body: "Where an extension repeats logic the site owns, it is kept in step with it: Share preview's test pins a signature produced by src/lib/preview/shareLink.ts, Page performance copies the middleware's routeMatches, Redirects copies matchRedirect() and getRedirectRules(), and the site's src/lib/color.ts mirrors the color picker's readableText.",
  },
  {
    title: "Property editors need a real CMS",
    body: "ocp dev renders sidebars and views but not property editors, so the two pickers are tried after publishing a dev version, on an instance where the property is bound.",
  },
];

function FactGrid({ facts }: { facts: Array<{ title: string; body: string }> }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {facts.map(({ title, body }) => (
        <div key={title} className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
          <h3 className="font-display font-semibold text-on-surface mb-2">{title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  );
}

function RepoLink({ repo }: { repo: string }) {
  return (
    <a
      href={`${GITHUB}/${repo}`}
      className="font-mono text-xs text-brand hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {repo}
    </a>
  );
}

function SourceLine({ repo }: { repo: string }) {
  return (
    <p className="text-sm text-on-surface-variant mb-8">
      Source on GitHub: <RepoLink repo={repo} />
    </p>
  );
}

function Excerpts({ items }: { items: Array<{ code: string; label: string; language: string }> }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6 mb-8 [&>*]:min-w-0">
      {items.map(({ code, label, language }) => (
        <CodeBlock key={label} code={code} language={language} label={label} />
      ))}
    </div>
  );
}

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

          <Callout variant="warning">
            <strong>Property editors work - on the properties you bind them to.</strong>{" "}
            Every property of the kind the manifest declares ({code("property_type")} plus optional{" "}
            {code("property_format")} - no format means long strings) offers the extension under{" "}
            <strong>Settings &gt; Content Types &gt; the property &gt; User Interface &gt; Editor</strong>,
            and the CMS mounts it only where it is picked there. That binding lives in the CMS, not in
            the content-type API or your code, so set it on each instance. The editor itself isn&apos;t
            told which property it is on - it gets the value, a readonly flag and {code("settings")}{" "}
            (empty so far), and for an inline Visual Builder element {code("content.get()")} returns
            the page, not the element.
          </Callout>

          <div className="mt-8">
            <EditorSchematic />
          </div>
        </section>

        <section id="examples">
          <DemoSectionHeading id="examples">The example extensions</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Each one below is its own OCP app and repo, so a CMS instance installs only what it
            needs. Every one is installed per instance with {code("--scope")} and configured in that
            install&apos;s settings in the OCP App Directory; a property editor is also bound to its
            property by hand on each instance.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-sm">
              <TableHead columns={["Extension", "Surface", "Backend talks to", "Settings", "Per instance", "Source"]} />
              <tbody className="divide-y divide-ghost-border">
                {EXTENSIONS.map((row) => (
                  <tr key={row.anchor} className="bg-surface-lowest hover:bg-surface-low transition-colors align-top">
                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                      <a href={`#${row.anchor}`} className="text-brand hover:underline">
                        {row.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">{row.surface}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.talksTo}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.settings}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.perInstance}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <RepoLink repo={row.repo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="reuse">
          <DemoSectionHeading id="reuse">Using them on another instance</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            None of these is installed from a store. Each is registered as a personal app with dev versions only, so its
            developer installs it on the instances their login reaches. Anyone else runs their own copy: clone the repo,
            give it an app id of their own, register, publish and install it - every repo&apos;s README has the commands.
            Whether that copy needs code changes depends on how much of this site it relies on.
          </p>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Two things hold for all of them: the CMS instance must have UI extensions enabled (still a beta), and the
            install lands in the OCP account that manages that instance. To share a copy with the other developers in your
            organization, register it without {code("--personal")}; anything wider needs a production version, which
            Optimizely reviews.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-sm">
              <TableHead columns={["Extension", "Works elsewhere", "What it expects", "To use it on another site"]} />
              <tbody className="divide-y divide-ghost-border">
                {[...EXTENSIONS]
                  .sort((a, b) => REUSE_ORDER.indexOf(a.reuse) - REUSE_ORDER.indexOf(b.reuse))
                  .map((row) => (
                    <tr key={row.anchor} className="bg-surface-lowest hover:bg-surface-low transition-colors align-top">
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                        <a href={`#${row.anchor}`} className="text-brand hover:underline">
                          {row.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-on-surface whitespace-nowrap">
                        {REUSE_LABELS[row.reuse]}
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{row.expects}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{row.elsewhere}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <CodeBlock code={OWN_COPY} language="bash" label="Your own copy of one" />
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
            editor&apos;s Variations dropdown and toolbar cannot be extended. The sidebar also opens on
            images and folders and still reports the editor&apos;s locale, which they don&apos;t have -
            that {code("locales/{locale}")} call answers them with a 404, so check the item&apos;s{" "}
            {code("locales")} before treating it as an error.
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
                {code("subscribe")} unsubscribe from your effect. A property editor uses the same{" "}
                {code("register()")} but reads and writes its field through {code("context.property")} -
                the{" "}
                <a href="#product-picker" className="text-brand hover:underline">
                  Product picker
                </a>{" "}
                example shows the hook both pickers share.
              </p>
              <CodeBlock code={SIDEBAR_SNIPPET} language="tsx" label="FxExperiment.sidebar.tsx" />
            </SetupStep>

            <SetupStep n={3} title="Route actions in one backend function">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                One function, an {code("{ action, params }")} body, and an{" "}
                {code("{ ok, result } | { ok: false, error }")} envelope keeps every surface on the
                same backend. Credentials come from the per-install settings store, never from the
                browser. Keep every {code("await")} inside one {code("try")}: an exception that escapes{" "}
                {code("perform()")} reaches the editor as an empty &ldquo;Failed to invoke function:&rdquo;.
              </p>
              <CodeBlock code={FUNCTION_SNIPPET} language="ts" label="CmsUiExtension.ts" />
            </SetupStep>

            <SetupStep n={4} title="Add a settings form">
              <p className="text-sm text-on-surface-variant max-w-3xl">
                OCP renders {code("forms/settings.yml")} as the app&apos;s settings screen and calls{" "}
                {code("Lifecycle.onSettingsForm")} on save - validate the credentials against the
                real APIs there and only then {code("storage.settings.put")} them. A secret field
                comes back blank unless the editor retypes it, so keep the stored value when it is
                empty - and read that stored value through the same guard, because on a fresh install{" "}
                {code("storage.settings.get")} throws and the first Save would fail. The file is required
                even when an app has no settings: {code("sections: []")} passes validation.
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
                Directory and reload the CMS. Later dev versions published the same way replace the
                running one on existing installs.
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
                body: "The editor iframe may refuse window.open and the Clipboard API. Call window.open without the noopener feature - with it the call returns null even when the tab opened - then set opener to null on the new window, and fall back to the URL with an execCommand copy button only when it really returns null.",
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
                title: "One extension per app",
                body: "Give each panel its own OCP app and repo rather than bundling several into one. Each gets its own install, settings, version and logs, so a CMS instance installs only what it needs and one broken backend can't take the other panels down.",
              },
              {
                title: "Wrap Axiom Alert text in one Text",
                body: "Alert lays out its children as flex items, so loose text next to a <code> or an expression breaks into separate lines with gaps. Put the whole message in a single <Text>.",
              },
              {
                title: "Shared code stays neutral",
                body: "src/shared is compiled into both the browser and the Node bundle, so it can use neither Node built-ins nor browser globals. Put the action contract and pure helpers there.",
              },
              {
                title: "prepare can upgrade the app SDK",
                body: "ocp app prepare may bump @zaiusinc/app-sdk to its latest version even without --upgrade-deps. Re-run the tests afterwards and commit package.json and the lockfile with the release.",
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
          <DemoSectionHeading id="fx-experiments">Example: Feature Experimentation</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>Feature Experimentation</strong> sidebar
            turns the open page&apos;s CMS variations into an A/B test - checks it is ready, starts and
            pauses it, changes it while it runs and jumps to results - then ends it by shipping the
            winner and cleaning up the variations. It can also link the page to a flag you already
            have. An <strong>Experiments</strong> view lists every linked page.
          </p>
          <SourceLine repo="fx-experiments-cms-extension" />

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
                { label: "Winner", sub: "FX delivery or CMS publish" },
              ]}
            />
          </div>

          <FactGrid facts={FX_FACTS} />

          <Excerpts
            items={[
              { code: FX_FLAG_SNIPPET, language: "ts", label: "src/backend/lib/fx.ts (excerpt)" },
              { code: FX_LINKS_SNIPPET, language: "ts", label: "src/backend/lib/links.ts (excerpt)" },
            ]}
          />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">
              Backend actions
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              Every action re-reads the page from the CMS and the rule from FX before answering,
              so the panel never shows stale state.
            </p>
            <div className="flex flex-wrap gap-2">
              {["getStatus", "createExperiment", "syncVariations", "removeVariations", "setMetrics", "setTraffic", "setAudiences", "setRunning", "setRoute", "endExperiment", "deleteVariations", "archiveFlag", "linkExisting", "unlink", "listEvents", "createEvent", "listAudiences", "listCmsFlags", "listExperiments", "forgetLink"].map((a) => (
                <Chip key={a}>{a}</Chip>
              ))}
            </div>
          </div>

          <Callout variant="note">
            <strong>The CMS API cannot create variations.</strong>{" "}
            So the direction is one way: create the variation in the Variations dropdown, named
            exactly as the FX variation key, and the sidebar mirrors it to FX. Deleting goes the
            other way only after a test ends. The variation name
            rules, the {code("__v_")} URL segment and the {code("control")} impression are covered
            on the Feature Experimentation demo.
          </Callout>
        </section>

        <section id="share-preview">
          <DemoSectionHeading id="share-preview">Example: Share preview</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>Share preview</strong>{" "}
            sidebar gives the editor a link to the exact version open in the editor - its content and
            its variation - that anyone can open without a CMS login and that never expires. It also
            lists a link to the newest version of the original page and of each variation.
          </p>
          <SourceLine repo="preview-link-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One share link
            </p>
            <Pipeline
              steps={[
                { label: "Editor opens a version", sub: "key + version + locale" },
                { label: "OCP function", sub: "signs with the preview secret", highlight: true },
                { label: "/preview/share", sub: "key, loc, ver, sig" },
                { label: "This site", sub: "verifies, reads Graph with App Key", highlight: true },
                { label: "Recipient", sub: "no login, no expiry" },
              ]}
            />
          </div>

          <FactGrid facts={SHARE_FACTS} />

          <Excerpts
            items={[
              { code: SHARE_SIGN_SNIPPET, language: "ts", label: "src/backend/lib/shareLink.ts (excerpt)" },
              { code: SHARE_CHECK_SNIPPET, language: "ts", label: "src/backend/lib/links.ts (excerpt)" },
            ]}
          />

          <Callout variant="note">
            <strong>It needs the site&apos;s signed route.</strong>{" "}
            The CMS&apos;s {code("preview_token")} lasts about five minutes, no API issues a longer one,
            and Graph rejects the CMS API client&apos;s own token for drafts. Only the site can render a
            draft in its real design, so the link points at this site&apos;s{" "}
            <Link href="/demo/preview#external-preview" className="text-brand hover:underline">
              /preview/share route
            </Link>
            . On another front end, the extension needs an equivalent signed route there.
          </Callout>
        </section>

        <section id="page-performance">
          <DemoSectionHeading id="page-performance">Example: Page performance</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>Page performance</strong> sidebar shows how the open page performs: GA4 traffic for the
            last 28 days against the 28 before, and every Feature Experimentation test that targets the
            page, with its status, traffic, variations and primary-metric results. It needs no API on the
            site.
          </p>
          <SourceLine repo="page-performance-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One sidebar load
            </p>
            <Pipeline
              steps={[
                { label: "Editor opens a page", sub: "publicUrl gives the path" },
                { label: "OCP function", sub: "loads both sources independently", highlight: true },
                { label: "GA4 Data API", sub: "28 days vs the 28 before" },
                { label: "FX Flags API", sub: "rules whose cms_route covers the path" },
                { label: "Sidebar", sub: "traffic + experiment results", highlight: true },
              ]}
            />
          </div>

          <FactGrid facts={PERFORMANCE_FACTS} />

          <Excerpts
            items={[
              { code: PERFORMANCE_ROUTE_SNIPPET, language: "ts", label: "src/shared/path.ts (excerpt)" },
              { code: PERFORMANCE_RULES_SNIPPET, language: "ts", label: "src/backend/lib/fx.ts (excerpt)" },
            ]}
          />
        </section>

        <section id="product-picker">
          <DemoSectionHeading id="product-picker">Example: Product picker</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>property editor</strong>{" "}
            that turns the Product field of a <strong>Product Spotlight</strong> block into a dropdown of
            the bank&apos;s products, grouped by category with each product&apos;s rate.
          </p>
          <SourceLine repo="product-picker-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One bound property
            </p>
            <Pipeline
              steps={[
                { label: "Admin binds it", sub: "property > Editor" },
                { label: "CMS mounts the editor", sub: "on that property only" },
                { label: "OCP function", sub: "reads the catalog", highlight: true },
                { label: "Catalog dropdown", sub: "stores the product ID" },
                { label: "Site renders", sub: "name + rate from the catalog", highlight: true },
              ]}
            />
          </div>

          <FactGrid facts={PICKER_FACTS} />

          <Excerpts
            items={[
              { code: PICKER_HOOK_SNIPPET, language: "ts", label: "src/cms-ui-extensions/common/useProperty.ts (excerpt)" },
              { code: PICKER_SELECT_SNIPPET, language: "tsx", label: "src/cms-ui-extensions/picker/ProductPicker.tsx (excerpt)" },
            ]}
          />

          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The catalog contract. The picker reads {code("id")}, {code("name")}, {code("category")} and{" "}
            {code("rate")}; the site renders the rest from its own copy of{" "}
            {code("src/lib/catalog/productCatalog.json")}.
          </p>
          <CodeBlock code={CATALOG_SNIPPET} language="json" label="GET /api/catalog/products (first product)" />
        </section>

        <section id="color-picker">
          <DemoSectionHeading id="color-picker">Example: Color picker</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A second <strong>property editor</strong>, with
            no API behind its choices this time: it turns the Background color of a <strong>Campaign Banner</strong>{" "}
            into a color field. Both editors are offered on long strings; the Editor setting on each property decides
            which one, if any, it gets.
          </p>
          <SourceLine repo="color-picker-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One bound property
            </p>
            <Pipeline
              steps={[
                { label: "Admin binds it", sub: "Background color > Editor" },
                { label: "Color field", sub: "swatch, hex, palette", highlight: true },
                { label: "OCP function", sub: "serves the palette setting" },
                { label: "Stored value", sub: "#rrggbb or empty" },
                { label: "Site renders", sub: "same contrast rule", highlight: true },
              ]}
            />
          </div>

          <FactGrid facts={COLOR_FACTS} />

          <Excerpts
            items={[
              { code: COLOR_RULE_SNIPPET, language: "ts", label: "src/shared/color.ts (excerpt)" },
              { code: COLOR_INPUT_SNIPPET, language: "tsx", label: "src/cms-ui-extensions/color/ColorField.tsx (excerpt)" },
            ]}
          />
        </section>

        <section id="link-checker">
          <DemoSectionHeading id="link-checker">Example: Link checker</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>Link checker</strong> sidebar opens every link on the version in the editor - on the page, in its
            inline blocks and in the shared blocks it uses - and lists them broken first, each with where it sits and what
            to do about it.
          </p>
          <SourceLine repo="link-checker-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              One check
            </p>
            <Pipeline
              steps={[
                { label: "Editor opens a version", sub: "key + version + locale" },
                { label: "OCP function", sub: "reads it and its shared blocks", highlight: true },
                { label: "Graph", sub: "resolves cms://content links" },
                { label: "This site", sub: "opens each path like a visitor" },
                { label: "Sidebar", sub: "broken first", highlight: true },
              ]}
            />
          </div>

          <FactGrid facts={LINK_FACTS} />

          <Excerpts
            items={[
              { code: LINKS_COLLECT_SNIPPET, language: "ts", label: "src/backend/lib/collect.ts (excerpt)" },
              { code: LINKS_CONTENT_SNIPPET, language: "ts", label: "src/backend/lib/checker.ts (excerpt)" },
            ]}
          />
        </section>

        <section id="redirects">
          <DemoSectionHeading id="redirects">Example: Redirects</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            The first example that writes content. A <strong>Redirects</strong> view lists every rule in the{" "}
            <Link href="/demo/redirects" className="text-brand hover:underline">
              Redirect Config
            </Link>{" "}
            the middleware reads, checks each one and tests any URL; a <strong>Redirects</strong> sidebar shows the rules
            about the open page. Both can add a redirect, and the view switches rules on and off.
          </p>
          <SourceLine repo="redirect-manager-cms-extension" />

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-8">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              Add redirect
            </p>
            <Pipeline
              steps={[
                { label: "Editor fills in the rule", sub: "checked as they type" },
                { label: "OCP function", sub: "checks again against the CMS", highlight: true },
                { label: "Redirect Rule", sub: "new block, published" },
                { label: "Redirect Config", sub: "new version, every property kept" },
                { label: "This site", sub: "once its redirect cache refreshes", highlight: true },
              ]}
            />
          </div>

          <FactGrid facts={REDIRECT_FACTS} />

          <Excerpts
            items={[
              { code: REDIRECTS_TRACE_SNIPPET, language: "ts", label: "src/shared/redirects.ts (excerpt)" },
              { code: REDIRECTS_WRITE_SNIPPET, language: "ts", label: "src/backend/lib/writes.ts (excerpt)" },
            ]}
          />

          <Callout variant="note">
            <strong>When a change goes live.</strong>{" "}
            The middleware reads {code("/api/redirects")}, which is cached: the CMS publish webhook refreshes it within a minute,
            and without the webhook it waits for the 1-hour ceiling. Graph also refreshes its copy of a rule inside Redirect
            Config minutes after the rule itself, so switching a rule publishes Redirect Config again too. The view shows both
            states - &ldquo;Not live yet&rdquo; and &ldquo;Changed, not applied&rdquo; - until they settle.
          </Callout>
          <Callout variant="note" className="mt-4">
            <strong>Re-seeding drops rules added here.</strong>{" "}
            {code("scripts/seed-redirects.ts")} rebuilds Redirect Config from the seed&apos;s own list, so a rule added in the
            editor falls out of it - its block stays in the Redirects folder. Add it again after a re-seed, or put it in the seed.
          </Callout>
        </section>

        <section id="translations">
          <DemoSectionHeading id="translations">Example: Translation status</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-3 max-w-3xl">
            A <strong>Translations</strong> sidebar shows every language of the instance for the open item - published,
            draft only or missing - and which of its localized fields are still empty or untranslated. A{" "}
            <strong>Translations</strong> view shows how far each language covers the site. It pairs with the{" "}
            <Link href="/demo/localization" className="text-brand hover:underline">
              Localization
            </Link>{" "}
            demo.
          </p>
          <SourceLine repo="translation-status-cms-extension" />

          <FactGrid facts={TRANSLATION_FACTS} />

          <Excerpts
            items={[
              { code: TRANSLATIONS_COMPARE_SNIPPET, language: "ts", label: "src/backend/lib/fields.ts (excerpt)" },
              { code: TRANSLATIONS_LOCALES_SNIPPET, language: "ts", label: "src/backend/lib/graph.ts (excerpt)" },
            ]}
          />
        </section>

        <section id="testing">
          <DemoSectionHeading id="testing">How the examples are tested</DemoSectionHeading>
          <FactGrid facts={TESTING_FACTS} />
        </section>

        <section id="related">
          <DemoSectionHeading id="related">Related Demos</DemoSectionHeading>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                href: "/demo/feature-experimentation",
                title: "Feature Experimentation",
                body: "How the site serves CMS variations from FX decisions - the contract the example extension writes to",
              },
              {
                href: "/demo/preview",
                title: "Preview",
                body: "The /preview/share route the Share preview extension signs links for, and why the CMS preview token can't be shared",
              },
              {
                href: "/demo/management-api",
                title: "Management API",
                body: "The CMS REST API an extension's backend uses to read versions, variations and properties",
              },
              {
                href: "/demo/redirects",
                title: "URL Redirects",
                body: "The Redirect Config and middleware the Redirects extension reads, checks and writes",
              },
              {
                href: "/demo/localization",
                title: "Localization",
                body: "The language versions and supported locales the Translation status extension reports on",
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
