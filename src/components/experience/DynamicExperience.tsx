import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
} from "@optimizely/cms-sdk/react/server";

// A component placed directly under the experience (a sectionEnabled block used
// as its own section) is a bare nodeType:"component" node - it has no
// section->row->column ancestry. The CMS on-page editor builds a depth tree of
// [data-epi-block-id] boundaries and treats a top-level boundary as a SECTION
// (click scrolls, inputs never fold open) but a nested one as an editable
// COMPONENT (click folds open). Elements inside a BlankSection get that nesting
// for free; root-level components don't.
//
// In edit mode only, wrap a root component's real block-id boundary in synthetic
// section/row/column boundaries so it sits at component depth in that tree and
// the editor folds its inputs open. Published output keeps the single wrapper.
function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  const attrs = pa(node);
  const editing = (node as { __context?: { edit?: boolean } }).__context?.edit;
  const key = (node as { key?: string }).key;

  if (!editing || !key) {
    return <div {...attrs}>{children}</div>;
  }

  return (
    <div data-epi-block-id={`${key}::section`}>
      <div data-epi-block-id={`${key}::row`}>
        <div data-epi-block-id={`${key}::col`}>
          <div {...attrs}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function DynamicExperience({ content }: { content: any }) {
  const nodes: any[] = content?.composition?.nodes ?? [];
  return (
    <div data-component="DynamicExperience">
      <OptimizelyComposition nodes={nodes} ComponentWrapper={ComponentWrapper} />
    </div>
  );
}
