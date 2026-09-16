"use client";

import { usePathname } from "next/navigation";
import DemoTableOfContents from "./DemoTableOfContents";

/** The table-of-contents rail beside every /demo page except the /demo hub. */
export default function DemoSidebar() {
  if (usePathname() === "/demo") return null;
  return (
    <aside className="hidden xl:block w-60 shrink-0">
      <div className="sticky top-24 pl-8 pr-5 pt-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <DemoTableOfContents />
      </div>
    </aside>
  );
}
