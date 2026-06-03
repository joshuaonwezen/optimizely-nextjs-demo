import { readdirSync } from "fs";
import { join } from "path";

function slugToLabel(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function getDemoLinks(): { href: string; label: string }[] {
  const overrides: Record<string, string> = { personalization: "Personalization & Audiences" };
  try {
    const demoDir = join(process.cwd(), "src/app/demo");
    return readdirSync(demoDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ href: `/demo/${d.name}`, label: overrides[d.name] ?? slugToLabel(d.name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}
