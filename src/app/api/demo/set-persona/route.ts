import { DEMO_PERSONA_COOKIE } from "@/lib/optimizely/cookieNames";
import { setDemoCookie, stringField } from "@/lib/demo/demoCookieRoute";

export async function POST(request: Request) {
  return setDemoCookie(request, DEMO_PERSONA_COOKIE, (body) => stringField(body, "persona"));
}
