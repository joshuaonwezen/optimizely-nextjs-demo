import { contentType } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const CalloutBlockType = contentType({
  key: "CalloutBlock",
  displayName: "Callout",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    variant: {
      type: "string",
      displayName: "Variant",
      enum: [
        { value: "note",    displayName: "Note"    },
        { value: "warning", displayName: "Warning" },
        { value: "do",      displayName: "Do"      },
      ],
    },
    label: { type: "string",   displayName: "Label", isLocalized: true },
    body:  { type: "richText", displayName: "Body",  indexingType: "searchable", isLocalized: true },
  },
});

// ---- Visual component (used by demo pages with hardcoded children) ----

type CalloutVariant = "note" | "warning" | "do";

const borderClass: Record<CalloutVariant, string> = {
  note:    "border-l-brand/50",
  warning: "border-l-amber-400",
  do:      "border-l-green-500",
};

interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CalloutVariant;
  label?: string;
  children: React.ReactNode;
}

export function Callout({ variant = "note", label, className, children, ...rest }: CalloutProps) {
  return (
    <div className={`bg-surface-lowest rounded-lg border-l-4 p-4 ${borderClass[variant]}${className ? ` ${className}` : ""}`} {...rest}>
      {label && (
        <p className="text-xs font-semibold text-on-surface mb-1.5">{label}</p>
      )}
      <div className="text-sm text-on-surface-variant leading-relaxed">{children}</div>
    </div>
  );
}

// ---- CMS block component (renders richText body from Graph) ----

interface CalloutBlockData {
  variant?: string | null;
  label?: string | null;
  body?: { json: unknown } | string | null;
  __context?: { edit?: boolean } | null;
}

type CalloutBlockProps = CalloutBlockData & {
  content?: CalloutBlockData;
};

export default function CalloutBlock(props: CalloutBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const variant = (data.variant as CalloutVariant | null | undefined) ?? "note";

  const bodyContent = (() => {
    if (data.body && typeof data.body === "object" && "json" in data.body && data.body.json) {
      return (
        <div {...pa("body")}>
          <RichText content={data.body.json as RichTextProps["content"]} />
        </div>
      );
    }
    if (typeof data.body === "string" && data.body) {
      return <div {...pa("body")} dangerouslySetInnerHTML={{ __html: data.body }} />;
    }
    return null;
  })();

  if (!bodyContent) return null;

  return (
    <Callout data-component="CalloutBlock" variant={variant} label={data.label ?? undefined}>
      {bodyContent}
    </Callout>
  );
}
