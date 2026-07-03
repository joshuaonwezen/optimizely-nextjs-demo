import { detectLanguage, highlightCode } from "@/lib/shiki";

export default async function CodeBlock({
  code,
  label,
  language,
  className,
  maxHeight,
}: {
  code: string;
  label?: string;
  language?: string;
  className?: string;
  maxHeight?: string;
}) {
  const lang = language ?? detectLanguage(code, label);
  const html = await highlightCode(code, lang);

  return (
    <div
      data-component="CodeBlock"
      className={`rounded-2xl overflow-hidden border border-ghost-border${className ? ` ${className}` : ""}`}
    >
      {label && (
        <div className="bg-surface-low border-b border-ghost-border px-4 py-2">
          <span className="text-xs font-mono text-on-surface-variant">{label}</span>
        </div>
      )}
      <div
        className={`code-block-body bg-surface-lowest p-6 text-xs overflow-auto leading-relaxed${maxHeight ? ` ${maxHeight}` : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
