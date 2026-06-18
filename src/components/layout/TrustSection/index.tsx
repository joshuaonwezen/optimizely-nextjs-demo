import { getOptimizelyUser } from "@/lib/optimizely/user";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

const STATS = [
  { value: "4.9★",  label: "App store rating" },
  { value: "2M+",   label: "Active customers" },
  { value: "$0",    label: "Monthly fees" },
  { value: "FDIC",  label: "Insured deposits" },
];

const TESTIMONIALS = [
  {
    quote: "Switched from my old bank six months ago and I have not looked back. The savings rate alone paid for itself.",
    name: "Sarah K.",
    role: "Personal banking customer",
  },
  {
    quote: "Running payroll used to take hours. With Mosey Business it takes minutes and the reporting is actually useful.",
    name: "James L.",
    role: "Small business owner",
  },
  {
    quote: "Got approved for my mortgage in two days. Every other bank had me waiting two weeks. Incredible.",
    name: "Priya M.",
    role: "First-time homebuyer",
  },
];

export default async function TrustSection() {
  const user = await getOptimizelyUser();
  const decision = user.decide("trust_section_style");
  if (!decision.enabled) return null;

  const style = (decision.variables.style as string) || "stats";

  return (
    <>
      <section data-component="TrustSection" className="py-16 bg-surface border-t border-ghost-border">
        <div className="max-w-7xl mx-auto px-8">
          {style === "testimonials" ? (
            <>
              <h2 className="text-2xl font-display font-bold text-on-surface mb-10 text-center">
                What our customers say
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t) => (
                  <div key={t.name} className="bg-surface-low rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-on-surface leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{t.name}</p>
                      <p className="text-xs text-on-surface-variant">{t.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {STATS.map(({ value, label }) => (
                <div key={value} className="flex flex-col gap-2">
                  <span className="font-display text-4xl font-extrabold text-brand">{value}</span>
                  <span className="text-sm text-on-surface-variant">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <FxBucketingEvent flagKey="trust_section_style" />
    </>
  );
}
