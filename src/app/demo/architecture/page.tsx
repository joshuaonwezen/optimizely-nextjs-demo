import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Architecture",
};

const MARKERS = [
  { id: "arr-blue",   color: "#3b82f6" },
  { id: "arr-purple", color: "#9333ea" },
  { id: "arr-orange", color: "#f97316" },
  { id: "arr-teal",   color: "#0d9488" },
  { id: "arr-red",    color: "#ef4444" },
  { id: "arr-green",  color: "#16a34a" },
  { id: "arr-lblue",  color: "#60a5fa" },
];

function Box({
  x, y, w = 152, h = 74,
  hc, bc, stroke,
  title, sub = [],
}: {
  x: number; y: number; w?: number; h?: number;
  hc: string; bc: string; stroke: string;
  title: string; sub?: string[];
}) {
  const hh = 24;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={bc} stroke={stroke} strokeWidth={1} />
      <rect x={x} y={y} width={w} height={hh} rx={8} fill={hc} />
      <rect x={x} y={y + hh - 8} width={w} height={8} fill={hc} />
      <text
        x={x + w / 2} y={y + hh / 2 + 5}
        textAnchor="middle" fill="white"
        fontSize={11} fontWeight="bold" fontFamily="system-ui,sans-serif"
      >
        {title}
      </text>
      {sub.map((line, i) => (
        <text
          key={i}
          x={x + w / 2} y={y + hh + 14 + i * 13}
          textAnchor="middle" fill="#5f6368"
          fontSize={9.5} fontFamily="system-ui,sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// Box positions (x, y top-left, w=152, h=74):
//   Browser:     (14,  160)  right=166  center=(90,  197)
//   Vercel CDN:  (208, 160)  right=360  center=(284, 197)
//   Next.js:     (412, 160)  right=564  center=(488, 197)  bottom=234
//   Graph:       (616, 90)   right=768  center=(692, 127)  bottom=164
//   FX SDK:      (616, 264)  right=768  center=(692, 301)  [teal]
//   CMS:         (836, 90)   right=988  center=(912, 127)  bottom=164

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-surface">

      {/* ── Hero ── */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            System Architecture
          </h1>
          <p className="text-on-brand opacity-80 max-w-2xl text-lg leading-relaxed">
            How Optimizely SaaS CMS, Graph, and Feature Experimentation connect to this Next.js app —
            request flow, content delivery, flag evaluation, and cache invalidation.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Architecture Diagram</h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
            Request flow left to right. CMS sits behind Graph — content syncs into Graph on publish,
            and Graph fires a webhook back to invalidate the ISR cache.
          </p>

          <div className="rounded-2xl border border-ghost-border bg-white p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1060 450"
              width="100%"
              style={{ minWidth: 700 }}
              aria-label="System architecture diagram"
            >
              <defs>
                {MARKERS.map(({ id, color }) => (
                  <marker
                    key={id} id={id}
                    viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth={6} markerHeight={6} orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                  </marker>
                ))}
              </defs>

              {/* ── Arrows (drawn first, behind boxes) ── */}

              {/* 0. Next.js → Browser — HTML response (above request arrows, going left) */}
              <line x1={412} y1={150} x2={166} y2={150}
                stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-lblue)" />

              {/* 1. Browser → CDN — HTTPS request */}
              <line x1={166} y1={197} x2={208} y2={197}
                stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arr-blue)" />

              {/* 2. CDN → Next.js — cache miss / SSR */}
              <line x1={360} y1={197} x2={412} y2={197}
                stroke="#9333ea" strokeWidth={2} markerEnd="url(#arr-purple)" />

              {/* 3. Next.js → Graph — GraphQL query */}
              <path d="M 564,185 C 596,185 616,132 616,127"
                fill="none" stroke="#f97316" strokeWidth={2} markerEnd="url(#arr-orange)" />

              {/* 4. Graph → Next.js — content response (dashed) */}
              <path d="M 616,142 C 610,165 596,207 564,207"
                fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-orange)" />

              {/* 5. Next.js → FX SDK — datafile fetch from cdn.optimizely.com */}
              <path d="M 564,209 C 596,209 616,285 616,290"
                fill="none" stroke="#0d9488" strokeWidth={2} markerEnd="url(#arr-teal)" />

              {/* 6. CMS → Graph — content sync on publish */}
              <line x1={836} y1={120} x2={768} y2={120}
                stroke="#16a34a" strokeWidth={2} markerEnd="url(#arr-green)" />

              {/* 7. Graph → Next.js — Graph webhook after content sync (dashed, routes right of FX SDK) */}
              <path d="M 768,140 L 800,140 L 800,400 L 488,400 L 488,234"
                fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-red)" />

              {/* ── Boxes (drawn on top of arrows) ── */}

              <Box x={14}  y={160} hc="#2563eb" bc="#eff6ff" stroke="#bfdbfe"
                title="Browser" sub={["visitor / editor"]} />

              <Box x={208} y={160} hc="#7c3aed" bc="#f5f3ff" stroke="#ddd6fe"
                title="Vercel Edge / CDN" sub={["ISR cache"]} />

              <Box x={412} y={160} hc="#15803d" bc="#f0fdf4" stroke="#bbf7d0"
                title="Next.js Server" sub={["Middleware + RSC", "force-dynamic"]} />

              <Box x={616} y={90}  hc="#ea580c" bc="#fff7ed" stroke="#fed7aa"
                title="Optimizely Graph" sub={["cg.optimizely.com", "GraphQL delivery API"]} />

              <Box x={616} y={264} hc="#0d9488" bc="#f0fdfa" stroke="#99f6e4"
                title="FX SDK" sub={["cdn.optimizely.com", "JSON datafile"]} />

              <Box x={836} y={90}  hc="#dc2626" bc="#fef2f2" stroke="#fecaca"
                title="Optimizely CMS" sub={["authoring UI", "Visual Builder"]} />

              {/* ── Arrow labels (drawn last, always on top) ── */}
              <text x={289} y={143} textAnchor="middle" fill="#60a5fa" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">HTML response</text>
              <text x={187} y={190} textAnchor="middle" fill="#3b82f6" fontSize={9} fontFamily="system-ui,sans-serif">HTTPS</text>
              <text x={386} y={190} textAnchor="middle" fill="#9333ea" fontSize={9} fontFamily="system-ui,sans-serif">SSR</text>
              <text x={594} y={147} textAnchor="end" fill="#f97316" fontSize={9} fontFamily="system-ui,sans-serif">GraphQL</text>
              <text x={590} y={218} textAnchor="middle" fill="#f97316" fontSize={9} fontFamily="system-ui,sans-serif" fontStyle="italic">content</text>
              <text x={590} y={256} textAnchor="middle" fill="#0d9488" fontSize={9} fontFamily="system-ui,sans-serif">datafile fetch</text>
              <text x={802} y={113} textAnchor="middle" fill="#16a34a" fontSize={9} fontFamily="system-ui,sans-serif">content sync</text>
              <text x={644} y={415} textAnchor="middle" fill="#ef4444" fontSize={9} fontFamily="system-ui,sans-serif">Graph webhook</text>

            </svg>
          </div>

          {/* ── Legend ── */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs text-on-surface-variant">
            {[
              { color: "#3b82f6", label: "HTTPS request",                           dashed: false },
              { color: "#60a5fa", label: "HTML response",                            dashed: true  },
              { color: "#9333ea", label: "Cache miss / SSR forward",                 dashed: false },
              { color: "#f97316", label: "GraphQL query · content response",         dashed: true  },
              { color: "#0d9488", label: "FX SDK datafile fetch",                    dashed: false },
              { color: "#16a34a", label: "CMS → Graph content sync on publish",      dashed: false },
              { color: "#ef4444", label: "Graph webhook → ISR cache invalidation",   dashed: true  },
            ].map(({ color, label, dashed }) => (
              <div key={label} className="flex items-center gap-2">
                <svg width={30} height={10} aria-hidden="true">
                  <line x1={0} y1={5} x2={22} y2={5}
                    stroke={color} strokeWidth={2}
                    strokeDasharray={dashed ? "4,2" : undefined} />
                  <path d="M 20 2 L 28 5 L 20 8 z" fill={color} />
                </svg>
                <span>{label}</span>
              </div>
            ))}
          </div>

        </section>
      </div>
    </div>
  );
}
