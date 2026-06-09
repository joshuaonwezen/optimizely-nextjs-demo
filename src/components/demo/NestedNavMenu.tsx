"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";

interface Props {
  tree: NavNode[];
}

function getAllExpandableKeys(nodes: NavNode[]): Set<string> {
  const keys = new Set<string>();
  function walk(nodes: NavNode[]) {
    for (const n of nodes) {
      if (n.children.length > 0) {
        keys.add(n.key);
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return keys;
}

function countNodes(nodes: NavNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

function maxDepth(nodes: NavNode[], depth = 0): number {
  return nodes.reduce((max, n) => Math.max(max, maxDepth(n.children, depth + 1)), depth);
}

const DEPTH_LABEL: Record<number, string> = {
  0: "text-sm font-semibold text-on-surface",
  1: "text-sm font-medium text-on-surface",
  2: "text-sm text-on-surface-variant",
  3: "text-xs text-on-surface-variant",
  4: "text-xs text-on-surface-variant opacity-80",
};
const DEPTH_BADGE: Record<number, string> = {
  0: "bg-brand/10 text-brand",
  1: "bg-surface-low text-on-surface-variant",
  2: "bg-surface-low text-on-surface-variant",
  3: "bg-surface-low text-on-surface-variant opacity-80",
  4: "bg-surface-low text-on-surface-variant opacity-60",
};

function depthLabel(depth: number) {
  return DEPTH_LABEL[Math.min(depth, 4)];
}
function depthBadge(depth: number) {
  return DEPTH_BADGE[Math.min(depth, 4)];
}

interface NavItemProps {
  node: NavNode;
  depth: number;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
}

function NavItem({ node, depth, openKeys, onToggle }: NavItemProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = openKeys.has(node.key);

  return (
    <li>
      <div
        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-low transition-colors ${depth === 0 ? "mb-0.5" : ""}`}
      >
        {/* Toggle button — only shown when the item has children */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.key)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface transition-transform duration-150"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-ghost-border" />
          </span>
        )}

        {/* Label + href */}
        <div className="flex-1 min-w-0 flex items-baseline gap-3">
          <Link
            href={node.href}
            target={node.openInNewTab ? "_blank" : undefined}
            rel={node.openInNewTab ? "noopener noreferrer" : undefined}
            className={`truncate hover:underline underline-offset-2 ${depthLabel(depth)}`}
          >
            {node.label}
          </Link>
          <span className="hidden group-hover:block text-xs text-on-surface-variant opacity-50 truncate font-mono">
            {node.href}
          </span>
        </div>

        {/* Right-side indicators */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasChildren && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${depthBadge(depth)}`}>
              {node.children.length}
            </span>
          )}
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${depthBadge(depth)} opacity-60`}>
            L{depth + 1}
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div className="ml-4 pl-3 border-l border-ghost-border">
          <NavList nodes={node.children} depth={depth + 1} openKeys={openKeys} onToggle={onToggle} />
        </div>
      )}
    </li>
  );
}

interface NavListProps {
  nodes: NavNode[];
  depth: number;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
}

function NavList({ nodes, depth, openKeys, onToggle }: NavListProps) {
  return (
    <ul className="space-y-0.5 py-1">
      {nodes.map((node) => (
        <NavItem key={node.key} node={node} depth={depth} openKeys={openKeys} onToggle={onToggle} />
      ))}
    </ul>
  );
}

export default function NestedNavMenu({ tree }: Props) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => getAllExpandableKeys(tree));

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const total = countNodes(tree);
  const depth = maxDepth(tree);

  return (
    <div data-component="NestedNavMenu">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex gap-4 text-xs text-on-surface-variant font-mono">
          <span>{total} items</span>
          <span>{depth} levels deep</span>
          <span>{tree.length} root nodes</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenKeys(getAllExpandableKeys(tree))}
            className="text-xs px-3 py-1 rounded-lg border border-ghost-border text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition-colors"
          >
            Expand all
          </button>
          <button
            onClick={() => setOpenKeys(new Set())}
            className="text-xs px-3 py-1 rounded-lg border border-ghost-border text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Tree */}
      <NavList nodes={tree} depth={0} openKeys={openKeys} onToggle={toggle} />
    </div>
  );
}
