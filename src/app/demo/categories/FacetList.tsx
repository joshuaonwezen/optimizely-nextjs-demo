"use client";

import { useLayoutEffect, useRef } from "react";

// The first filter click swaps the static page for its filtered/ twin (see
// page.tsx), which remounts this list at scrollTop 0 and scrolls the row just
// clicked out of view. The offset lives at module level so it outlives that remount.
let savedScrollTop = 0;

export default function FacetList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = savedScrollTop;
  }, []);

  return (
    <ul
      data-component="FacetList"
      ref={ref}
      className={className}
      onScroll={(e) => {
        savedScrollTop = e.currentTarget.scrollTop;
      }}
    >
      {children}
    </ul>
  );
}
