import { notFound } from "next/navigation";
import { ExtrudedHeadline } from "@/components/ui/ExtrudedHeadline";

// Local-only preview of optimizely.com's 3D "extruded" headline. Not linked from
// the demo nav, not a CMS block, and 404s in production builds.

export default function ThreeDHeadlinePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div data-component="ThreeDHeadlinePage">
      <section className="bg-[#08251a] py-28 px-8 text-center">
        <ExtrudedHeadline text="Banking built around you" className="text-5xl md:text-7xl lg:text-8xl leading-[0.9]" />
      </section>
      <section className="bg-brand-fill py-28 px-8">
        <ExtrudedHeadline text="You're free to grow" className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] max-w-5xl mx-auto" />
      </section>
      <section className="bg-surface py-28 px-8 text-center">
        <ExtrudedHeadline text="Save smarter" className="text-5xl md:text-7xl leading-[0.9]" />
      </section>
    </div>
  );
}
