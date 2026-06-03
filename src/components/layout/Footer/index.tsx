import Link from "next/link";
import { getDemoLinks } from "@/lib/getDemoLinks";

export default function Footer() {
  const demoLinks = getDemoLinks();
  return (
    <footer className="py-16 bg-surface-low">
      <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {demoLinks.map((link) => (
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
          Banking built around you &middot; Mosey Bank
        </p>
      </div>
    </footer>
  );
}
