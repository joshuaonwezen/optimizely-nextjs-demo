import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";

/**
 * A richText value as it reaches components: Graph returns `{ json, html }`, while
 * demo and seed payloads sometimes pass a plain HTML string.
 */
export type RichTextValue = { json?: unknown; html?: string | null } | string | null | undefined;

/** True when the value has anything to render. */
export function hasRichText(value: RichTextValue): boolean {
  if (!value) return false;
  return typeof value === "string" || Boolean(value.json || value.html);
}

/**
 * Renders a richText value, preferring the structured JSON (rendered by the SDK)
 * over the HTML fallback. Renders no wrapper of its own for JSON: callers own the
 * `.richtext` container and its preview attributes.
 */
export default function CmsRichText({ value }: { value: RichTextValue }) {
  if (!value) return null;
  if (typeof value === "string") return <div dangerouslySetInnerHTML={{ __html: value }} />;
  if (value.json) return <RichText content={value.json as RichTextProps["content"]} />;
  if (value.html) return <div dangerouslySetInnerHTML={{ __html: value.html }} />;
  return null;
}
