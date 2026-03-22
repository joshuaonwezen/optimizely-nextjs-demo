import Link from "next/link";

const NAV_LINKS = [
  { label: "CMS", href: "/cms" },
  { label: "Feature Experimentation", href: "/feature-experimentation" },
  { label: "Web Experimentation", href: "/web-experimentation" },
  { label: "Analytics", href: "/analytics" },
];

export default function NavigationHeader() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-[20px]"
      style={{ background: "rgba(255, 255, 255, 0.80)" }}
    >
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Optimizely
        </Link>
        <div className="flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-on-surface-variant hover:text-brand transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
