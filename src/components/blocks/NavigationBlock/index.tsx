import NestedNavMenu from "@/components/demo/NestedNavMenu";
import { toNavNode, type RawNavItem } from "@/lib/graphql/queries/GetNavigation";

interface Props {
  name?: string | null;
  navItems?: Array<RawNavItem | { __typename?: string }> | null;
}

export default function NavigationBlock({ name, navItems }: Props) {
  const tree = (navItems ?? [])
    .filter((c): c is RawNavItem => (c as RawNavItem).__typename === "NavigationItem")
    .map(toNavNode);

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      {name && (
        <h2 className="font-display text-xl font-bold text-on-surface mb-6">{name}</h2>
      )}
      <div className="bg-surface-lowest rounded-2xl border border-ghost-border p-6">
        {tree.length > 0 ? (
          <NestedNavMenu tree={tree} />
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-4">
            No navigation items configured.
          </p>
        )}
      </div>
    </div>
  );
}
