import { GraphClient } from "@optimizely/cms-sdk";

type RequestFn = (query: string, ...rest: unknown[]) => Promise<unknown>;

interface TypeWithProperties {
  key: string;
  properties?: Record<string, { type?: string }>;
}

// Content types can now declare extra properties of type "composition" (each its
// own Visual Builder composition with allowed/restricted types). Graph types them
// as CompositionStructureNode, but cms-sdk 2.2.0 has no query handler for the
// property type and falls back to a bare scalar field (`Type__prop:prop`), which
// Graph rejects. Every experience query already carries the ICompositionNode
// fragment used for the built-in `composition`, so the fix is to give those
// aliases the same selection set.
const aliases: string[] = [];

export function rewriteCompositionFields(query: string): string {
  if (aliases.length === 0 || !query.includes("fragment ICompositionNode")) return query;
  let out = query;
  for (const alias of aliases) {
    out = out.replace(new RegExp(`\\b${alias}(?!\\s*\\{)`, "g"), `${alias} { ...ICompositionNode }`);
  }
  return out;
}

export function registerCompositionProperties(types: TypeWithProperties[]): void {
  for (const type of types) {
    for (const [name, prop] of Object.entries(type.properties ?? {})) {
      if (prop.type !== "composition") continue;
      const alias = `${type.key}__${name}:${name}`;
      if (!aliases.includes(alias)) aliases.push(alias);
    }
  }

  // Patched once on the prototype so getClient(), the preview client and any
  // other GraphClient instance all send the rewritten query.
  const proto = GraphClient.prototype as unknown as { request: RequestFn; __compositionPatched?: boolean };
  if (proto.__compositionPatched) return;
  const original = proto.request;
  proto.request = function (this: GraphClient, query: string, ...rest: unknown[]) {
    return original.call(this, rewriteCompositionFields(query), ...rest);
  };
  proto.__compositionPatched = true;
}
