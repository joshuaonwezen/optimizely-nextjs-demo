import Link from "next/link";
import { readdirSync } from "fs";
import { join } from "path";
import { getNavigation } from "@/lib/graphql/queries/GetNavigation";
import NavItems from "./NavItems";

function slugToLabel(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getDemoLinks(): { href: string; label: string }[] {
  // Label overrides for slugs where the display name can't be derived from the folder name alone
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

export default async function NavigationHeader() {
  const { tree } = await getNavigation();
  const demoLinks = getDemoLinks();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-[20px] bg-nav-glass">
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight text-on-surface"
        >
          Mosey Bank
        </Link>
        <NavItems tree={tree} demoLinks={demoLinks} />
      </nav>
    </header>
  );
}
