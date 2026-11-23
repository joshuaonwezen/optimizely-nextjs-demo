import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-static";

const CONTACT = "https://github.com/joshuaonwezen/optimizely-nextjs-demo/security/advisories/new";
const VALID_FOR_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * /.well-known/security.txt (RFC 9116): where to report a vulnerability in this
 * site. Contact is the repository's private vulnerability reporting form, which
 * only works while that setting is on (GitHub > Settings > Security).
 *
 * Built once per deploy. RFC 9116 wants Expires less than a year out, so it is
 * the build date plus 180 days, and every deploy moves it forward; a site left
 * undeployed for six months advertises a stale file, which is the RFC's intent.
 * The middleware matcher skips .well-known/, so no __v_ rewrite reaches this.
 */
export function GET() {
  const site = getSiteUrl();
  const body = [
    `Contact: ${CONTACT}`,
    `Expires: ${new Date(Date.now() + VALID_FOR_MS).toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${site}/.well-known/security.txt`,
    `Policy: ${site}/demo/security`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
