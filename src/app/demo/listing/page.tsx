import ListingDemo from "./ListingDemo";

export { metadata } from "./ListingDemo";

// Static on purpose: awaiting the real searchParams renders every request, the
// bare URL included, so the CDN could never cache it. A request carrying a
// ?category= or ?cursor= param is rewritten to filtered/page.tsx in next.config.ts.
export default function ListingDemoPage() {
  return <ListingDemo searchParams={Promise.resolve({})} />;
}
