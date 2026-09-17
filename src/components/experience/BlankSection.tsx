import {
  OptimizelyGridSection,
  getPreviewUtils,
  type StructureContainerProps,
} from "@optimizely/cms-sdk/react/server";
import type { CompositionNode, SdkContent } from "@/components/cms/sdkTypes";
import { GridComponentWrapper } from "./CompositionExperience";
import { isChecked } from "@/components/blocks/_shared/displayTemplateSettings";

const GAP: Record<string, string> = {
  compact:  "gap-4",
  default:  "gap-8",
  spacious: "gap-16",
};

const VALIGN: Record<string, string> = {
  top:     "items-start",
  center:  "items-center",
  stretch: "items-stretch",
};

// Choice keys differ from the blocks' (surface/surfaceLow vs white/offWhite) because
// they are stored in published content; the classes match the blocks' BG_CLASSES.
const COL_BG: Record<string, string> = {
  surface:     "bg-surface-lowest",
  surfaceLow:  "bg-surface-low",
  blue:        "bg-brand/10 border border-brand/20",
  blueGrad:    "bg-gradient-brand",
  purple:      "bg-tertiary/10 border border-tertiary/20",
  dark:        "bg-on-surface",
};

const PADDING: Record<string, string> = {
  none:     "",
  compact:  "p-4",
  default:  "p-8",
  spacious: "p-16",
};

const TEXT_COLOR: Record<string, string> = {
  dark:  "text-on-surface",
  muted: "text-on-surface-variant",
  brand: "text-brand",
  teal:  "text-tertiary",
  light: "text-surface-lowest",
};

const SECTION_BG: Record<string, string> = {
  surface:     "bg-surface-lowest",
  surfaceLow:  "bg-surface-low",
  brand:       "bg-brand/10",
  blueGrad:    "bg-gradient-brand",
  purple:      "bg-tertiary/10",
  dark:        "bg-on-surface",
};

// "Automatic" text color: light text on the dark and gradient backgrounds, the same
// rule resolveStyleClasses applies to blocks.
const LIGHT_TEXT_BACKGROUNDS = new Set(["dark", "blueGrad"]);

function textColorClass(ds: Record<string, string | boolean> | undefined): string {
  const explicit = TEXT_COLOR[ds?.textColor as string];
  if (explicit) return explicit;
  return LIGHT_TEXT_BACKGROUNDS.has(ds?.background as string) ? TEXT_COLOR.light : "";
}

const SECTION_PY: Record<string, string> = {
  none:     "",
  compact:  "py-8",
  default:  "py-16",
  spacious: "py-24",
};

const SECTION_DIVIDER: Record<string, string> = {
  top:    "border-t border-outline-variant",
  bottom: "border-b border-outline-variant",
  both:   "border-t border-b border-outline-variant",
};

const SECTION_RADIUS: Record<string, string> = {
  lg: "rounded-2xl overflow-hidden",
  xl: "rounded-3xl overflow-hidden",
};

const MAX_WIDTH: Record<string, string> = {
  narrow:    "max-w-3xl mx-auto px-8",
  fullWidth: "px-8",
};

function Row({ children, node, displaySettings }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  const ds = displaySettings as Record<string, string | boolean> | undefined;

  const count = node.nodes?.length ?? 1;
  const gridCols =
    count === 2 ? "md:grid-cols-2" :
    count === 3 ? "md:grid-cols-3" :
    count >= 4  ? "md:grid-cols-4" : "";

  const gap    = GAP[ds?.gap as string]    ?? GAP.default;
  const valign = VALIGN[ds?.verticalAlign as string] ?? "";
  const maxWidthClass = MAX_WIDTH[ds?.maxWidth as string] ?? "max-w-7xl mx-auto px-8";
  // rtl flips the whole grid track order; children are set back to ltr for their text.
  const reverse = isChecked(ds, "reverse") ? "md:[direction:rtl] md:[&>*]:[direction:ltr]" : "";

  const className = [
    maxWidthClass,
    count > 1 ? `grid grid-cols-1 ${gridCols}` : undefined,
    gap,
    valign,
    reverse,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className || undefined} {...pa(node)}>
      {children}
    </div>
  );
}

function Column({ children, node, displaySettings }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  const ds = displaySettings as Record<string, string | boolean> | undefined;

  const bg      = COL_BG[ds?.background as string] ?? "";
  const padding = PADDING[ds?.padding as string] ?? "";
  const rounded = isChecked(ds, "rounded") ? "rounded-2xl" : "";
  const text    = textColorClass(ds);

  const className = [bg, padding, rounded, text].filter(Boolean).join(" ");

  return (
    <div className={className || undefined} {...pa(node)}>
      {children}
    </div>
  );
}

export default function BlankSection({
  content,
  displaySettings,
}: {
  content: SdkContent & { key?: string; nodes?: CompositionNode[] | null };
  displaySettings?: Record<string, string | boolean>;
}) {
  const { pa } = getPreviewUtils(content);
  const ds = displaySettings;
  const nodes = content?.nodes ?? [];

  const bg      = SECTION_BG[ds?.background as string] ?? "";
  const py      = SECTION_PY[ds?.paddingY as string] ?? "";
  const divider = SECTION_DIVIDER[ds?.divider as string] ?? "";
  const radius  = SECTION_RADIUS[ds?.cornerRadius as string] ?? "";
  const text    = textColorClass(ds);

  const className = [bg, py, divider, radius, text].filter(Boolean).join(" ");

  return (
    <section data-component="BlankSection" className={className || undefined} {...pa(content.key ? { key: content.key } : undefined)}>
      <OptimizelyGridSection nodes={nodes} row={Row} column={Column} ComponentWrapper={GridComponentWrapper} />
    </section>
  );
}
