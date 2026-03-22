export default function Footer() {
  return (
    <footer
      className="py-16"
      style={{ background: "var(--surface-container-low)" }}
    >
      <div className="max-w-7xl mx-auto px-8 text-center">
        <p
          className="text-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Powered by Optimizely SaaS CMS &amp; Next.js
        </p>
      </div>
    </footer>
  );
}
