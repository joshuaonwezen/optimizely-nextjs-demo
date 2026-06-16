interface BannerProps {
  message: string;
  linkText?: string | null;
}

export function Banner1({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner1" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-gradient-brand text-on-brand">
      <span>{message}</span>
      {linkText && (
        <span className="underline underline-offset-2 font-semibold opacity-80">{linkText}</span>
      )}
    </div>
  );
}

export function Banner2({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner2" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-emerald-600 text-white">
      <span className="text-emerald-200 text-xs">✦</span>
      <span>{message}</span>
      {linkText && (
        <span className="underline underline-offset-2 font-semibold opacity-90">{linkText}</span>
      )}
    </div>
  );
}

export function Banner3({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner3" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-slate-900 text-slate-100">
      <span className="text-brand text-xs font-bold tracking-wide">NEW</span>
      <span>{message}</span>
      {linkText && (
        <span className="text-brand underline underline-offset-2 font-semibold">{linkText}</span>
      )}
    </div>
  );
}

export function Banner4({ message, linkText }: BannerProps) {
  return (
    <div data-component="Banner4" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-amber-400 text-amber-950">
      <span className="font-bold text-xs uppercase tracking-wide">Limited time</span>
      <span className="opacity-40">|</span>
      <span>{message}</span>
      {linkText && (
        <span className="underline underline-offset-2 font-semibold opacity-80">{linkText}</span>
      )}
    </div>
  );
}
