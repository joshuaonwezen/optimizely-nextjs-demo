export default function DemoHero({
  title,
  description,
  eyebrow = "Developer Demo",
  children,
}: {
  title: string;
  description: React.ReactNode;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <section data-component="DemoHero" className="bg-gradient-brand py-20">
      <div className="max-w-7xl mx-auto px-8">
        <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
          {title}
        </h1>
        <p className="text-on-brand-muted max-w-2xl text-lg leading-relaxed">
          {description}
        </p>
        {children}
      </div>
    </section>
  );
}
