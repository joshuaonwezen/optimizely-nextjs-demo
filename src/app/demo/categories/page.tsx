import CategoriesDemo from "./CategoriesDemo";

export { metadata } from "./CategoriesDemo";

// Static on purpose: awaiting the real searchParams renders every request, the
// bare URL included, so the CDN could never cache it. A request carrying a
// ?category= filter is rewritten to filtered/page.tsx in next.config.ts.
export default function CategoriesDemoPage() {
  return <CategoriesDemo searchParams={Promise.resolve({})} />;
}
