// Text helpers over a raw Graph document (`item { _json }`). Pure, so they can be
// exercised without a server.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// Structure and identity, not copy. `json` is rich text's second copy of `html`,
// and a node's `displayName` is the editor's label for it in the outline.
const NOT_COPY = new Set([
  "key", "type", "nodeType", "layoutType", "displayName", "displayTemplateKey",
  "displaySettings", "url", "json", "item", "flagKey", "variationKey",
]);

const COPY_KEY = /heading|title|label|text|name|caption|summary|question|answer|quote|eyebrow|cta|body|description|html/i;

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// A single word is copy only under a copy-like key ("heading": "Mortgages");
// otherwise it is far more often an enum value ("variant": "note").
function isCopy(key: string, value: string): boolean {
  if (/^(https?:|cms:|graph:|mailto:|tel:|\/|#)/.test(value)) return false;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return /\s/.test(value) || COPY_KEY.test(key);
}

function collect(value: Json, key: string, out: string[]): void {
  if (typeof value === "string") {
    const text = stripHtml(value);
    if (text && isCopy(key, text)) out.push(text);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, key, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      if (childKey.startsWith("_") || NOT_COPY.has(childKey)) continue;
      collect(child, childKey, out);
    }
  }
}

// Every piece of visitor-facing copy in the document, in document order: page
// properties, rich text, content-area blocks and Visual Builder components.
export function visibleText(doc: unknown): string {
  const out: string[] = [];
  collect((doc ?? null) as Json, "", out);
  return [...new Set(out)].join("\n");
}

// Image and Rendition Image blocks that hold a picture but no alt text.
export function imagesWithoutAlt(doc: unknown): number {
  let count = 0;
  const walk = (value: Json): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const typename = value.__typename;
    if (typename === "ImageBlock" || typename === "RenditionImageBlock") {
      const image = value.image as { key?: Json } | null | undefined;
      const alt = typeof value.altText === "string" ? value.altText.trim() : "";
      if (image?.key && !alt) count += 1;
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk((doc ?? null) as Json);
  return count;
}

function comparable(value: Json): Json {
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, comparable(child)])
    );
  }
  return value;
}

function summary(value: Json | undefined): string | null {
  if (value === undefined || value === null) return null;
  const text = typeof value === "string" ? stripHtml(value) : visibleText(value);
  return text.length > 600 ? `${text.slice(0, 600)}...` : text;
}

export interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

// Property-level difference between two versions of one item. System fields
// (underscore-prefixed) differ on every version, so they are left out.
export function changedFields(before: unknown, after: unknown): FieldChange[] {
  const a = (comparable((before ?? {}) as Json) ?? {}) as Record<string, Json>;
  const b = (comparable((after ?? {}) as Json) ?? {}) as Record<string, Json>;
  const changes: FieldChange[] = [];
  for (const field of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    if (JSON.stringify(a[field]) === JSON.stringify(b[field])) continue;
    changes.push({ field, before: summary(a[field]), after: summary(b[field]) });
  }
  return changes;
}
