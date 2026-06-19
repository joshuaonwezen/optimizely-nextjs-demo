import Link from "next/link";
import { getNavigation } from "@/lib/graphql/queries/GetNavigation";
import { getDemoCategories } from "@/lib/getDemoLinks";
import { getSupportedLocales } from "@/lib/graphql/queries/GetSupportedLocales";
import { getOptimizelyUser } from "@/lib/optimizely/user";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import NavItems from "./NavItems";
import MoseyBankLogo from "@/components/MoseyBankLogo";

export default async function NavigationHeader() {
  const [{ tree }, locales, visitor, user] = await Promise.all([
    getNavigation(),
    getSupportedLocales(),
    getVisitorContext(),
    getOptimizelyUser(),
  ]);
  const demoCategories = getDemoCategories();

  const isLoggedIn = !!visitor.attributes.logged_in;

  const searchStyleDecision = user.decide("nav_search_style");
  const searchExpanded = searchStyleDecision.enabled &&
    (searchStyleDecision.variables.style as string) === "expanded";

  const mobileNavDecision = user.decide("mobile_nav");
  const showBottomTabs = mobileNavDecision.enabled &&
    mobileNavDecision.variationKey === "bottom_tabs";

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
          isLoggedIn={isLoggedIn}
          searchExpanded={searchExpanded}
          showBottomTabs={showBottomTabs}
        />
      </nav>
    </header>
  );
}
