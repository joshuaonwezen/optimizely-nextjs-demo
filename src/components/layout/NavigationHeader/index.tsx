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

  // Localized nav trees for non-English locales (seeded by
  // scripts/seed-localization.ts). Locales without CMS nav content fall back
  // to the English tree client-side, so this is safe before that seed runs.
  const localizedTrees: Record<string, typeof tree> = {};
  await Promise.all(
    locales
      .filter((l) => l.code !== "en")
      .map(async (l) => {
        const { tree: localizedTree, fromCms } = await getNavigation({ locale: l.code });
        if (fromCms) localizedTrees[l.code] = localizedTree;
      })
  );

  return (
    <header data-component="NavigationHeader" className="sticky top-0 z-50 backdrop-blur-[20px] bg-nav-glass">
      <nav data-track-event="mb_nav_click" data-track-tags={JSON.stringify({ source: "header" })} className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Mosey Bank home">
          <MoseyBankLogo />
        </Link>
        <NavItems
          tree={tree}
          localizedTrees={localizedTrees}
          demoCategories={demoCategories}
          locales={locales}
        />
      </nav>
    </header>
  );
}
