export default function KeyPoints({ points }: { points: React.ReactNode[] }) {
  return (
    <section data-component="KeyPoints" id="key-points" className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
      <h2 className="font-display text-lg font-bold text-on-surface mb-4">
        Key Things to Know
        <a href="#key-points" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">
          #
        </a>
      </h2>
      <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-brand font-bold shrink-0">→</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
