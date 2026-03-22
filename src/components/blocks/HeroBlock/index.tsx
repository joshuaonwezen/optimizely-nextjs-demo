import Image from "next/image";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface HeroBlockData {
  headline?: string | null;
  subheadline?: string | null;
  heading?: string | null;
  summary?: string | null;
  backgroundImage?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  background?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  __context?: any;
}

type HeroBlockProps = HeroBlockData & {
  content?: HeroBlockData;
  inEditMode?: boolean;
};

export default function HeroBlock(props: HeroBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const title = data.headline ?? data.heading;
  const subtitle = data.subheadline ?? data.summary;
  const bgUrl = data.backgroundImage?._metadata?.url?.default ?? data.background?._metadata?.url?.default;

  return (
    <section
      className="relative w-full min-h-[640px] flex items-center overflow-hidden"
      style={{ background: "var(--gradient-brand)" }}
    >
      {bgUrl && (
        <Image
          src={bgUrl}
          alt={data.headline ?? ""}
          fill
          className="object-cover opacity-30"
          priority
        />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-32 w-full">
        <div className="max-w-3xl">
          {title && (
            <h1
              {...pa("heading")}
              className="text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              {...pa("summary")}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed"
              style={{ color: "rgba(242, 241, 255, 0.85)" }}
            >
              {subtitle}
            </p>
          )}
          {data.ctaLink && (
            <a
              href={data.ctaLink}
              className="hover-lift inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
