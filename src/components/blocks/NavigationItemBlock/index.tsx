import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";

export const NavigationItemType = contentType({
  key: "NavigationItem",
  displayName: "Navigation Item",
  baseType: "_component",
  properties: {
    label: { type: "string", displayName: "Label" },
    href: { type: "contentReference", displayName: "URL" },
    description: { type: "string", displayName: "Description" },
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
    name: { type: "string", displayName: "Name" },
    navItems: {
      type: "array",
      displayName: "Top-level Items",
      items: { type: "content", allowedTypes: [NavigationItemType] },
    },
  },
});

// Preview component for a single NavigationItem — shown when editing an item in Visual Builder
export function NavigationItemPreview(props: any) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data);
  const label = data.label ?? "";
  const href = data.href?.url?.default ?? "#";
  const children: unknown[] = data.children ?? [];

  return (
    <div data-component="NavigationItemPreview" className="flex items-center gap-2 px-3 py-2">
      <span
        {...pa("label")}
        className="text-sm font-medium text-on-surface-variant"
      >
        {label}
      </span>
      <span className="text-xs text-on-surface-variant opacity-50">{href}</span>
      {children.length > 0 && (
        <span className="text-xs text-on-surface-variant opacity-40 ml-1">
          +{children.length} children
        </span>
      )}
    </div>
  );
}

// Preview component for the Navigation block — shown when editing the Navigation block in Visual Builder
export function NavigationBlock(props: any) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data);
  const navItems: unknown[] = data.navItems ?? [];

  return (
    <div data-component="NavigationBlock" className="border-b border-ghost-border bg-nav-glass">
      <nav className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-1">
        <div className="flex items-center gap-1 flex-1" {...pa("navItems")}>
          {navItems.map((item: any, i: number) => (
            <BlockErrorBoundary key={item?._metadata?.key ?? i}>
              <OptimizelyComponent content={item} />
            </BlockErrorBoundary>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function NavigationItemBlock() {
  return null;
}
