// Single-series horizontal bar chart. Uses `bg-brand` (the ink token, not
// bg-brand-fill) for the mark - LFGreen only clears ~1.1:1 against the page
// surface in light mode (see DESIGN.md's ink/fill split), which would make
// the bar itself nearly invisible. `--color-brand` already flips anchor
// between Light Fir (light mode) and LFGreen (dark mode), so one class
// clears contrast in both themes without a manual light/dark branch.
interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  title: string;
  data: BarChartDatum[];
  formatValue?: (value: number) => string;
  className?: string;
}

export function BarChart({ title, data, formatValue = (v) => v.toLocaleString(), className = "" }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div data-component="BarChart" className={className}>
      <p className="type-eyebrow text-on-surface-variant mb-4">{title}</p>

      <div className="space-y-3" role="img" aria-label={`${title} bar chart`}>
        {data.map((d) => {
          const pct = Math.max((d.value / max) * 100, 2);
          return (
            <div key={d.label} className="group flex items-center gap-3" title={`${d.label}: ${formatValue(d.value)}`}>
              <span className="w-24 shrink-0 text-sm text-on-surface-variant truncate">{d.label}</span>
              <div className="flex-1 border-l border-outline-variant">
                <div
                  className="h-4 rounded-r bg-brand transition-colors group-hover:bg-brand-dim"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-display font-semibold text-on-surface text-sm shrink-0 w-16 text-right">
                {formatValue(d.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Accessible twin - screen readers get real values, not the visual bar. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
