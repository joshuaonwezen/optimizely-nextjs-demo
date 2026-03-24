import Link from "next/link";

const NAV_LINKS = [
  { label: "CMS", href: "/cms" },
  { label: "Feature Experimentation", href: "/feature-experimentation" },
  { label: "Web Experimentation", href: "/web-experimentation" },
  { label: "Analytics", href: "/analytics" },
  { label: "Contact", href: "/contact" },
];

export default function NavigationHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-[20px] bg-nav-glass">
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight text-on-surface"
        >
          Optimizely
        </Link>
        <div className="flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="font-body text-sm font-medium text-on-surface-variant hover:text-brand transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
