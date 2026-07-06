import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const NavigationItemType = contentType({
  key: "NavigationItem",
  displayName: "Navigation Item",
  baseType: "_component",
  properties: {
    label: { type: "string", displayName: "Label", isLocalized: true },
    href: { type: "contentReference", displayName: "URL" },
    description: { type: "string", displayName: "Description", isLocalized: true },
    openInNewTab: { type: "boolean", displayName: "Open in New Tab" },
    // Content area — editors drop child NavigationItems here
    children: {
      type: "array",
      displayName: "Child Items",
      items: { type: "content", allowedTypes: ["_self"] },
    },
  },
});

// Navigation holds the top-level content area that editors populate
export const NavigationType = contentType({
  key: "Navigation",
  displayName: "Navigation",
  baseType: "_component",
  properties: {
    name: { type: "string", displayName: "Name", isLocalized: true },
    navItems: {
      type: "array",
      displayName: "Top-level Items",
      items: { type: "content", allowedTypes: [NavigationItemType] },
    },
  },
});

// Raw NavigationItem shape as the preview route receives it from Graph:
// children are recursively expanded, href carries base metadata (URL only).
interface RawNavItem {
  label?: string | null;
  description?: string | null;
  openInNewTab?: boolean | null;
  href?: { url?: { default?: string | null } | null } | null;
  children?: (RawNavItem | null | undefined)[] | null;
}

interface PreviewNavNode {
  label: string;
  href: string | null;
  description: string | null;
  openInNewTab: boolean;
  children: PreviewNavNode[];
}

function toPreviewNode(raw: RawNavItem | null | undefined): PreviewNavNode {
  return {
    label: raw?.label ?? "(untitled)",
    href: raw?.href?.url?.default ?? null,
    description: raw?.description ?? null,
    openInNewTab: raw?.openInNewTab ?? false,
    children: Array.isArray(raw?.children)
      ? raw.children.filter((c): c is RawNavItem => Boolean(c)).map(toPreviewNode)
      : [],
  };
}

type PreviewContent = Parameters<typeof getPreviewUtils>[0];

function UrlChip({ href }: { href: string | null }) {
  if (!href) {
    return <span className="text-xs text-on-surface-variant opacity-60">no link</span>;
  }
  return (
    <span className="font-mono text-xs text-on-surface-variant bg-surface-low rounded px-1.5 py-0.5 break-all">
      {href}
    </span>
  );
}

function NewTabBadge() {
  return (
    <span className="shrink-0 text-[10px] font-medium text-brand bg-surface-low rounded-full px-2 py-0.5">
      new tab ↗
    </span>
  );
}

// Recursive tree rendering shared by both previews. Mirrors the nesting styles
// of the production dropdown panels in NavigationHeader/NavItems.tsx.
function NavTreeList({ nodes }: { nodes: PreviewNavNode[] }) {
  return (
    <div className="space-y-1">
      {nodes.map((node, i) =>
        node.children.length > 0 ? (
          <section key={`${node.label}-${i}`}>
            <div className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
              <span className="text-sm font-semibold text-on-surface">{node.label}</span>
              <UrlChip href={node.href} />
              {node.openInNewTab && <NewTabBadge />}
            </div>
            {node.description && (
              <p className="px-3 -mt-1 pb-1 text-xs text-on-surface-variant">{node.description}</p>
            )}
            <div className="ml-3 border-l border-ghost-border pl-3 pb-1">
              <NavTreeList nodes={node.children} />
            </div>
          </section>
        ) : (
          <div key={`${node.label}-${i}`} className="rounded-lg px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface-variant">{node.label}</span>
              <UrlChip href={node.href} />
              {node.openInNewTab && <NewTabBadge />}
            </div>
            {node.description && (
              <p className="text-xs text-on-surface-variant opacity-80">{node.description}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

type NavigationItemPreviewProps = RawNavItem & { content?: RawNavItem };

// Editor preview for a single NavigationItem: its fields plus the full subtree
// of child items (already expanded in the preview data).
export function NavigationItemPreview(props: NavigationItemPreviewProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as PreviewContent);
  const node = toPreviewNode(data);

  return (
    <div
      data-component="NavigationItemPreview"
      className="max-w-xl m-4 bg-surface-lowest border border-ghost-border rounded-xl shadow-lg p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant opacity-70 mb-2">
        Navigation item
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span {...pa("label")} className="font-display text-lg font-bold text-on-surface">
          {node.label}
        </span>
        <span {...pa("href")}>
          <UrlChip href={node.href} />
        </span>
        {node.openInNewTab && (
          <span {...pa("openInNewTab")}>
            <NewTabBadge />
          </span>
        )}
      </div>
      {node.description && (
        <p {...pa("description")} className="mt-1 text-sm text-on-surface-variant">
          {node.description}
        </p>
      )}
      <div className="mt-4 border-t border-ghost-border pt-3">
        <p className="text-xs font-semibold text-on-surface mb-2">Child items</p>
        <div {...pa("children")}>
          {node.children.length > 0 ? (
            <NavTreeList nodes={node.children} />
          ) : (
            <p className="text-sm text-on-surface-variant opacity-70">
              No child items - drop NavigationItem blocks into &quot;Child Items&quot; to build a dropdown.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface NavigationData {
  name?: string | null;
  navItems?: (RawNavItem | null | undefined)[] | null;
}

type NavigationBlockProps = NavigationData & { content?: NavigationData };

// Editor preview for the Navigation block: a realistic site header bar with
// every dropdown panel rendered open, so the whole tree is visible at once.
export function NavigationBlock(props: NavigationBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as PreviewContent);
  const items: PreviewNavNode[] = Array.isArray(data.navItems)
    ? data.navItems.filter((n): n is RawNavItem => Boolean(n)).map(toPreviewNode)
    : [];

  return (
    <div data-component="NavigationBlock" className="bg-surface min-h-full">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <p className="text-xs text-on-surface-variant opacity-70 mb-3">
          Dropdown panels are shown expanded for editing - on the live site they open on hover.
        </p>
        <div {...pa("navItems")} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
          {items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-ghost-border px-3 pb-2.5 pt-1">
                <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                <UrlChip href={item.href} />
                {item.openInNewTab && <NewTabBadge />}
              </div>
              {item.children.length > 0 ? (
                <NavTreeList nodes={item.children} />
              ) : (
                <p className="px-3 py-1.5 text-sm text-on-surface-variant opacity-70">
                  Direct link - no dropdown
                </p>
              )}
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            No items yet - drop NavigationItem blocks into &quot;Top-level Items&quot; to build the menu.
          </p>
        )}
      </div>
    </div>
  );
}

export default function NavigationItemBlock() {
  return null;
}
