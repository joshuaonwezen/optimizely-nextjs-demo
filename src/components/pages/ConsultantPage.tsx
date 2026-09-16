import Image from "next/image";
import CmsRichText, { hasRichText } from "@/components/cms/CmsRichText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import type { ImageRef } from "@/components/blocks/_shared/contentRefs";
import { resolveImageUrl } from "@/components/blocks/_shared/contentRefs";
import { asSdkContent } from "@/components/cms/sdkTypes";

interface ConsultantContent {
  _metadata?: { key?: string | null } | null;
  name?: string | null;
  jobTitle?: string | null;
  summary?: string | null;
  bio?: { json?: unknown; html?: string | null } | null;
  photo?: ImageRef | null;
  expertise?: string[] | null;
  email?: string | null;
}

export default function ConsultantPage({ content }: { content: ConsultantContent }) {
  const { pa, src } = getPreviewUtils(asSdkContent(content));

  const photoUrl = resolveImageUrl(content.photo, src);
  const expertise = (content.expertise ?? []).filter(Boolean);

  return (
    <article data-component="ConsultantPage" className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <header className="mb-12">
        <div className="flex items-start gap-6 mb-8">
          {photoUrl ? (
            <div {...pa("photo")} className="shrink-0 relative w-24 h-24 rounded-2xl overflow-hidden">
              <Image
                src={photoUrl}
                alt={content.name ?? ""}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ) : (
            <div className="shrink-0 w-24 h-24 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-display font-bold text-3xl">
              {content.name?.charAt(0) ?? "?"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {content.name && (
              <h1
                {...pa("name")}
                className="font-display text-3xl md:text-4xl font-extrabold text-on-surface leading-tight mb-1"
              >
                {content.name}
              </h1>
            )}
            {content.jobTitle && (
              <p {...pa("jobTitle")} className="text-base text-on-surface-variant mb-3">
                {content.jobTitle}
              </p>
            )}
            {expertise.length > 0 && (
              <div {...pa("expertise")} className="flex flex-wrap gap-1.5">
                {expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {content.summary && (
          <p {...pa("summary")} className="text-xl text-on-surface-variant leading-relaxed">
            {content.summary}
          </p>
        )}
      </header>

      {hasRichText(content.bio) && (
        <div {...pa("bio")} className="richtext text-on-surface-variant mb-12">
          <CmsRichText value={content.bio} />
        </div>
      )}

      {content.email && (
        <div className="pt-8 border-t border-ghost-border">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-1">Get in touch</p>
          <a
            {...pa("email")}
            href={`mailto:${content.email}`}
            className="text-brand hover:underline font-medium"
          >
            {content.email}
          </a>
        </div>
      )}
    </article>
  );
}
