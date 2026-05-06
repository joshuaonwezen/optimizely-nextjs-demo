import NestedNavMenu from "@/components/demo/NestedNavMenu";
import { getNavigation } from "@/lib/graphql/queries/GetNavigation";

interface Props {
  _metadata?: { key?: string | null } | null;
  previewToken?: string;
}

export default async function NavigationBlock({ _metadata, previewToken }: Props) {
  const { tree } = await getNavigation({ previewToken, key: _metadata?.key ?? undefined });

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
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
