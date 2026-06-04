import Link from "next/link";
import { getDemoCategories } from "@/lib/getDemoLinks";

export default function Footer() {
  const categories = getDemoCategories();
  return (
    <footer className="py-16 bg-surface-low">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 mb-8">
          {categories.map((category) => (
            <div key={category.label} className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                {category.label}
              </p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                {category.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs text-on-surface-variant hover:text-brand transition-colors font-mono"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-on-surface-variant text-center">
          Banking built around you &middot; Mosey Bank
        </p>
      </div>
    </footer>
  );
}
