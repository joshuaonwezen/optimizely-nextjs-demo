import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
} from "@optimizely/cms-sdk/react/server";

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

export default function DynamicExperience({ content }: { content: any }) {
  const nodes: any[] = content?.composition?.nodes ?? [];
  return (
    <OptimizelyComposition nodes={nodes} ComponentWrapper={ComponentWrapper} />
  );
}
