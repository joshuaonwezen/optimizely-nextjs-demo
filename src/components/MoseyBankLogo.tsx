export default function MoseyBankLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 60"
      width="200"
      height="50"
      aria-label="Mosey Bank"
      role="img"
      className={className}
    >
      <defs>
        {/* Metallic blue gradient: highlight → brand blue → deep navy → mid blue */}
        <linearGradient id="mb-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#d0e0ff" />
          <stop offset="28%"  stopColor="#4a72ff" />
          <stop offset="62%"  stopColor="#0035b8" />
          <stop offset="100%" stopColor="#819bff" />
        </linearGradient>

        <filter id="mb-drop" x="-6%" y="-6%" width="124%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000e40" floodOpacity="0.45" />
        </filter>

        {/* Two arcs offset by (2, 3) to produce a lifted 3-D look */}
        <path id="mb-arc-bg"   d="M 7,55 Q 122,21 237,55" />
        <path id="mb-arc-main" d="M 5,52 Q 120,18 235,52" />
      </defs>

      {/* Dark underlay — gives the raised / 3-D WordArt depth */}
      <text
        fill="#001a6e"
        fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="30"
        fontStyle="italic"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        <textPath href="#mb-arc-bg" startOffset="50%">Mosey Bank</textPath>
      </text>

      {/* Gradient foreground */}
      <text
        fill="url(#mb-fill)"
        filter="url(#mb-drop)"
        fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="30"
        fontStyle="italic"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        <textPath href="#mb-arc-main" startOffset="50%">Mosey Bank</textPath>
      </text>
    </svg>
  );
}
