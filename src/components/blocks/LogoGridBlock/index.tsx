import Image from "next/image";
import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const LogoGridBlockType = contentType({
  key: "LogoGridBlock",
  displayName: "Logo / Partner Grid",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading" },
    subheading: { type: "string", displayName: "Subheading" },
    logos: {
      type: "array",
      displayName: "Partner Logos",
      items: { type: "content", allowedTypes: ["_image"] },
    },
  },
});

interface LogoItem {
  _metadata?: {
    url?: { default?: string | null } | null;
    displayName?: string | null;
  } | null;
}

interface LogoGridData {
  heading?:    string | null;
  subheading?: string | null;
  logos?:      Array<LogoItem | null> | null;
}

type LogoGridBlockProps = LogoGridData & {
  content?: LogoGridData;
  displaySettings?: Record<string, string | boolean>;
};

const PLACEHOLDER_COUNT = 6;

export default function LogoGridBlock(props: LogoGridBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const logos = (data.logos ?? []).filter((l): l is LogoItem => l !== null);
  const showPlaceholders = logos.length === 0;

  return (
    <section className="py-20 px-8 max-w-7xl mx-auto text-center">
      {data.heading && (
        <h2
          {...pa("heading")}
          className="font-display text-2xl md:text-3xl font-extrabold text-on-surface mb-3"
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className="text-sm text-on-surface-variant mb-12 max-w-xl mx-auto"
        >
          {data.subheading}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-8">
        {showPlaceholders
          ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
              <div
                key={i}
                className="w-32 h-16 rounded-xl bg-surface-low flex items-center justify-center text-xs text-on-surface-variant opacity-50"
              >
                Logo {i + 1}
              </div>
            ))
          : logos.map((logo, i) => {
              const src  = logo._metadata?.url?.default;
              const name = logo._metadata?.displayName ?? `Partner ${i + 1}`;
              if (!src) return null;
              return (
                <div
                  key={i}
                  className="relative w-32 h-16 grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                >
                  <Image
                    src={src}
                    alt={name}
                    fill
                    className="object-contain"
                    sizes="128px"
                  />
                </div>
              );
            })}
      </div>
    </section>
  );
}
