import type { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import type { ResolvedStyles } from "./displayTemplateSettings";

type PreviewAttrs = ReturnType<typeof getPreviewUtils>["pa"];

/**
 * The heading + subheading pair at the top of section blocks (TeamGrid, Timeline,
 * FaqContainer, ComparisonTable, LogoGrid, ArticleList). Font and colors come from
 * the block's resolved display settings; size and spacing stay per block.
 */
export function BlockHeader({
  heading,
  subheading,
  pa,
  style,
  headingSize = "text-3xl md:text-4xl",
  headingClassName = "",
  subheadingClassName = "text-base",
  align = "",
}: {
  heading?: string | null;
  subheading?: string | null;
  pa: PreviewAttrs;
  style: Pick<ResolvedStyles, "font" | "text" | "textMuted">;
  /** Tailwind size classes for the h2. */
  headingSize?: string;
  headingClassName?: string;
  /** Size and spacing classes for the subheading paragraph. */
  subheadingClassName?: string;
  /** Text alignment class (ResolvedStyles.align) applied to both lines. */
  align?: string;
}) {
  return (
    <>
      {heading && (
        <h2 {...pa("heading")} className={`${style.font} ${headingSize} font-extrabold ${style.text} mb-3 ${align} ${headingClassName}`.trim()}>
          {heading}
        </h2>
      )}
      {subheading && (
        <p {...pa("subheading")} className={`${subheadingClassName} ${align} ${style.textMuted}`.trim()}>
          {subheading}
        </p>
      )}
    </>
  );
}
