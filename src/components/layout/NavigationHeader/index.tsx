import Link from "next/link";
import { getNavigation } from "@/lib/graphql/queries/GetNavigation";
import { getDemoCategories } from "@/lib/getDemoLinks";
import { getSupportedLocales } from "@/lib/graphql/queries/GetSupportedLocales";
import NavItems from "./NavItems";
import MoseyBankLogo from "@/components/MoseyBankLogo";

// Nav tree + locales come from the CMS (ISR-cacheable). The nav_search_style and
// mobile_nav experiments, plus logged-in state, are resolved client-side in NavItems
// so this stays out of the cookie-reading server render path.
export default async function NavigationHeader() {
  const [{ tree }, locales] = await Promise.all([
    getNavigation(),
    getSupportedLocales(),
  ]);
  const demoCategories = getDemoCategories();

  return (
    <header data-component="NavigationHeader" className="sticky top-0 z-50 backdrop-blur-[20px] bg-nav-glass">
      <nav data-track-event="mb_nav_click" data-track-tags={JSON.stringify({ source: "header" })} className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Mosey Bank home">
          <MoseyBankLogo />
        </Link>
        <NavItems
          tree={tree}
          demoCategories={demoCategories}
          locales={locales}
        />
      </nav>
    </header>
  );
}
