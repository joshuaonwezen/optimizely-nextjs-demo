interface BannerProps {
  message: string;
  linkText?: string | null;
}

// Gradient brand (blue → light-blue) - bold, flagship feel
export function Banner1({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner1" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-gradient-brand text-on-brand">
      <span className="text-[10px] opacity-50">◆</span>
      <span>{message}</span>
      {linkText && (
        <span className="underline underline-offset-2 font-semibold opacity-80">{linkText}</span>
      )}
      <span className="text-[10px] opacity-50">◆</span>
    </div>
  );
}

// Solid primary blue - clean, direct
export function Banner2({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner2" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-brand text-on-brand">
      <span>{message}</span>
      {linkText && (
        <>
          <span className="opacity-30">·</span>
          <span className="font-semibold underline underline-offset-2 opacity-90">{linkText}</span>
        </>
      )}
    </div>
  );
}

// Insight gradient (blue → purple) - premium, elevated
export function Banner3({ message, linkText }: BannerProps) {
  return (
    <div
      data-component="Banner3"
      className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 text-on-brand"
      style={{ background: "var(--gradient-insight)" }}
    >
      <span>{message}</span>
      {linkText && (
        <span className="underline underline-offset-2 font-semibold opacity-85">
          {linkText} &rarr;
        </span>
      )}
    </div>
  );
}

// Surface-low with brand accent dot - subtle, informational
export function Banner4({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner4" className="h-9 flex items-center justify-center text-sm font-medium gap-3 px-4 bg-surface-low text-on-surface">
      <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
      <span>{message}</span>
      {linkText && (
        <span className="text-brand font-semibold underline underline-offset-2">{linkText}</span>
      )}
    </div>
  );
}
