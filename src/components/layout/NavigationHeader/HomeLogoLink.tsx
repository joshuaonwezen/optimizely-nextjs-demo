"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLocaleUrl, getCurrentLocale } from "@/lib/localeUrl";
import MoseyBankLogo from "@/components/MoseyBankLogo";

interface Props {
  className?: string;
  onClick?: () => void;
  /** Logo wordmark from SiteSettings; defaults to the hardcoded brand name. */
  logoText?: { primary: string; secondary: string };
}

export default function HomeLogoLink({ className, onClick, logoText }: Props) {
  const pathname = usePathname();
  // Logo always points at the current locale's homepage ("/" or "/nl"), not the current page.
  const href = buildLocaleUrl("/", getCurrentLocale(pathname));

  return (
    <Link href={href} aria-label={`${logoText?.primary ?? "Mosey"} ${logoText?.secondary ?? "Bank"} home`} className={className} onClick={onClick}>
      <MoseyBankLogo primary={logoText?.primary} secondary={logoText?.secondary} />
    </Link>
  );
}
