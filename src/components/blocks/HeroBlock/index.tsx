import Image from "next/image";

interface HeroBlockProps {
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
  inEditMode?: boolean;
}

export default function HeroBlock({
  headline,
  subheadline,
  heading,
  summary,
  backgroundImage,
  background,
  ctaText,
  ctaLink,
  inEditMode,
}: HeroBlockProps) {
  const title = headline ?? heading;
  const subtitle = subheadline ?? summary;
  const bgUrl = backgroundImage?._metadata?.url?.default ?? background?._metadata?.url?.default;

  return (
    <section
      className="relative w-full min-h-[640px] flex items-center overflow-hidden"
      style={{ background: "var(--gradient-brand)" }}
    >
      {bgUrl && (
        <Image
          src={bgUrl}
          alt={headline ?? ""}
          fill
          className="object-cover opacity-30"
          priority
        />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-32 w-full">
        <div className="max-w-3xl">
          {title && (
            <h1
              data-epi-edit={inEditMode ? "headline" : undefined}
              className="text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              data-epi-edit={inEditMode ? "subheadline" : undefined}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed"
              style={{ color: "rgba(242, 241, 255, 0.85)" }}
            >
              {subtitle}
            </p>
          )}
          {ctaLink && (
            <a
              href={ctaLink}
              className="hover-lift inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
