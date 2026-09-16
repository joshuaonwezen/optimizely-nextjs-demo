import { DEMO_BUCKETING_ID_COOKIE } from "@/lib/optimizely/cookieNames";
import { setDemoCookie, stringField } from "@/lib/demo/demoCookieRoute";

export async function POST(request: Request) {
  return setDemoCookie(request, DEMO_BUCKETING_ID_COOKIE, (body) => stringField(body, "bucketingId"));
}
