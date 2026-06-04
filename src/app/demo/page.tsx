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
