import Image from "next/image";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface ImageRef {
  url?: { default?: string | null } | null;
  _metadata?: { url?: { default?: string | null } | null } | null;
}

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
  const { pa, src } = getPreviewUtils(content as any);

  const photoUrl = src(content.photo as any) ?? content.photo?.url?.default ?? content.photo?._metadata?.url?.default ?? null;
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

      {(content.bio?.json || content.bio?.html) && (
        <div {...pa("bio")} className="prose text-on-surface-variant leading-relaxed space-y-6 mb-12">
          {content.bio.json ? (
            <RichText content={content.bio.json as RichTextProps["content"]} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: content.bio.html! }} />
          )}
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
