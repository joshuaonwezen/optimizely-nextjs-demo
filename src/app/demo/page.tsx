import DemoIndex from "./DemoIndex";

export { metadata } from "./DemoIndex";

// Static on purpose: awaiting the real searchParams renders every request, the
// bare URL included, so the CDN could never cache it. A request carrying a
// ?category= filter is rewritten to filtered/page.tsx in next.config.ts.
export default function DemoIndexPage() {
  return <DemoIndex searchParams={Promise.resolve({})} />;
}
