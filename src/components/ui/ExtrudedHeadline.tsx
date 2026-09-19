import type { CSSProperties } from "react";

// Deepest layer first; the last one is the LFGreen top face.
const LAYERS = ["#227d47", "#2e8c45", "#40a142", "#3ab533", "#abff44"];
const STEP = 0.063; // em shift per layer, up and to the right

interface Props {
  text: string;
  as?: "h1" | "h2";
  /** Size, alignment and spacing classes from the block. */
  className?: string;
  /** Preview attributes from pa(). They go on the readable top layer, so on-page
   *  editing opens the headline field instead of a decorative copy. */
  textAttrs?: Record<string, string | undefined>;
}

/**
 * optimizely.com's 3D headline: the text stacked five times, each copy shifted
 * up-right and a shade lighter, outlined in Dark Fir. Only the top copy is exposed
 * to assistive tech, so the headline is announced once.
 */
export function ExtrudedHeadline({ text, as: Tag = "h1", className = "", textAttrs = {} }: Props) {
  return (
    <Tag data-component="ExtrudedHeadline" className={`font-display font-extrabold tracking-[-0.01em] ${className}`}>
      <span className="relative inline-block" style={{ paddingTop: "0.26em", paddingRight: "0.26em" }}>
        {LAYERS.map((color, i) => {
          const isTop = i === LAYERS.length - 1;
          const style: CSSProperties = {
            color,
            WebkitTextStroke: "0.025em #08251a",
            paintOrder: "stroke fill",
            transform: `translate(${i * STEP}em, ${-i * STEP}em)`,
            ...(i > 0 && { position: "absolute", inset: "0.26em 0.26em 0 0" }),
          };
          return (
            <span
              key={i}
              aria-hidden={isTop ? undefined : true}
              className={`inline-block whitespace-pre-wrap ${isTop ? "" : "select-none"}`}
              style={style}
              {...(isTop ? textAttrs : {})}
            >
              {text}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
