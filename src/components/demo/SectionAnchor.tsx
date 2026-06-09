export default function SectionAnchor({ id, label = "#" }: { id: string; label?: string }) {
  return (
    <a
      data-component="SectionAnchor"
      href={`#${id}`}
      className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg"
    >
      {label}
    </a>
  );
}
