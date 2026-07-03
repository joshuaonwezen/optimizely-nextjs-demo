"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLocaleUrl, getCurrentLocale } from "@/lib/localeUrl";
import MoseyBankLogo from "@/components/MoseyBankLogo";

interface Props {
  className?: string;
  onClick?: () => void;
}

export default function HomeLogoLink({ className, onClick }: Props) {
  const pathname = usePathname();
  const href = buildLocaleUrl(pathname, getCurrentLocale(pathname));

  return (
    <Link href={href} aria-label="Mosey Bank home" className={className} onClick={onClick}>
      <MoseyBankLogo />
    </Link>
  );
}
