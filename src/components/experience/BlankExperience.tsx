import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
} from "@optimizely/cms-sdk/react/server";

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

export default function BlankExperience({ content }: { content: any }) {
  const nodes: any[] = content?.composition?.nodes ?? [];
  return (
    <div data-component="BlankExperience">
      <OptimizelyComposition nodes={nodes} ComponentWrapper={ComponentWrapper} />
    </div>
  );
}
