import Link from "next/link";
import { getNavigation } from "@/lib/graphql/queries/GetNavigation";
import { getDemoLinks } from "@/lib/getDemoLinks";
import NavItems from "./NavItems";

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
