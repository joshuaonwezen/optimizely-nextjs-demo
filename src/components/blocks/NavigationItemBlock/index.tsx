import { contentType } from "@optimizely/cms-sdk";

export const NavigationItemType = contentType({
  key: "NavigationItem",
  displayName: "Navigation Item",
  baseType: "_component",
  properties: {
    label: { type: "string", displayName: "Label" },
    href: { type: "string", displayName: "URL" },
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

// Not rendered inside compositions — queried directly by type
export default function NavigationItemBlock() {
  return null;
}
