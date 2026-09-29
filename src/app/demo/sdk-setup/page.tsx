import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import InlineCode from "@/components/demo/InlineCode";

export const metadata: Metadata = {
  title: "SDK Reference",
};

const INSTALL_SNIPPET = `npm i @optimizely/cms-sdk
npm i -D @optimizely/cms-cli

# optimizely.config.mjs   buildConfig() + page/experience types + contracts
# src/components/**       one contentType() + displayTemplate()s + component per file
# src/lib/registry.ts     config() + initContentTypeRegistry() + initReactComponentRegistry()
# src/app/[[...slug]]     getContentByPath()`;

const PUSH_SNIPPET = `# Credentials are NOT read from .env files. Inject them inline.
# Do not pass --host on SaaS: the tenant comes from the credentials.
OPTIMIZELY_CMS_CLIENT_ID=x OPTIMIZELY_CMS_CLIENT_SECRET=y \\
  npx @optimizely/cms-cli config push optimizely.config.mjs --dryRun

npx @optimizely/cms-cli config push optimizely.config.mjs            # push
npx @optimizely/cms-cli config push optimizely.config.mjs -- --force # breaking changes
npx @optimizely/cms-cli config pull --output ./src/content-types --group
npx @optimizely/cms-cli login
npx @optimizely/cms-cli config delete <file>
npx @optimizely/cms-cli danger delete-all-content-types`;

const REGISTRY_SNIPPET = `import { config, initContentTypeRegistry, initDisplayTemplateRegistry,
         BlankExperienceContentType, BlankSectionContentType } from "@optimizely/cms-sdk";
import { initReactComponentRegistry, initForms } from "@optimizely/cms-sdk/react/server";

config({ apiKey: process.env.GRAPH_SINGLE_KEY, graphUrl: process.env.GRAPH_GATEWAY });

initContentTypeRegistry([BlankExperienceContentType, BlankSectionContentType, ProductPageType]);
initDisplayTemplateRegistry([ProductCardTemplate]);
initReactComponentRegistry({ resolver: { ProductPage, "HeroBlock:Compact": CompactHero } });
initForms({ container, textbox, textarea, selection, submit });   // only if Forms is on

// The registry decides what the generated query can select.
// Registered but not pushed = every query fails. Pushed but not registered = invisible.`;

const KITCHEN_SINK_SNIPPET = `import { contentType } from "@optimizely/cms-sdk";

export const ProductPageType = contentType({
  key: "ProductPage",
  displayName: "Product",
  description: "Shown under the name in the CMS.",
  baseType: "_page",
  extends: [SEOContract, ComplianceContract],      // contracts, single or array
  mayContainTypes: ["_self", "ComparisonPage"],    // children in the content TREE

  properties: {
    name:     { type: "string", displayName: "Name", isRequired: true, isLocalized: true,
                indexingType: "searchable", sortOrder: 0 },
    code:     { type: "string", pattern: "^P-\\\\d{4}$", minLength: 6, maxLength: 6,
                indexingType: "queryable" },
    family:   { type: "string", indexingType: "queryable",
                enum: [{ value: "a", displayName: "Family A" },
                       { value: "b", displayName: "Family B" }] },
    summary:  { type: "string", maxLength: 180, isLocalized: true, indexingType: "searchable" },
    body:     { type: "richText", editorSettings: { preset: "expanded" }, isLocalized: true,
                indexingType: "searchable" },              // preset: default | expanded | minimal
    rate:     { type: "float", minimum: 0, maximum: 20, indexingType: "queryable", group: "Rates" },
    stock:    { type: "integer", minimum: 0, maximum: 9999, indexingType: "queryable" },
    notice:   { type: "integer", indexingType: "queryable",
                enum: [{ value: 0, displayName: "None" }, { value: 30, displayName: "30 days" }] },
    featured: { type: "boolean", indexingType: "queryable" },
    launchAt: { type: "dateTime", minimum: "2020-01-01T00:00:00Z", indexingType: "queryable" },
    applyUrl: { type: "url" },                             // plain URL / content picker
    guidance: { type: "link" },                            // href + text + target + title
    matrix:   { type: "json", isLocalized: true },         // opaque: never filterable
    benefits: { type: "array", items: { type: "string", maxLength: 90 },
                minItems: 3, maxItems: 6, isLocalized: true, indexingType: "searchable" },
    tiers:    { type: "array", minItems: 1,
                items: { type: "content", allowedTypes: [TierBlockType] } },     // inline expanded
    related:  { type: "array", maxItems: 4,
                items: { type: "contentReference", allowedTypes: ["ProductPage"] } }, // { key, url }
    image:    { type: "contentReference", allowedTypes: ["_image"], isRequired: true },
    lead:     { type: "content", contentType: AuthorBlockType },
    legal:    { type: "component", contentType: DisclosureComponentType },  // embedded, no key
    legacy:   { type: "string", displayMode: "hidden", indexingType: "queryable" },
    internal: { type: "string", indexingType: "disabled" },  // editable, never indexed
  },
});`;

const ELEMENT_BLOCK_SNIPPET = `// Leaf block: fits in a grid column, CANNOT have content areas.
export const TierBlockType = contentType({
  key: "TierBlock",
  displayName: "Tier",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", isLocalized: true, isRequired: true },
    from:  { type: "integer", indexingType: "queryable" },
    rate:  { type: "float", indexingType: "queryable" },
  },
});`;

const SECTION_BLOCK_SNIPPET = `// Container block: CAN have content areas, cannot sit in a grid column.
export const FaqContainerType = contentType({
  key: "FaqContainer",
  displayName: "FAQ Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: { type: "string", isLocalized: true },
    items: {
      type: "array",
      items: { type: "content", allowedTypes: [FaqItemType] },
    },
  },
});`;

const CONTRACT_SNIPPET = `import { contract } from "@optimizely/cms-sdk";

export const SEOContract = contract({
  key: "SEO",                       // key, displayName, properties. Nothing else.
  displayName: "SEO",
  properties: {
    metaTitle:       { type: "string", isLocalized: true, group: "SEO", sortOrder: 0 },
    metaDescription: { type: "string", isLocalized: true, group: "SEO", sortOrder: 1 },
    ogImage:         { type: "contentReference", allowedTypes: ["_image"], group: "SEO" },
  },
});

// Merged at definition time, so the registry and the generated fragments see the
// full set. Export it from optimizely.config.mjs or the push never creates it.`;

const EXPERIENCE_SNIPPET = `// A .mjs file: type "composition" is not in the TS typings, the runtime takes it.
export const LandingExperienceType = contentType({
  key: "LandingExperience",
  displayName: "Landing",
  baseType: "_experience",
  extends: SEOContract,
  properties: {
    topComposition: {
      type: "composition",
      format: "outline",            // mandatory, immutable once it holds content
      displayName: "Top (locked)",
      allowedTypes: ["HeroBlock", "BlankSection"],
      sortOrder: 0,
    },
    middleComposition: { type: "composition", format: "outline", sortOrder: 1 },
  },
  // The built-in composition: name reserved, always sorts last, restrict it here.
  composition: { allowedTypes: ["FaqContainer"] },
});`;

const TEMPLATE_SNIPPET = `import { displayTemplate } from "@optimizely/cms-sdk";

export const ProductCardTemplate = displayTemplate({
  key: "ProductCardTemplate",
  displayName: "Card",
  isDefault: true,
  contentType: "ProductPage",     // or nodeType: "row" | "column" | "section"
  tag: "Card",                    // matches the "ProductPage:Card" resolver key
  settings: {
    background: {
      editor: "select",           // "select" | "checkbox"
      displayName: "Background",
      sortOrder: 0,
      choices: {                  // choices, NOT enum. First by sortOrder is the default.
        white: { displayName: "White", sortOrder: 0 },
        brand: { displayName: "Blue",  sortOrder: 1 },
      },
    },
    boxed: { editor: "checkbox", displayName: "Boxed", choices: {} },
  },
});`;

const CONFIG_SNIPPET = `import { config, getClient, GraphClient } from "@optimizely/cms-sdk";

config({
  apiKey: process.env.GRAPH_SINGLE_KEY,       // sent as "epi-single <key>"
  graphUrl: process.env.GRAPH_GATEWAY,        // https://cg.optimizely.com/content/v2
  userAgent: "MyApp/1.0",

  query: {           // per-request defaults, overridable on any single call
    cache: true,     // Graph's own CDN
    stored: true,    // ?stored=true, lets the server reuse query plans
    slot: "Current", // "New" hits the index being rebuilt during a smooth rebuild
    host: undefined, // path lookups only, for one CMS serving several sites
  },

  fragment: {        // FIXED at construction. Need different values? Separate client.
    richTextFormat: "json",   // json (default) | html | both. Reading .html without this = undefined
    compositionDepth: 4,
    expandContracts: true,
    maxThreshold: 100,        // fragments per content area before it throws
    dam: "automatic",         // automatic | on | off
    typeFilter: (key) => key !== "LegacyBlock",
  },
});

getClient();                                         // uses the global config
getClient({ query: { host: "other.example.com" } }); // one-off override
new GraphClient(apiKey, { fragment: { dam: "off" } });`;

const DEBUG_SNIPPET = `// 1. Log every generated query. request() is the single funnel: getContentByPath,
//    getContent, getPreviewContent, getPath and getItems all route through it.
import { GraphClient } from "@optimizely/cms-sdk";

const original = GraphClient.prototype.request;
GraphClient.prototype.request = function (query, variables, ...rest) {
  console.log("[graph]", query, JSON.stringify(variables));
  return original.call(this, query, variables, ...rest);
};

// 2. On failure the error already carries the exact query that was sent.
import { GraphErrors } from "@optimizely/cms-sdk";

try {
  await getClient().getContentByPath("/products/");
} catch (e) {
  if (e instanceof GraphErrors.GraphResponseError) {
    console.log(e.request.query, e.request.variables);
  }
  if (e instanceof GraphErrors.GraphContentResponseError) {
    console.log(e.status, e.errors);   // every message, not just the first
  }
}

// 3. Paste that query into the Graph GraphiQL explorer to iterate on it.
//    The wire call is POST <graphUrl>?cache=true&stored=true
//    with Authorization: epi-single <key>   (or   Bearer <previewToken>).`;

const QUERY_SNIPPET = `query Products($locale: [Locales], $phrase: String, $limit: Int, $cursor: String) {
  ProductPage(
    locale: $locale
    variation: { include: ALL }          # variations are EXCLUDED without this
    where: {
      _metadata: { url: { default: { exist: true } } }
      family: { in: ["a", "b"] }         # queryable fields only
      rate: { gte: 4.5 }
      launchAt: { gte: "2026-01-01T00:00:00Z" }
      _fulltext: { match: $phrase, fuzzy: true }   # all searchable fields
    }
    orderBy: { rate: DESC }              # or { _metadata: { published: DESC } }
    limit: $limit                        # caps at 100
    cursor: $cursor                      # beats skip for deep paging
  ) {
    total
    cursor
    items {
      __typename
      name
      rate
      body { json }                      # { html } only if richTextFormat says so
      tiers { ... on TierBlock { label rate } }   # content: inline expanded
      related { key url { default } }             # contentReference: that is all you get
      _metadata { key version locale status published variation
                  url { default hierarchical graph } }
      _itemMetadata { categories }       # taxonomy lives here, NOT in _metadata
    }
    facets {                             # same where clause. limit: 0 for facets only
      family(orderType: COUNT, orderBy: DESC, limit: 10) { name count }
    }
  }
}`;

export default function SdkReferencePage() {
  return (
    <>
      <DemoHero
        eyebrow="Reference"
        title="SDK Reference"
        description="Content type options, copy-paste examples, the SDK API surface, and where to find the generated GraphQL query when something breaks."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">
        <section id="setup">
          <DemoSectionHeading id="setup">Setup</DemoSectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            <CodeBlock code={INSTALL_SNIPPET} label="install and file layout" language="bash" />
            <CodeBlock code={PUSH_SNIPPET} label="cms-cli" language="bash" />
          </div>
          <CodeBlock code={REGISTRY_SNIPPET} label="the registry: runs once, before any render" className="mt-4" />
          <Callout variant="warning" label="Deploy order" className="mt-4">
            <p>
              Push the schema, wait for Graph&apos;s schema sync (roughly ten minutes), then deploy
              code that queries the new field. A field Graph does not know yet is a validation
              error, and that fails the <em>whole</em> query, not just that field.
            </p>
          </Callout>
        </section>

        <section id="content-type">
          <DemoSectionHeading id="content-type">contentType()</DemoSectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            <RefTable
              headers={["baseType", "Extra keys it accepts"]}
              rows={[
                ["_page", "mayContainTypes"],
                ["_experience", "mayContainTypes, composition, composition properties"],
                ["_component", "compositionBehaviors, mayContainTypes"],
                ["_image / _media / _video", "none"],
                ["_folder", "mayContainTypes. Not in Graph."],
                ["_section", "SDK internal. Never declare one."],
              ]}
            />
            <RefTable
              headers={["Key", "Notes"]}
              rows={[
                ["key", "Required. The Graph type name. A deleted key stays reserved."],
                ["displayName", "Required."],
                ["description", "Editor help text."],
                ["baseType", "Required. Decides which keys on the left are legal."],
                ["extends", "Contract or array of contracts."],
                ["properties", "See below."],
                ["mayContainTypes", "Children in the content tree, NOT what a content area accepts."],
                ["compositionBehaviors", "sectionEnabled | elementEnabled | formsElementEnabled."],
              ]}
            />
          </div>
          <Callout variant="warning" label="compositionBehaviors" className="mt-4">
            <p>
              <InlineCode>elementEnabled</InlineCode> cannot have content area properties;{" "}
              <InlineCode>sectionEnabled</InlineCode> cannot sit in a grid column. Declaring both
              lifts neither restriction. A block with no behaviours at all is still valid: it can
              be the target of a <InlineCode>component</InlineCode> or{" "}
              <InlineCode>content</InlineCode> property, it just never shows in the block picker.
            </p>
          </Callout>
        </section>

        <section id="properties">
          <DemoSectionHeading id="properties">Property Types</DemoSectionHeading>
          <RefTable
            headers={["type", "Graph returns", "Options only this type has"]}
            rows={[
              ["string", "String", "pattern, minLength, maxLength, enum"],
              ["richText", "{ json }, or { html } on request", "editorSettings.preset"],
              ["url", "{ default, hierarchical }", "none"],
              ["link", "Link object: href, text, target, title", "none"],
              ["integer", "Int", "minimum, maximum, enum"],
              ["float", "Float", "minimum, maximum, enum"],
              ["boolean", "Boolean", "none"],
              ["dateTime", "ISO string", "minimum, maximum"],
              ["json", "Parsed value. Never indexed, never filterable.", "none"],
              ["binary", "Binary payload", "none. Media goes through _image / _media / _video types."],
              ["array", "Array of the item type", "items, minItems, maxItems. Items cannot be arrays."],
              ["content", "The full typed item, inline expanded", "contentType | allowedTypes | restrictedTypes"],
              ["contentReference", "{ key, url } only", "contentType | allowedTypes | restrictedTypes"],
              ["component", "Embedded value, no key of its own", "contentType (required)"],
              ["composition", "CompositionStructureNode", "format (required), allowedTypes. _experience only."],
            ]}
          />
          <CodeBlock
            code={KITCHEN_SINK_SNIPPET}
            label="every property type on one type"
            className="mt-4"
            maxHeight="max-h-[34rem]"
          />
        </section>

        <section id="settings">
          <DemoSectionHeading id="settings">Property Settings</DemoSectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            <RefTable
              headers={["Setting", "Notes"]}
              rows={[
                ["displayName", "Editor label. Without it the editor sees the raw key."],
                ["description", "Help text under the field."],
                ["isRequired", "Blocks publishing while empty."],
                ["isLocalized", "One value per locale. Prose only, never URLs or enum keys."],
                ["sortOrder", "Editor panel order."],
                ["group", "Editor section. Built in: Content, Scheduling, Settings, Shortcut, Categories, DynamicBlocks. Anything else must be in propertyGroups."],
                ["displayMode", "available (default) | hidden. Hidden stays in the schema and in Graph."],
                ["format", "Editor hint, e.g. selectOne on a string enum, outline on a composition."],
                ["indexingType", "searchable | queryable | disabled."],
              ]}
            />
            <RefTable
              headers={["Reference constraint", "Use when"]}
              rows={[
                ["contentType: XType", "Always the same type. The only form that types the field in TS."],
                ["allowedTypes: [...]", "Allow list. Base type strings work: _image, _component, _page, _self."],
                ["restrictedTypes: [...]", "Deny list, for an open area with a few blocks kept out."],
              ]}
            />
          </div>
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <Callout variant="warning" label="Exactly one constraint, never empty">
              <p>
                Every <InlineCode>content</InlineCode> / <InlineCode>contentReference</InlineCode>{" "}
                property (and any array of one) must declare exactly one of the three, non-empty.
                Unconstrained is rejected at push time and nothing is created. Visible under{" "}
                <InlineCode>--dryRun</InlineCode>.
              </p>
            </Callout>
            <Callout variant="warning" label="indexingType is for primitives">
              <p>
                <InlineCode>searchable</InlineCode> and <InlineCode>queryable</InlineCode> are
                rejected on references. On a reference, <strong>omit it</strong>:{" "}
                <InlineCode>disabled</InlineCode> is accepted, but the SDK then drops the field
                from the generated fragment, so it arrives{" "}
                <InlineCode>undefined</InlineCode> forever.
              </p>
            </Callout>
            <Callout variant="do" label="In .tsx, pass objects">
              <p>
                <InlineCode>allowedTypes: [&quot;TierBlock&quot;]</InlineCode> fails typecheck;{" "}
                <InlineCode>allowedTypes: [TierBlockType]</InlineCode> is correct. Base type
                strings are the exception. In a <InlineCode>.mjs</InlineCode> file plain key
                strings work everywhere.
              </p>
            </Callout>
          </div>
        </section>

        <section id="examples">
          <DemoSectionHeading id="examples">Copy-Paste Examples</DemoSectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            <CodeBlock code={ELEMENT_BLOCK_SNIPPET} label="element block" />
            <CodeBlock code={SECTION_BLOCK_SNIPPET} label="section block with a content area" />
            <CodeBlock code={CONTRACT_SNIPPET} label="contract + extends" />
            <CodeBlock code={EXPERIENCE_SNIPPET} label="experience with extra compositions" />
            <CodeBlock code={TEMPLATE_SNIPPET} label="display template" className="lg:col-span-2" />
          </div>
        </section>

        <section id="sdk-api">
          <DemoSectionHeading id="sdk-api">What the SDK Exports</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Nine entry points. Deep imports are blocked by the package exports map, so if it is not
            listed here it is not reachable.
          </p>

          <RefTable
            headers={["@optimizely/cms-sdk", "What it does"]}
            rows={[
              ["contentType() / contract() / displayTemplate()", "Define a type, a shared property set, a template."],
              ["buildConfig()", "Default export of optimizely.config.mjs: components glob, locale, propertyGroups, applications, content."],
              ["config() / getClient() / GraphClient", "Configure once, then get a client anywhere. getClient(overrides) for a one-off."],
              ["initContentTypeRegistry() / initDisplayTemplateRegistry()", "Tell the SDK which types exist. Drives query generation."],
              ["isContentType / isContract / isDisplayTemplate / isContentTypeRegistered", "Guards, handy for auto-discovering your own modules."],
              ["BlankExperienceContentType / BlankSectionContentType", "Built-in types. Register them or Visual Builder pages fail."],
              ["OptiForms*ContentType (13)", "Native Forms schemas, if you register them by hand instead of initForms()."],
              ["damAssets(content)", "getSrcset, getAlt, isDamImageAsset, isDamVideoAsset, isDamRawFileAsset."],
              ["GraphErrors", "Namespace holding every error class. See debugging below."],
              ["ContentProps<typeof XType>", "Type helper: component props inferred from a content type or display template."],
              ["ContentTypes / Properties / DisplayTemplates / BuildConfig", "Type namespaces for the definition shapes."],
            ]}
          />

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <RefTable
              headers={["/react/server", "What it does"]}
              rows={[
                ["initReactComponentRegistry({ resolver })", "Map types to components. Object or function. \"Type:Tag\" keys for templates."],
                ["initForms(handlers)", "Registers all ten Forms types and components in one call."],
                ["OptimizelyComponent", "Renders one content item through the registry."],
                ["OptimizelyComposition", "Renders an experience node tree."],
                ["OptimizelyGridSection", "Renders a grid section, with row / column / ComponentWrapper overrides."],
                ["getPreviewUtils(content)", "pa(prop) for on-page edit attributes, src(ref) for tokenised image URLs."],
                ["withAppContext / getContext / setContext", "Per-request context (preview token, locale) and the adapter API."],
              ]}
            />
            <RefTable
              headers={["Other entry points", "What it does"]}
              rows={[
                ["/react/client: PreviewComponent", "Listens for CMS save events. Bring your own onNavigate."],
                ["/react/nextjs: NextPreviewComponent", "Same, wired to the Next router."],
                ["/react/richText: RichText", "Renders richText json. Plus createLinkComponent, createImageComponent, createTableComponent, generateDefaultElements, generateDefaultLeafs."],
                ["/forms/react", "FormWrapper, FormStep, FormElement, useFormField, useFormValidation, createJsonSubmitHandler."],
                ["/forms/validation", "validateField, isFieldRequired, getHtmlValidationAttributes, getSelectionOptions."],
                ["/schema", "toSchema, Schema, SchemaValidationError."],
                ["/telemetry", "getTracer, createSpan, getMeter, logError, logWarning."],
                ["/buildConfig", "The buildConfig types on their own, for config files."],
              ]}
            />
          </div>

          <RefTable
            headers={["GraphClient method", "Returns", "Notes"]}
            rows={[
              ["getContentByPath(path, opts?)", "any[]", "The registry writes the query. Always an array, empty on a miss."],
              ["getContent(ref, opts?)", "any", "By key, or a graph:// string. Published only. version beats locale."],
              ["getPreviewContent(params, opts?)", "any", "Draft, from the CMS preview params: preview_token, key, ctx, ver, loc."],
              ["getPath(ref, opts?)", "ancestor metadata[]", "Breadcrumbs, top-most first."],
              ["getItems(ref, opts?)", "child metadata[]", "Children of a page or folder."],
              ["request(query, vars, previewToken?, cache?, slot?, stored?)", "json.data", "Your own query. Returns data even when errors[] is present."],
            ]}
          />
        </section>

        <section id="queries">
          <DemoSectionHeading id="queries">Queries</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            Every registered type becomes an inline fragment, so one{" "}
            <InlineCode>getContentByPath()</InlineCode> returns the page and every block in its
            composition. Write a query by hand only for lists, filters, facets, aggregates and
            lean projections.
          </p>
          <CodeBlock code={CONFIG_SNIPPET} label="config() in full" maxHeight="max-h-[30rem]" />
          <CodeBlock
            code={QUERY_SNIPPET}
            label="the query argument surface"
            language="graphql"
            className="mt-4"
            maxHeight="max-h-[30rem]"
          />
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
            Deeper on each:{" "}
            <Link href="/demo/graph-queries" className="text-brand hover:underline">Graph Queries</Link>,{" "}
            <Link href="/demo/listing" className="text-brand hover:underline">Content Listing</Link>,{" "}
            <Link href="/demo/search" className="text-brand hover:underline">Search</Link>,{" "}
            <Link href="/demo/caching" className="text-brand hover:underline">Caching</Link>.
          </p>
        </section>

        <section id="debugging">
          <DemoSectionHeading id="debugging">Seeing the Generated Query</DemoSectionHeading>
          <CodeBlock code={DEBUG_SNIPPET} label="three ways to get the query text" maxHeight="max-h-[30rem]" />

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <RefTable
              headers={["Error class", "Carries"]}
              rows={[
                ["OptimizelyGraphError", "Base class for all of them."],
                ["GraphResponseError", "request.query, request.variables."],
                ["GraphHttpResponseError", "the above plus status."],
                ["GraphContentResponseError", "the above plus errors[], every GraphQL message."],
                ["GraphMissingContentTypeError", "contentType."],
                ["GraphQueryGenerationError", "contentType, propertyName, parentContentType."],
                ["GraphFragmentThresholdError", "contentType, fragmentCount, threshold."],
              ]}
            />
            <RefTable
              headers={["Message", "Cause"]}
              rows={[
                ["Cannot query field \"x\" on type \"Y\" / Unknown type", "CMS and code out of sync. Push, then wait for the schema sync."],
                ["N errors in the GraphQL query. Check \"errors\" object.", "Read error.errors[]. The message only summarises."],
                ["Content type \"X\" is not available in the component registry", "Missing from initContentTypeRegistry()."],
                ["Content type is undefined", "A type defined in a \"use client\" file, or an import cycle. Move types to a shared module."],
                ["produced N inner fragments, exceeding the limit", "Unconstrained content area. Add allowedTypes, or raise fragment.maxThreshold."],
                ["Error when calling `fetch`", "Wrong graphUrl, or the gateway is unreachable."],
              ]}
            />
          </div>
        </section>

        <section id="gotchas">
          <DemoSectionHeading id="gotchas">Gotchas</DemoSectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            <Callout variant="warning" label="A 200 can still be a failure">
              <p>
                <InlineCode>request()</InlineCode> returns <InlineCode>json.data</InlineCode>. A
                partial failure comes back 200 with an <InlineCode>errors</InlineCode> array and a
                null root field, and nothing throws. Branch on the empty result too.
              </p>
            </Callout>
            <Callout variant="warning" label="Variations are excluded by default">
              <p>
                Without a <InlineCode>variation</InlineCode> argument,{" "}
                <InlineCode>_metadata.variation</InlineCode> is always null and variation items
                never appear. Pass <InlineCode>{"{ include: ALL }"}</InlineCode> and pick the match
                yourself.
              </p>
            </Callout>
            <Callout variant="warning" label="A dropped field is undefined, not an error">
              <p>
                A reference marked <InlineCode>disabled</InlineCode>, or a type excluded by{" "}
                <InlineCode>typeFilter</InlineCode>, is filtered out of the fragment and simply
                never arrives.
              </p>
            </Callout>
            <Callout variant="warning" label="fragment options are construction-time">
              <p>
                Nothing in the <InlineCode>fragment</InlineCode> group can be overridden per
                request. A client needing different values has to be a separate{" "}
                <InlineCode>new GraphClient()</InlineCode>.
              </p>
            </Callout>
            <Callout variant="warning" label="Breaking changes need --force">
              <p>
                Adding <InlineCode>isLocalized</InlineCode> to an existing field, removing a
                property, removing an <InlineCode>indexingType</InlineCode>, changing a type. Push
                to every instance the code runs against.
              </p>
            </Callout>
            <Callout variant="warning" label="Checkbox settings are strings">
              <p>
                Display template checkboxes arrive as <InlineCode>&quot;True&quot;</InlineCode> /{" "}
                <InlineCode>&quot;False&quot;</InlineCode>, so{" "}
                <InlineCode>ds.x === true</InlineCode> never fires.
              </p>
            </Callout>
          </div>
        </section>
      </div>
    </>
  );
}

/** Reference table. Wide tables scroll inside their own box rather than widening the page. */
function RefTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div data-component="RefTable" className="overflow-auto rounded-2xl border border-ghost-border h-fit">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-surface-low border-b border-ghost-border">
            {headers.map((header) => (
              <th key={header} className="text-left px-4 py-2.5 text-on-surface-variant font-semibold whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-ghost-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-lowest"}`}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2.5 align-top ${j === 0 ? "font-mono text-brand" : "text-on-surface-variant"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
