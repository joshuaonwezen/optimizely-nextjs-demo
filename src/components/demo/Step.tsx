import { StepBadge } from "@/components/ui/StepBadge";

// Numbered walkthrough step. Extracted because three demo pages need it after the
// Experimentation/Personalization split; it was previously defined twice, identically apart
// from `flex-1` on the text column. This keeps the feature-experimentation version, which
// lets the prose fill the row instead of shrink-wrapping.
export default function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <StepBadge size="xl">{number}</StepBadge>
      <div className="pt-1 flex-1">
        <h3 className="font-display font-semibold text-on-surface mb-1">{title}</h3>
        <div className="text-sm text-on-surface-variant leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
