interface FileEntry {
  label: string;
  path: string;
  content: string;
}

interface Props {
  heading?: string;
  files: FileEntry[];
}

export default function SourcePanel({ heading = "Source files", files }: Props) {
  return (
    <details data-component="SourcePanel" className="group mt-12 border border-ghost-border rounded-2xl overflow-hidden">
      <summary className="flex items-center justify-between px-6 py-4 cursor-pointer bg-surface-low hover:bg-surface-low/80 transition-colors list-none select-none">
        <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-brand shrink-0">
            <path d="M4.5 3.5L1.5 7.5l3 4M10.5 3.5l3 4-3 4M8.5 1.5l-2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {heading}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className="text-on-surface-variant transition-transform duration-150 group-open:rotate-180"
          >
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="bg-surface-lowest divide-y divide-ghost-border">
        {files.map((f) => (
          <div key={f.path}>
            <div className="flex items-center gap-2 px-6 py-2.5 bg-surface-low/60 border-t border-ghost-border">
              <svg width="12" height="13" viewBox="0 0 12 13" fill="none" className="text-on-surface-variant/50 shrink-0">
                <rect x="1" y="1" width="7.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 4.5h3.5M3 7h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] font-mono text-on-surface-variant">{f.path}</span>
            </div>
            <pre className="px-6 py-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto max-h-[500px] whitespace-pre">
              <code>{f.content}</code>
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}
