import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

// Columns and rows are modelled as JSON because the table shape is a
// structured matrix — a row is a label + N values matched to columns by index.
// Modelling each row/column as its own content type would explode the
// content tree without making editing any easier.
export const ComparisonTableBlockType = contentType({
  key: "ComparisonTableBlock",
  displayName: "Comparison Table",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", indexingType: "searchable", isLocalized: true },
    // [{ name: "Plus", highlighted: true }, ...]
    columns:    { type: "json",   displayName: "Columns (JSON array)", isLocalized: true },
    // [{ label: "Monthly fee", values: ["£0", "£0", "£5"] }, ...]
    rows:       { type: "json",   displayName: "Rows (JSON array)",    isLocalized: true },
  },
});

interface ColumnDef {
  name: string;
  highlighted?: boolean;
}

interface RowDef {
  label: string;
  values: string[];
}

interface ComparisonTableData {
  heading?:    string | null;
  subheading?: string | null;
  columns?:    ColumnDef[] | string | null;
  rows?:       RowDef[] | string | null;
  __context?: { edit?: boolean } | null;
}

type ComparisonTableBlockProps = ComparisonTableData & {
  content?: ComparisonTableData;
  displaySettings?: Record<string, string | boolean>;
};

function parseJson<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value) as T[];
  } catch {
    return [];
  }
}

export default function ComparisonTableBlock(props: ComparisonTableBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const columns = parseJson<ColumnDef>(data.columns);
  const rows = parseJson<RowDef>(data.rows);

  if (columns.length === 0 || rows.length === 0) return null;

  return (
    <section data-component="ComparisonTableBlock" className="py-20 max-w-6xl mx-auto px-8">
      {data.heading && (
        <h2
          {...pa("heading")}
          className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-3 text-center"
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className="text-base text-on-surface-variant mb-12 max-w-2xl mx-auto text-center"
        >
          {data.subheading}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-ghost-border bg-surface-lowest">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ghost-border">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Feature
              </th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left px-6 py-4 font-display text-base font-bold ${
                    col.highlighted ? "text-brand bg-surface" : "text-on-surface"
                  }`}
                >
                  {col.name}
                  {col.highlighted && (
                    <span className="ml-2 text-xs font-bold uppercase tracking-widest text-brand opacity-80">
                      Best
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-ghost-border last:border-b-0">
                <td className="px-6 py-4 font-semibold text-on-surface">
                  {row.label}
                </td>
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={`px-6 py-4 ${col.highlighted ? "bg-surface" : ""} text-on-surface-variant`}
                  >
                    {row.values?.[ci] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
