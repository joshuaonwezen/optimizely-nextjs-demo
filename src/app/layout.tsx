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
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    shortcut: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

// Inlined in <head> so the zaius queue exists synchronously during HTML
// parsing — before React hydration, before any useEffect fires.
const odpInitScript = [
  "var zaius=window['zaius']||(window['zaius']=[]);",
  "zaius.methods=['initialize','entity','event','identify','consent','dispatch'];",
  "zaius.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);zaius.push(t);return zaius;};};",
  "for(var i=0;i<zaius.methods.length;i++){zaius[zaius.methods[i]]=zaius.factory(zaius.methods[i]);}",
  "zaius.initialize=function(id){if(zaius.invoked)return;zaius.invoked=true;zaius.trackerId=id;var s=document.createElement('script');s.type='text/javascript';s.async=true;s.src='https://static.zaius.io/zaius.min.js';document.head.appendChild(s);};",
  `zaius.initialize(${JSON.stringify(process.env.NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID ?? "")});`,
].join("");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
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
