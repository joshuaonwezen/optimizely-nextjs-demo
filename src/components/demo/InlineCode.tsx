/** Inline code in demo prose. */
export default function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-surface-low px-1 rounded text-xs font-mono">{children}</code>;
}
