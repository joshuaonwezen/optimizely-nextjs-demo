"use client";

export default function DemoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="m-8 rounded-xl border border-ghost-border bg-surface-low p-8 text-center">
      <p className="text-sm text-on-surface-variant mb-4">Something went wrong loading this demo page.</p>
      <button
        className="text-sm text-primary underline"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
