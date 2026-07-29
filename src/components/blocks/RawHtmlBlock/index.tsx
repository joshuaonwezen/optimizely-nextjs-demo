import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const RawHtmlBlockType = contentType({
  key: "RawHtmlBlock",
  displayName: "Raw HTML",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    html: {
      type: "string",
      displayName: "HTML",
      description: "Paste raw HTML here — it is rendered exactly as entered.",
      isLocalized: true,
    },
  },
});

export const RawHtmlBlockDefaultTemplate = displayTemplate({
  key: "RawHtmlBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "RawHtmlBlock",
  settings: {
    width: {
      editor: "select" as const,
      displayName: "Width",
      sortOrder: 0,
      choices: {
        contained: { displayName: "Contained", sortOrder: 0 },
        full:      { displayName: "Full width", sortOrder: 1 },
      },
    },
    verticalPadding: {
      editor: "select" as const,
      displayName: "Vertical padding",
      sortOrder: 1,
      choices: {
        none:     { displayName: "None",     sortOrder: 0 },
        default:  { displayName: "Standard", sortOrder: 1 },
        spacious: { displayName: "Spacious", sortOrder: 2 },
      },
    },
  },
});

interface RawHtmlBlockData {
  html?: string | null;
  __context?: { edit?: boolean } | null;
}

type RawHtmlBlockProps = RawHtmlBlockData & {
  content?: RawHtmlBlockData;
  displaySettings?: Record<string, string | boolean>;
};

const PADDING_CLASSES: Record<string, string> = {
  none:     "",
  default:  "py-16",
  spacious: "py-24",
};

export default function RawHtmlBlock(props: RawHtmlBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  if (typeof data.html !== "string" || !data.html) return null;

  const paddingClass = PADDING_CLASSES[(ds?.verticalPadding as string) ?? "default"] ?? "py-16";
  const widthClass = (ds?.width as string) === "full" ? "w-full" : "max-w-4xl mx-auto px-8";
  const containerClass = `${widthClass} ${paddingClass}`.trim();

  // Intentional raw render: the editor pastes trusted HTML that is output verbatim.
  return (
    <div
      data-component="RawHtmlBlock"
      {...pa("html")}
      className={containerClass || undefined}
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
