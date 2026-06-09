export default function LiveDemoShell({
  children,
  label,
  action,
}: {
  children: React.ReactNode;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div data-component="LiveDemoShell" className="mt-8 rounded-2xl border border-brand/20 overflow-hidden">
      <div className="bg-brand/5 border-b border-brand/20 px-5 py-3 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand">Live Demo</span>
        <span className="text-xs text-on-surface-variant">{label}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="p-6 bg-surface">{children}</div>
    </div>
  );
}
