import type { Metadata } from "next";
import Link from "next/link";
import { getDemoCategories } from "@/lib/getDemoLinks";

export const metadata: Metadata = {
  title: "Developer Demos",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  CMS: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <rect x="2" y="3" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 7h4M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Integrations: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10H10M10 10L12.5 5M10 10L12.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Performance: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <path d="M3 14l4-4 3 3 4-6 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const CATEGORY_COLORS: Record<string, string> = {
  CMS:          "bg-brand/5 text-brand border-brand/10",
  Integrations: "bg-tertiary/5 text-tertiary border-tertiary/10",
  Performance:  "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const LINK_HOVER: Record<string, string> = {
  CMS:          "hover:border-brand/30 hover:bg-brand/5",
  Integrations: "hover:border-tertiary/30 hover:bg-tertiary/5",
  Performance:  "hover:border-emerald-200 hover:bg-emerald-50/50",
};

export default function DemoIndexPage() {
  const categories = getDemoCategories();
  const total = categories.reduce((n, c) => n + c.links.length, 0);

  return (
    <div className="min-h-screen bg-surface">

      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demos
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            CMS Demos
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            {total} interactive demos showing how Optimizely CMS, Feature
            Experimentation, and Graph work together in a real Next.js
            application.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {categories.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand"
              >
                {c.label} · {c.links.length} demo{c.links.length !== 1 ? "s" : ""}
              </span>
            ))}
            <a
              href="https://github.com/joshuaonwezen/optimizely-nextjs-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-on-brand/10 text-on-brand hover:bg-on-brand/20 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">
        {categories.map((category) => (
          <section key={category.label}>
            {/* Category header */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${CATEGORY_COLORS[category.label]}`}>
                {CATEGORY_ICONS[category.label]}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-on-surface">
                  {category.label}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  {category.links.length} demo{category.links.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Demo cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group block bg-surface-lowest border border-ghost-border rounded-2xl p-5 transition-all duration-200 ${LINK_HOVER[category.label]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold text-on-surface group-hover:text-brand transition-colors leading-tight mb-1">
                        {link.label}
                      </p>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 mt-0.5 text-on-surface-variant group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                    >
                      <path d="M3 13L13 3M13 3H7M13 3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="mt-4 pt-4 border-t border-ghost-border">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${CATEGORY_COLORS[category.label]}`}>
                      {category.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
