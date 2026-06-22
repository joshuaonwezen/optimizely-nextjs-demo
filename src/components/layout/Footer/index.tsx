import Link from "next/link";
import { getDemoCategories } from "@/lib/getDemoLinks";
import { FooterCtaClient } from "./FooterCtaClient";

export default function Footer() {
  const categories = getDemoCategories();

  return (
    <footer data-component="Footer" data-track-event="mb_nav_click" data-track-tags={JSON.stringify({ source: "footer" })} className="bg-surface-low">
      <FooterCtaClient />
      <div className="py-16">
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
                      prefetch={false}
                      className="text-xs text-on-surface-variant hover:text-brand transition-colors font-mono"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <p className="text-sm text-on-surface-variant">
              Banking built around you &middot; Mosey Bank
            </p>
            <a
              href="https://github.com/joshuaonwezen/optimizely-nextjs-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-brand transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
