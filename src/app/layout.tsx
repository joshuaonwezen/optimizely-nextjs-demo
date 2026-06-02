import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { cookies } from "next/headers";
import NavigationHeader from "@/components/layout/NavigationHeader";
import GlobalBanner from "@/components/layout/GlobalBanner";
import Footer from "@/components/layout/Footer";
import AudienceSwitcher from "@/components/demo/AudienceSwitcher";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialPersona = cookieStore.get("demo_persona")?.value ?? "";

  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${inter.variable} min-h-screen bg-surface text-on-surface font-body antialiased`}
      >
        <GlobalBanner />
        <NavigationHeader />
        <main>{children}</main>
        <Footer />
        <AudienceSwitcher initialPersona={initialPersona} />
      </body>
    </html>
  );
}
