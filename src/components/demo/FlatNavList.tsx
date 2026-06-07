"use client";

interface NavItem {
  label: string;
  href: string;
  meta?: string;
}

export default function FlatNavList({ items }: { items: NavItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-on-surface-variant italic py-4">No items found.</p>
    );
  }

  return (
    <ul className="divide-y divide-ghost-border">
      {items.map((item) => (
        <li
          key={item.href}
          className="flex items-center justify-between gap-4 py-2.5 px-1 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-on-surface truncate">
              {item.label}
            </span>
            {item.meta && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-low text-on-surface-variant shrink-0">
                {item.meta}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[200px] text-right">
            {item.href}
          </span>
        </li>
      ))}
    </ul>
  );
}
