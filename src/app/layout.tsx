import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Roboto_Mono } from "next/font/google";
import NavigationHeader from "@/components/layout/NavigationHeader";
import GlobalBanner from "@/components/layout/GlobalBanner";
import Footer from "@/components/layout/Footer";
import DemoToolbar from "@/components/demo/DemoToolbar";
import OdpSetup from "@/components/OdpSetup";
import OdpRecoveryBanner from "@/components/personalization/OdpRecoveryBanner";
import AutoTracker from "@/components/AutoTracker";
import StickyOfferBar from "@/components/layout/StickyOfferBar";
import RatesBar from "@/components/layout/RatesBar";
import TrustSection from "@/components/layout/TrustSection";
import "./globals.css";

// Each family is ONE localFont() call with a src array, so font-weight resolves
// to the real cut. Splitting these into a call per weight makes the browser
// synthesise bold/italic and the headlines come out smeared.
// Fallbacks are Optimizely's own documented web-experience stack.
const vcNudge = localFont({
  variable: "--font-display-local",
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
  src: [
    { path: "../fonts/NudgeSemiNormal-SemiNormalRegular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/NudgeSemiNormal-SemiNormalSemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/NudgeSemiNormal-SemiNormalExtraBold.woff2", weight: "800", style: "normal" },
  ],
});

const dieGrotesk = localFont({
  variable: "--font-body-local",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  src: [
    { path: "../fonts/DieGrotesk-B-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/DieGrotesk-B-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/DieGrotesk-B-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/DieGrotesk-B-MediumItalic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/DieGrotesk-B-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/DieGrotesk-B-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono-local",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Mosey Bank",
    default: "Mosey Bank",
  },
  description:
    "Personal, business, and mortgage banking — built around you.",
};

const themeScript = `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})();`;

// Inlined in <head> so the zaius queue exists synchronously during HTML
// parsing — before React hydration, before any useEffect fires.
const odpInitScript = [
  "var zaius=window['zaius']||(window['zaius']=[]);",
  "zaius.methods=['initialize','onload','customer','entity','event','subscribe','unsubscribe','consent','identify','anonymize','dispatch'];",
  "zaius.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);zaius.push(t);return zaius}};",
  "(function(){",
  "for(var i=0;i<zaius.methods.length;i++){var method=zaius.methods[i];zaius[method]=zaius.factory(method)}",
  "var e=document.createElement('script');e.type='text/javascript';e.async=true;e.src=('https:'===document.location.protocol?'https://':'http://')+'d1igp3oop3iho5.cloudfront.net/v2/dWs2ejwWekVGmZj9JoOIcA/zaius-min.js';",
  "var t=document.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);",
  "})();",
].join("");

const gtagInitScript = [
  "window.dataLayer = window.dataLayer || [];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('js', new Date());",
  "gtag('config', 'G-2MTP98PSWL');",
].join("");

const gtmInitScript =
  "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':" +
  "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0]," +
  "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=" +
  "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
  "})(window,document,'script','dataLayer','GTM-5SVM6NH');";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.optimizely.com/js/23338860169.js" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-2MTP98PSWL" />
        <script dangerouslySetInnerHTML={{ __html: gtagInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: gtmInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: odpInitScript }} />
      </head>
      <body
        className={`${vcNudge.variable} ${dieGrotesk.variable} ${robotoMono.variable} min-h-screen bg-surface text-on-surface font-body antialiased overflow-x-clip`}
      >
        {/* Portal target for the /preview editorial toolbar - kept first so the
            bar renders above the site nav at the very top of the page. */}
        <div id="preview-topbar-slot" />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5SVM6NH"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <OdpRecoveryBanner />
        <GlobalBanner />
        <NavigationHeader />
        <main>{children}</main>
        <RatesBar />
        <TrustSection />
        <Footer />
        <StickyOfferBar />
        <DemoToolbar />
        <OdpSetup />
        <AutoTracker />
      </body>
    </html>
  );
}
