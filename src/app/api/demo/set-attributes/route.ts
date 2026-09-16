import { DEMO_PAGE_VIEWS_COOKIE } from "@/lib/optimizely/cookieNames";
import { setDemoCookie } from "@/lib/demo/demoCookieRoute";

export async function POST(request: Request) {
  return setDemoCookie(request, DEMO_PAGE_VIEWS_COOKIE, (body) =>
    typeof body.pageViews === "number" && Number.isFinite(body.pageViews) ? String(body.pageViews) : null
  );
}
