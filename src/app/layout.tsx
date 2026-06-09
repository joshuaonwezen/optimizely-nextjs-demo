import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import NavigationHeader from "@/components/layout/NavigationHeader";
import GlobalBanner from "@/components/layout/GlobalBanner";
import Footer from "@/components/layout/Footer";
import DemoToolbar from "@/components/demo/DemoToolbar";
import OdpSetup from "@/components/OdpSetup";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
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

const themeScript = `(function(){var t=localStorage.getItem('theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t||s);})();`;

// Inlined in <head> so the zaius queue exists synchronously during HTML
// parsing — before React hydration, before any useEffect fires.
const odpInitScript = [
  "var zaius=window['zaius']||(window['zaius']=[]);",
  "zaius.methods=['initialize','onload','customer','entity','event','subscribe','unsubscribe','consent','identify','anonymize','dispatch'];",
  "zaius.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);zaius.push(t);return zaius}};",
  "(function(){",
  "for(var i=0;i<zaius.methods.length;i++){var method=zaius.methods[i];zaius[method]=zaius.factory(method)}",
  `var e=document.createElement('script');e.type='text/javascript';e.async=true;e.src='https://d1igp3oop3iho5.cloudfront.net/v2/${process.env.NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID ?? ""}/zaius-min.js';`,
  "var t=document.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);",
  "})();",
].join("");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: odpInitScript }} />
      </head>
      <body
        className={`${plusJakarta.variable} ${inter.variable} min-h-screen bg-surface text-on-surface font-body antialiased overflow-x-clip`}
      >
        <GlobalBanner />
        <NavigationHeader />
        <main>{children}</main>
        <Footer />
        <DemoToolbar />
        <OdpSetup />
      </body>
    </html>
  );
}
