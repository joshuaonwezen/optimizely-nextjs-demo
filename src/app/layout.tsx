import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import NavigationHeader from "@/components/layout/NavigationHeader";
import Footer from "@/components/layout/Footer";
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
    template: "%s | Optimizely Demo",
    default: "Optimizely Demo",
  },
  description:
    "Headless Optimizely SaaS CMS + Next.js reference architecture",
};

/**
 * communicationInjector.js is the bridge between the CMS editor and this frontend.
 * Without it, Visual Builder on-page editing events (click-to-edit, content save
 * notifications) never reach the page. The script listens for CMS iframe messages
 * and dispatches them as DOM events.
 */
const CMS_URL = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";
const INJECTOR_URL = `${CMS_URL}/util/javascript/communicationinjector.js`;

const shouldInjectScript =
  process.env.NEXT_PUBLIC_ENABLE_VISUAL_BUILDER === "true" && CMS_URL;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${inter.variable} min-h-screen bg-surface text-on-surface antialiased`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <NavigationHeader />
        <main>{children}</main>
        <Footer />

        {shouldInjectScript && (
          <Script src={INJECTOR_URL} strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
