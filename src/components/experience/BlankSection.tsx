import {
  OptimizelyGridSection,
  getPreviewUtils,
  type StructureContainerProps,
} from "@optimizely/cms-sdk/react/server";

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

const BG: Record<string, string> = {
  surface:    "bg-surface",
  surfaceLow: "bg-surface-low",
};

const PADDING: Record<string, string> = {
  compact:  "p-4",
  default:  "p-8",
  spacious: "p-16",
};

function Row({ children, node, displaySettings }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  const ds = displaySettings as Record<string, string | boolean> | undefined;

  const count = (node as any).nodes?.length ?? 1;
  const gridCols =
    count === 2 ? "md:grid-cols-2" :
    count === 3 ? "md:grid-cols-3" :
    count >= 4  ? "md:grid-cols-4" : "";

  const gap    = GAP[ds?.gap as string]    ?? GAP.default;
  const valign = VALIGN[ds?.verticalAlign as string] ?? "";

  const className = [
    "max-w-7xl mx-auto px-8",
    count > 1 ? `grid grid-cols-1 ${gridCols}` : undefined,
    gap,
    valign,
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

  const bg      = BG[ds?.background as string] ?? "";
  const padding = PADDING[ds?.padding as string] ?? "";
  const rounded = ds?.rounded === true ? "rounded-2xl" : "";

  const className = [bg, padding, rounded].filter(Boolean).join(" ");

  return (
    <div className={className || undefined} {...pa(node)}>
      {children}
    </div>
  );
}

export default function BlankSection({ content }: { content: any }) {
  const { pa } = getPreviewUtils(content);
  const nodes: any[] = content?.nodes ?? [];

  return (
    <section {...pa(content)}>
      <OptimizelyGridSection nodes={nodes} row={Row} column={Column} />
    </section>
  );
}
