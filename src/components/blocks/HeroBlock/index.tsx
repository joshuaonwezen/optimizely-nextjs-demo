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
  displaySettings?: Record<string, string | boolean>;
  inEditMode?: boolean;
};

export default function HeroBlock(props: HeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const title = data.headline ?? data.heading;
  const subtitle = data.subheadline ?? data.summary;
  const bgUrl =
    data.backgroundImage?._metadata?.url?.default ??
    data.background?._metadata?.url?.default;

  const isCentered = ds?.alignment === "center";
  const isTall = ds?.height === "tall";
  const showOverlay = ds?.overlay === true;

  return (
    <section
      {...pa((data as any).__composition)}
      className={`bg-gradient-brand relative w-full flex items-center overflow-hidden ${isTall ? "min-h-screen" : "min-h-[640px]"}`}
    >
      {bgUrl && (
        <Image
          src={bgUrl}
          alt={data.headline ?? ""}
          fill
          className={`object-cover ${showOverlay ? "opacity-20" : "opacity-30"}`}
          priority
        />
      )}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-8 py-32 w-full ${isCentered ? "text-center" : ""}`}
      >
        <div className={isCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {title && (
            <h1
              {...pa("headline")}
              className="font-display text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              {...pa("subheadline")}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed text-on-brand-subtle"
            >
              {subtitle}
            </p>
          )}
          {data.ctaLink && (
            <a
              href={data.ctaLink}
              className="hover-lift font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
            >
              {data.ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
