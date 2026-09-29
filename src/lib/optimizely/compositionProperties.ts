import { GraphClient } from "@optimizely/cms-sdk";

type RequestFn = (query: string, ...rest: unknown[]) => Promise<unknown>;

interface TypeWithProperties {
  key: string;
  properties?: Record<string, { type?: string }>;
}

// Extra `composition`-type properties. Content types can declare them (each its own
// Visual Builder composition with allowed/restricted types). Graph types them as
// CompositionStructureNode, but the SDK has no query handler for the property type
// and emits a bare scalar field (`Type__prop:prop`), which Graph rejects. Every
// experience query already carries the ICompositionNode fragment used for the
// built-in `composition`, so those aliases get the same selection set.
//
// Fixed by rewriting the query text before it is sent (GraphClient.request is patched
// once, below). The rewrite is a no-op when its target text is absent, so an SDK that
// changes the generated query degrades to its own behaviour rather than breaking.
//
// This file used to carry a second rewrite that deepened the SDK's ICompositionNode
// fragment from 4 levels to 5, because a native Optimizely Forms container nests one
// level deeper (section > step > row > column > element) than the SDK expanded. Gone
// as of cms-sdk 3.0.0, which handles it natively and better: it uses depth 8 for
// forms, and only on pages that actually contain one. Do not reintroduce it - it
// string-matched the SDK's generated fragment, and 3.0.0 changed that text, so it
// would silently no-op rather than fail.
const aliases: string[] = [];

export function rewriteCompositionQuery(query: string): string {
  if (!query.includes("fragment ICompositionNode")) return query;
  let out = query;
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
