export default function MoseyBankLogo() {
  return (
    <span className="flex items-center gap-2.5" aria-label="Mosey Bank">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" fill="none">
        <rect width="30" height="30" rx="7" fill="#004be3" />
        <text
          x="15"
          y="22"
          fill="#f2f1ff"
          fontSize="18"
          fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          textAnchor="middle"
        >
          M
        </text>
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">
        <span className="text-brand">Mosey</span>
        <span className="text-on-surface"> Bank</span>
      </span>
    </span>
  );
}
