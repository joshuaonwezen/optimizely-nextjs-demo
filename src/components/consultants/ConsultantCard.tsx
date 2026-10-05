import Image from "next/image";
import type { ConsultantListItem } from "@/lib/graphql/queries/GetConsultants";
import { resolveImageUrl } from "@/components/blocks/_shared/contentRefs";

// Shared by ConsultantListBlock. Mirrors the photo/initial-avatar fallback in
// src/components/pages/ConsultantPage.tsx so a card and its linked page agree visually.
export default function ConsultantCard({ item }: { item: ConsultantListItem }) {
  const url = item._metadata?.url?.default ?? "#";
  const photoUrl = resolveImageUrl(item.photo ?? undefined);

  return (
    <a
      data-component="ConsultantCard"
      href={url}
      className="block bg-surface-lowest border border-ghost-border rounded-2xl p-5 hover:border-brand/40 transition-colors"
    >
      <div className="flex items-center gap-4 mb-3">
        {photoUrl ? (
          <div className="shrink-0 relative w-12 h-12 rounded-xl overflow-hidden">
            <Image src={photoUrl} alt={item.name ?? ""} fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="shrink-0 w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-display font-bold text-lg">
            {item.name?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-on-surface leading-snug truncate">
            {item.name ?? "Untitled"}
          </p>
          {item.jobTitle && (
            <p className="text-xs text-on-surface-variant truncate">{item.jobTitle}</p>
          )}
        </div>
      </div>
      {item.summary && (
        <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">{item.summary}</p>
      )}
    </a>
  );
}
