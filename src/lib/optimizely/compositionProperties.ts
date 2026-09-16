import { GraphClient } from "@optimizely/cms-sdk";

type RequestFn = (query: string, ...rest: unknown[]) => Promise<unknown>;

interface TypeWithProperties {
  key: string;
  properties?: Record<string, { type?: string }>;
}

// Two gaps in the composition query cms-sdk 2.2.0 generates, both fixed by
// rewriting the query text before it is sent (GraphClient.request is patched once,
// below). Each rewrite is a no-op when its target text is absent, so an SDK that
// changes the generated query degrades to its own behaviour rather than breaking.

// 1. Depth. The SDK expands ICompositionNode a fixed 4 levels (Graph's @recursive is
//    unreliable), which covers experience > section > row > column > component. A
//    native Optimizely Forms container adds a `step` level (section > step > row >
//    column > element), so every form element sat one level too deep and rendered
//    as an empty column. One more level fits forms.
const SDK_COMPOSITION_DEPTH = 4;
const COMPOSITION_DEPTH = 5;

// Mirrors buildNestedCompositionNodes() in cms-sdk's util/baseTypeUtil.js exactly,
// so the SDK's fragment can be found and replaced by string match.
function nestedCompositionNodes(depth: number): string {
  const fields = "__typename key type nodeType layoutType displayName displayTemplateKey displaySettings {key value}";
  if (depth === 0) return fields;
  const component = "...on CompositionComponentNode { nodeType component { ..._IComponent } }";
  return `${fields} ...on CompositionStructureNode { nodes { ${nestedCompositionNodes(depth - 1)} ${component} } } ${component}`;
}

const compositionFragment = (depth: number) =>
  `fragment ICompositionNode on ICompositionNode { ${nestedCompositionNodes(depth)} }`;
const SDK_FRAGMENT = compositionFragment(SDK_COMPOSITION_DEPTH);
const DEEPER_FRAGMENT = compositionFragment(COMPOSITION_DEPTH);

// 2. Extra `composition`-type properties. Content types can declare them (each its
//    own Visual Builder composition with allowed/restricted types). Graph types them
//    as CompositionStructureNode, but the SDK has no query handler for the property
//    type and emits a bare scalar field (`Type__prop:prop`), which Graph rejects.
//    Every experience query already carries the ICompositionNode fragment used for
//    the built-in `composition`, so those aliases get the same selection set.
const aliases: string[] = [];

export function rewriteCompositionQuery(query: string): string {
  if (!query.includes("fragment ICompositionNode")) return query;
  let out = query.replace(SDK_FRAGMENT, DEEPER_FRAGMENT);
  for (const alias of aliases) {
    out = out.replace(new RegExp(`\\b${alias}(?!\\s*\\{)`, "g"), `${alias} { ...ICompositionNode }`);
  }
  return out;
}

// Patched once on the prototype so getClient(), the preview client and any other
// GraphClient instance all send the rewritten query. adminPreviewClient replaces
// request() on its instance and calls rewriteCompositionQuery itself.
export function patchCompositionQueries(): void {
  const proto = GraphClient.prototype as unknown as { request: RequestFn; __compositionPatched?: boolean };
  if (proto.__compositionPatched) return;
  const original = proto.request;
  proto.request = function (this: GraphClient, query: string, ...rest: unknown[]) {
    return original.call(this, rewriteCompositionQuery(query), ...rest);
  };
  proto.__compositionPatched = true;
}

export function registerCompositionProperties(types: TypeWithProperties[]): void {
  for (const type of types) {
    for (const [name, prop] of Object.entries(type.properties ?? {})) {
      if (prop.type !== "composition") continue;
      const alias = `${type.key}__${name}:${name}`;
      if (!aliases.includes(alias)) aliases.push(alias);
    }
  }
}
