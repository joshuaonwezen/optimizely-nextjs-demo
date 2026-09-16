import Link from "next/link";
import type { ComponentProps } from "react";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";

type Props = Omit<ComponentProps<typeof Link>, "href" | "target" | "rel"> & {
  node: Pick<NavNode, "href" | "label" | "openInNewTab">;
};

/** A CMS nav node as a link, honouring its "open in new tab" setting. */
export function NavLink({ node, children, ...props }: Props) {
  return (
    <Link
      href={node.href}
      target={node.openInNewTab ? "_blank" : undefined}
      rel={node.openInNewTab ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children ?? node.label}
    </Link>
  );
}
