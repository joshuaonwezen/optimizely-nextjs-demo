import SectionAnchor from "./SectionAnchor";

/**
 * The h2 that opens each section of a /demo page, with a "#" permalink to the
 * section. The enclosing <section id> is what DemoTableOfContents lists.
 */
export default function DemoSectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
      {children} <SectionAnchor id={id} />
    </h2>
  );
}
