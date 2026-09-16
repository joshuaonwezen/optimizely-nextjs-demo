/** A publish date as "10 June 2026", or null when the input is missing or unparseable. */
export function formatDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}
