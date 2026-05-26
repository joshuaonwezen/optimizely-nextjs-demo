import Link from "next/link";

const DEMO_LINKS = [
  { href: "/demo/navigation",        label: "Navigation" },
  { href: "/demo/referrals",         label: "External Content Sync" },
  { href: "/demo/feature-flags",     label: "Feature Experimentation" },
  { href: "/demo/personalization",   label: "CMS Personalization" },
];

export default function Footer() {
  return (
    <footer className="py-16 bg-surface-low">
      <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {DEMO_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-on-surface-variant hover:text-brand transition-colors font-mono"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-on-surface-variant">
          Powered by Optimizely SaaS CMS &amp; Next.js
        </p>
      </div>
    </footer>
  );
}
