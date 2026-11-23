import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";
import CodeBlock from "@/components/demo/CodeBlock";
import InlineCode from "@/components/demo/InlineCode";
import KeyPoints from "@/components/demo/KeyPoints";
import LiveDemoShell from "@/components/demo/LiveDemoShell";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";
import {
  cspHeaders,
  cspMode,
  resolvedCspSources,
  SECURITY_HEADERS,
  STRICT_CSP_DEMO_PATH,
} from "@/lib/security/csp";
import SecurityCheck from "./SecurityCheck";

export const metadata: Metadata = {
  title: "Security & Trust",
};

const readSource = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const cspTs = readSource("src/lib/security/csp.ts");
const headScriptsTs = readSource("src/lib/headScripts.ts");
const cspReportTs = readSource("src/app/api/csp-report/route.ts");
const verifySecretTs = readSource("src/lib/security/verifySecret.ts");
const shareLinkTs = readSource("src/lib/preview/shareLink.ts");

const NEXT_CSP_GUIDE = "https://nextjs.org/docs/app/guides/content-security-policy";
const OPTIMIZELY_WX_CSP =
  "https://docs.optimizely.com/web-experimentation/docs/update-your-site-s-content-security-policies-csp";
const TRUST_CENTER = "https://www.optimizely.com/trust-center/compliance";

const RESPONSIBILITIES = [
  {
    layer: "CMS, Graph, FX, WX and ODP platforms",
    owner: "Optimizely",
    covers: "Hosting, encryption in transit, platform access control, audits and certifications.",
  },
  {
    layer: "Optimizely accounts and keys",
    owner: "You",
    covers: "SSO and 2FA, least-privilege roles, which keys exist and where they live, who may edit WX Project JavaScript.",
  },
  {
    layer: "The front end (this app)",
    owner: "You",
    covers: "Response headers, what runs in the browser, which secrets stay on the server, what gets cached.",
  },
  {
    layer: "Hosting and edge",
    owner: "Vercel",
    covers: "TLS certificates, HSTS, DDoS protection. The firewall rules are yours to set.",
  },
];

const PUBLIC_VARS = [
  { name: "NEXT_PUBLIC_OPTIMIZELY_CMS_URL", why: "The CMS origin. It is in the frame-ancestors header anyway." },
  { name: "NEXT_PUBLIC_SITE_URL", why: "This site's own origin." },
  { name: "NEXT_PUBLIC_OPTIMIZELY_FX_SDK_KEY", why: "Names the FX datafile, which is public by design." },
  { name: "NEXT_PUBLIC_OPTIMIZELY_WEB_SNIPPET_ID", why: "Part of the WX snippet URL every visitor loads." },
  { name: "NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID", why: "The public ODP tracker id the web SDK sends." },
];

const SECRET_VARS = [
  { name: "OPTIMIZELY_APP_KEY / _SECRET", why: "Graph super-user: reads every draft, with no expiry." },
  { name: "OPTIMIZELY_CMS_CLIENT_ID / _SECRET", why: "Management API: writes and publishes content." },
  { name: "OPTIMIZELY_ODP_API_KEY", why: "The private ODP key: reads profiles, writes events." },
  { name: "OPTIMIZELY_PREVIEW_SECRET", why: "Signs share-preview links. Whoever has it can mint one for any draft." },
  { name: "OPTIMIZELY_REVALIDATE_SECRET", why: "Lets a caller purge the site's cache." },
];

const SERVER_ONLY_SNIPPET = `// src/lib/optimizely/odp.ts - the first line of every module that reads a secret
import "server-only";

export const ODP_API_KEY = process.env.OPTIMIZELY_ODP_API_KEY ?? "";

// If any "use client" file ever imports this module, even indirectly, \`next build\`
// fails with an error naming the import chain. Without it, the import would quietly
// ship the module into a browser bundle; the key would arrive empty there (only
// NEXT_PUBLIC_ vars are inlined), but the next refactor could change that.`;

const ADMIN_CLIENT_SNIPPET = `// src/lib/optimizely/adminPreviewClient.ts - drafts for /preview/share
function basicAuthHeader(): string {
  const appKey = process.env.OPTIMIZELY_APP_KEY ?? "";
  const appSecret = process.env.OPTIMIZELY_APP_SECRET ?? "";
  return \`Basic \${Buffer.from(\`\${appKey}:\${appSecret}\`).toString("base64")}\`;
}
// Only server components call this. The share link a visitor opens carries no
// credential at all: just key, locale and an HMAC signature (see the next section).`;

const SHARE_LINK_SNIPPET = `// src/lib/preview/shareLink.ts
function canonical(t: ExternalPreviewTarget): string {
  return \`\${t.key}\\n\${t.ver ?? ""}\\n\${t.loc}\`;
}

function sign(t: ExternalPreviewTarget, s: string): string {
  return createHmac("sha256", s).update(canonical(t)).digest("base64url");
}

// verifyExternalPreview(): no secret configured means no link ever verifies.
const s = secret();
if (!s) return null;
const expected = sign({ key, loc, ver }, s);
const a = Buffer.from(expected);
const b = Buffer.from(sig);
// Length check first: timingSafeEqual throws on buffers of different lengths.
if (a.length !== b.length || !timingSafeEqual(a, b)) return null;`;

const WEBHOOK_SNIPPET = `// src/app/api/webhooks/route.ts
// Graph's webhook registration sets only a URL, never a custom header, so the
// shared secret rides in ?secret=. Treat it like a password in a URL: it lands in
// access logs, so rotate it if those logs are shared.
const secret =
  request.nextUrl.searchParams.get("secret") ??
  request.headers.get("x-revalidate-secret");
if (!isValidRevalidateSecret(secret)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// src/lib/security/verifySecret.ts
export function isValidRevalidateSecret(provided: string | null | undefined): boolean {
  const expected = process.env.OPTIMIZELY_REVALIDATE_SECRET;
  if (!expected || !provided) return false;                 // fail closed
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected)); // equal lengths, no timing leak
}`;

const NEXT_CONFIG_SNIPPET = `// next.config.ts
poweredByHeader: false,

async headers() {
  return [
    // nosniff, Referrer-Policy, Permissions-Policy
    { source: "/:path*", headers: SECURITY_HEADERS },
    // The CSP, on every path except the strict demo (it gets a nonce policy instead)
    { source: \`/:path((?!\${STRICT_CSP_DEMO_PATH.slice(1)}$).*)\`, headers: cspHeaders() },
    // Share links get passed around: keep drafts out of search engines
    { source: "/preview/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
  ];
}`;

const MIDDLEWARE_SNIPPET = `// src/middleware.ts - only on ${STRICT_CSP_DEMO_PATH}
if (pathname === STRICT_CSP_DEMO_PATH) {
  const nonce = btoa(crypto.randomUUID());
  const csp = await buildStrictCsp(nonce);       // nonce + hashes of the layout's head scripts
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);   // Next reads the nonce from HERE
  const strict = NextResponse.next({ request: { headers } });
  strict.headers.set("Content-Security-Policy", csp);
  appendVisitorCookie(strict.headers, userId, host);
  return strict;
}`;

const ROLLOUT_SNIPPET = `# Vercel project > Settings > Environment Variables, then redeploy
# (headers are baked in at build time).
CSP_MODE=report-only   # default: violations are logged, nothing is blocked
CSP_MODE=enforce       # the same policy, blocking

# Vercel > Logs, filter on:
[csp]
# [csp] report connect-src blocked=https://example.net/collect page=https://…/savings source=…/gtm.js:2`;

const pretty = (policy: string) => policy.split("; ").join(";\n");

const thClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
const linkClass = "text-brand underline underline-offset-2";

export default function SecurityDemoPage() {
  const mode = cspMode();
  const sources = resolvedCspSources();
  const headers = cspHeaders(mode);

  return (
    <>
      <DemoHero
        title="Security & Trust"
        description="How this headless Optimizely site keeps secrets on the server, keeps drafts private, and limits what any script on the page can do, with the real headers it sends and a live check you can run."
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">
        <section id="third-party-scripts">
          <DemoSectionHeading id="third-party-scripts">Third-party scripts are your code</DemoSectionHeading>
          <div className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-4">
            <p>
              Every page on this site loads an experimentation snippet, a tag manager, an analytics library and a
              data-platform SDK. Each runs with exactly the same power as the site&apos;s own code: it can read the
              page, change it, read any cookie not marked HttpOnly, and send what it finds anywhere. Their code is
              written and served by someone else, and it can change without a deploy here. If a vendor&apos;s script,
              CDN or account is ever compromised, this site serves the result.
            </p>
            <p>
              A Content-Security-Policy is the control a front end has over that. It cannot inspect what an allowed
              script does, but it decides which hosts scripts may load from, and where the page may send data. A
              script that goes bad cannot pull in more code from an unknown host, and it cannot hand off what it
              reads to one.
            </p>
          </div>
          <Callout variant="warning" label="What a CSP can and cannot do" className="mt-6 max-w-3xl">
            This site&apos;s policy names every host exactly, with no{" "}
            <InlineCode>&apos;strict-dynamic&apos;</InlineCode> and no <InlineCode>&apos;unsafe-eval&apos;</InlineCode>,
            so a second-stage script from an unknown host would not load, and data could not be sent to one.
            It cannot vet code that an allowed host serves: that code still runs and can still change the page. A CSP
            limits how far a compromise reaches; it does not prevent one. The only cookies this site sets are
            pseudonymous ids. There are no logins, so there is no session for a cookie stealer to take.
          </Callout>
        </section>

        <section id="who-secures-what">
          <DemoSectionHeading id="who-secures-what">Who secures what</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            With a headless SaaS CMS, Optimizely runs the platform, but the page a visitor sees is your
            application. Every security header, and every decision about what runs in the browser, belongs to
            the front end. Optimizely&apos;s{" "}
            <a href={TRUST_CENTER} className={linkClass}>Trust Center</a> lists its audits and certifications and
            the products they cover. Its reports are available on request.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-ghost-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className={thClass}>Layer</th>
                  <th className={thClass}>Secured by</th>
                  <th className={thClass}>Covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-border">
                {RESPONSIBILITIES.map((row) => (
                  <tr key={row.layer} className="bg-surface-lowest">
                    <td className="px-4 py-3 font-medium text-on-surface">{row.layer}</td>
                    <td className="px-4 py-3 text-on-surface">{row.owner}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.covers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="secrets">
          <DemoSectionHeading id="secrets">Keeping secrets on the server</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Next.js inlines every <InlineCode>NEXT_PUBLIC_</InlineCode> variable into the browser bundle, and
            nothing else. So the prefix is the whole rule: these five are identifiers that are public anyway,
            and every credential is unprefixed and read only in server code.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { heading: "Shipped to the browser", rows: PUBLIC_VARS },
              { heading: "Server only", rows: SECRET_VARS },
            ].map(({ heading, rows }) => (
              <div key={heading} className="rounded-2xl border border-ghost-border overflow-hidden">
                <p className="bg-surface-low px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {heading}
                </p>
                <ul className="divide-y divide-ghost-border">
                  {rows.map((row) => (
                    <li key={row.name} className="px-4 py-3 bg-surface-lowest">
                      <p className="font-mono text-xs text-on-surface break-all">{row.name}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{row.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <CodeBlock code={SERVER_ONLY_SNIPPET} label='import "server-only" fails the build on a client import' />
            <CodeBlock code={ADMIN_CLIENT_SNIPPET} label="App Key + Secret are sent only from the server" />
          </div>
          <Callout variant="note" label="Where server-only cannot go" className="mt-6 max-w-3xl">
            <InlineCode>opti:push</InlineCode> bundles every file under <InlineCode>src/components</InlineCode> with
            esbuild to read the content types, and outside Next.js <InlineCode>server-only</InlineCode> does not
            resolve. Footer and NavigationItemBlock reach <InlineCode>adminPreviewClient.ts</InlineCode> through the
            preview nav tree, so that module goes without the guard, and so does <InlineCode>auth.ts</InlineCode>,
            which the seed scripts import. Both are still read only by server code.
          </Callout>
        </section>

        <section id="preview">
          <DemoSectionHeading id="preview">Preview and drafts</DemoSectionHeading>
          <ul className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-2 mb-6 list-disc pl-5">
            <li>
              The CMS preview token is a JWT that lasts about five minutes. It is read from the URL on{" "}
              <InlineCode>/preview</InlineCode>, used only server-side, and redacted from the page&apos;s diagnostics.
            </li>
            <li>
              Draft fetches never go through a cache. They run outside every <InlineCode>&quot;use cache&quot;</InlineCode>{" "}
              boundary, with Graph&apos;s CDN bypassed, so one editor&apos;s draft is never served to a visitor.
            </li>
            <li>
              A share link carries no credential: just the content key, locale, optional version and an
              HMAC-SHA256 signature. Editing the link to point at another draft breaks the signature. Links never
              expire, so rotating <InlineCode>OPTIMIZELY_PREVIEW_SECRET</InlineCode> revokes all of them at once.
            </li>
            <li>
              Every <InlineCode>/preview</InlineCode> response sends <InlineCode>X-Robots-Tag: noindex, nofollow</InlineCode>.{" "}
              <InlineCode>robots.txt</InlineCode> only asks crawlers not to visit; the header keeps a draft out of
              the index even when a link gets posted somewhere public.
            </li>
          </ul>
          <CodeBlock code={SHARE_LINK_SNIPPET} label="Signing and verifying a share link" />
        </section>

        <section id="webhooks">
          <DemoSectionHeading id="webhooks">Webhooks</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The publish webhook can purge the whole site&apos;s cache, so it is authenticated. All three
            endpoints (<InlineCode>/api/webhooks</InlineCode>, <InlineCode>/api/revalidate</InlineCode>,{" "}
            <InlineCode>/api/publish</InlineCode>) share one check. Both sides are hashed first, so the comparison
            is constant-time and reveals nothing about the secret&apos;s length, and the check fails closed when
            the env var is missing.
          </p>
          <CodeBlock code={WEBHOOK_SNIPPET} label="One secret check for every webhook" />
        </section>

        <section id="headers">
          <DemoSectionHeading id="headers">The headers this site sends</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Every source in the policy is in the table below, with the product that needs it. The table, the
            header and the strict route are all built from <InlineCode>CSP_SOURCES</InlineCode> in{" "}
            <InlineCode>src/lib/security/csp.ts</InlineCode>, so this page cannot drift from what the site sends.
            This deployment&apos;s CSP mode is <strong className="text-on-surface">{mode}</strong>.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className={thClass}>Directive</th>
                  <th className={thClass}>Source</th>
                  <th className={thClass}>For</th>
                  <th className={thClass}>Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-border">
                {sources.map((row) => (
                  <tr key={`${row.directive} ${row.source}`} className="bg-surface-lowest align-top">
                    <td className="px-4 py-2 font-mono text-xs text-on-surface whitespace-nowrap">{row.directive}</td>
                    <td className="px-4 py-2 font-mono text-xs text-on-surface-variant break-all">{row.source}</td>
                    <td className="px-4 py-2 text-xs text-on-surface whitespace-nowrap">{row.product}</td>
                    <td className="px-4 py-2 text-xs text-on-surface-variant">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 mb-8">
            {headers.map((header) => (
              <CodeBlock key={header.key} code={pretty(header.value)} label={header.key} language="text" />
            ))}
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-3">The other headers</h3>
          <ul className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-3 mb-6">
            {SECURITY_HEADERS.map((header) => (
              <li key={header.key}>
                <InlineCode>{`${header.key}: ${header.value}`}</InlineCode>
                <p className="mt-1">{header.why}</p>
              </li>
            ))}
            <li>
              <InlineCode>Strict-Transport-Security</InlineCode>
              <p className="mt-1">
                Vercel adds HSTS on its own, so the app does not repeat it (the live check below shows it).
                Browsers then refuse plain HTTP to this host, which takes connection downgrade attacks off the
                table. On another host, or a custom domain, check that it is there.
              </p>
            </li>
          </ul>
          <Callout variant="note" label="Left out on purpose" className="max-w-3xl">
            <strong>X-Frame-Options</strong> cannot name a specific outside origin, so it would block Visual
            Builder; <InlineCode>frame-ancestors</InlineCode> does the same job and can list the CMS.{" "}
            <strong>Cross-Origin-Opener-Policy</strong> would cut the <InlineCode>window.opener</InlineCode> link
            the CMS and the WX editor can rely on when they open the site in a new tab, and buys little on a site
            with no logins. <strong>Cross-Origin-Resource-Policy</strong> could stop the CMS UI from loading this
            site&apos;s assets. <InlineCode>x-powered-by</InlineCode> is switched off.
          </Callout>
          <div className="mt-8">
            <CodeBlock code={NEXT_CONFIG_SNIPPET} label="next.config.ts" />
          </div>
        </section>

        <section id="csp-tradeoffs">
          <DemoSectionHeading id="csp-tradeoffs">Why the policy looks like this</DemoSectionHeading>
          <div className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-4 mb-6">
            <p>
              The strongest CSP allows inline scripts only when they carry a nonce, a random value minted per
              response. Next.js supports that, but its{" "}
              <a href={NEXT_CSP_GUIDE} className={linkClass}>CSP guide</a> is plain about the cost: with nonces,
              &quot;all pages must be dynamically rendered&quot;, and static optimization and ISR are disabled.
              This site serves over a hundred cached pages, and the CDN answering them is also what absorbs the bot traffic
              hitting it. So the site-wide policy keeps <InlineCode>&apos;unsafe-inline&apos;</InlineCode> for scripts
              and puts its effort where it counts against a script that goes bad: exact hosts, no{" "}
              <InlineCode>&apos;strict-dynamic&apos;</InlineCode>, no <InlineCode>&apos;unsafe-eval&apos;</InlineCode>,
              and a <InlineCode>connect-src</InlineCode> that names every endpoint.
            </p>
            <p>
              The other options don&apos;t fit either. Hashes work only for scripts whose text never changes, and
              Next&apos;s inline data scripts change on every page. Subresource Integrity pins a file&apos;s exact
              bytes, but the WX snippet changes every time someone publishes an experiment. Dropping{" "}
              <InlineCode>&apos;unsafe-eval&apos;</InlineCode> is safe here because this project&apos;s WX variation
              code is compiled into the snippet as functions. WX evaluates strings only for custom JavaScript
              audiences and its preview mode, so check yours before copying this. Optimizely&apos;s own WX
              guidance is <a href={OPTIMIZELY_WX_CSP} className={linkClass}>here</a>.
            </p>
            <p>
              <Link href={STRICT_CSP_DEMO_PATH} className={linkClass}>The strict twin of this page</Link> runs the
              nonce version: same layout, same third parties, every inline script either nonced or hashed. It
              renders on every request, which is exactly the cost.
            </p>
          </div>
          <CodeBlock code={MIDDLEWARE_SNIPPET} label="A nonce policy for one route" />
        </section>

        <section id="rollout">
          <DemoSectionHeading id="rollout">Rolling it out without breaking the editors</DemoSectionHeading>
          <div className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-4 mb-6">
            <p>
              A wrong CSP fails silently: Visual Builder stops loading its overlay, a WX experiment stops applying,
              a GTM tag stops firing, and nothing errors on the server. So the policy ships as{" "}
              <InlineCode>Content-Security-Policy-Report-Only</InlineCode> first. The browser blocks nothing,
              reports every violation to <InlineCode>/api/csp-report</InlineCode>, and the route logs one{" "}
              <InlineCode>[csp]</InlineCode> line per report, with query strings cut so no preview token or signed
              link lands in the logs. Reports go through <InlineCode>report-uri</InlineCode> only: Chrome ignores it
              whenever the newer <InlineCode>report-to</InlineCode> is present, and in testing it never delivered a{" "}
              <InlineCode>report-to</InlineCode> report.
            </p>
            <p>
              One directive cannot wait: browsers ignore <InlineCode>frame-ancestors</InlineCode> in a report-only
              policy. Clickjacking protection would silently disappear, so it stays in an enforced header
              alongside <InlineCode>object-src</InlineCode> and <InlineCode>base-uri</InlineCode>.
            </p>
            <p>
              Leave report-only on long enough to cover every flow: Visual Builder and on-page editing, a WX
              experiment, a form submit, search, a GTM tag change. Add any missing origin to{" "}
              <InlineCode>CSP_SOURCES</InlineCode>, then flip <InlineCode>CSP_MODE</InlineCode> one Vercel project at
              a time.
            </p>
          </div>
          <CodeBlock code={ROLLOUT_SNIPPET} label="Switching to enforce" language="bash" />
        </section>

        <section id="live-check">
          <DemoSectionHeading id="live-check">Live check</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
            Run the same three attacks here and on the{" "}
            <Link href={STRICT_CSP_DEMO_PATH} className={linkClass}>strict twin</Link>. Here the inline script runs,
            because the allowlist keeps <InlineCode>&apos;unsafe-inline&apos;</InlineCode>. While the site is in
            report-only mode, the other two also run, but they show up as reports. On the strict twin all three are
            blocked.
          </p>
          <LiveDemoShell label="This page's policy, tested in your browser">
            <SecurityCheck />
          </LiveDemoShell>
        </section>

        <section id="checklist">
          <DemoSectionHeading id="checklist">Before going live</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            This is a demo, so some of these are deliberately left undone here. A production site would also:
          </p>
          <ul className="text-sm text-on-surface-variant max-w-3xl leading-relaxed space-y-2 list-disc pl-5">
            <li>Sanitize editor-authored HTML (raw HTML blocks, rich-text HTML) before rendering it.</li>
            <li>Validate, size-limit and rate-limit public endpoints such as form submissions.</li>
            <li>Require SSO or 2FA on every Optimizely account, with the fewest people able to edit WX Project JavaScript or publish GTM containers.</li>
            <li>Review third-party script changes like code changes: WX Project JavaScript, GTM tags, new vendors.</li>
            <li>Rotate every secret on a schedule, and immediately when someone with access leaves.</li>
            <li>
              Publish a <a href="/.well-known/security.txt" className={linkClass}>/.well-known/security.txt</a> so a
              researcher who finds a problem knows where to report it.
            </li>
          </ul>
        </section>

        <KeyPoints
          points={[
            <><strong className="text-on-surface">The front end owns its headers.</strong> On a headless SaaS CMS, Optimizely secures the platform; the CSP, the secrets and what runs in the browser are the app&apos;s job.</>,
            <><strong className="text-on-surface">Name hosts exactly, and skip &apos;strict-dynamic&apos; and &apos;unsafe-eval&apos;.</strong> Those three choices decide whether a compromised third-party script can load more code.</>,
            <><strong className="text-on-surface">connect-src is the exfiltration control.</strong> Even a script that runs cannot send data to a host the policy does not name.</>,
            <><strong className="text-on-surface">A nonce CSP costs static rendering.</strong> Use it where a page is dynamic anyway; an allowlist keeps the CDN caching everything else.</>,
            <><strong className="text-on-surface">Ship report-only first, but keep frame-ancestors enforced.</strong> Browsers ignore it in a report-only policy.</>,
            <><strong className="text-on-surface">NEXT_PUBLIC_ is the only door to the browser.</strong> Keep credentials unprefixed, and guard their modules with <InlineCode>server-only</InlineCode> wherever the CLI&apos;s bundler allows.</>,
          ]}
        />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "csp.ts", path: "src/lib/security/csp.ts", content: cspTs },
            { label: "headScripts.ts", path: "src/lib/headScripts.ts", content: headScriptsTs },
            { label: "csp-report/route.ts", path: "src/app/api/csp-report/route.ts", content: cspReportTs },
            { label: "verifySecret.ts", path: "src/lib/security/verifySecret.ts", content: verifySecretTs },
            { label: "shareLink.ts", path: "src/lib/preview/shareLink.ts", content: shareLinkTs },
          ]}
        />
      </div>
    </>
  );
}
