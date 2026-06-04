import Image from "next/image";
import Link from "next/link";
import { contentType } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const AuthorBlockType = contentType({
  key: "AuthorBlock",
  displayName: "Author",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    name:        { type: "string",           displayName: "Name",        indexingType: "searchable" },
    role:        { type: "string",           displayName: "Role" },
    bio:         { type: "richText",         displayName: "Bio" },
    avatar:      { type: "contentReference", displayName: "Avatar", allowedTypes: ["_image"], indexingType: "disabled" },
    linkedinUrl: { type: "url",              displayName: "LinkedIn URL" },
  },
});

interface AuthorData {
  name?:        string | null;
  role?:        string | null;
  bio?:         { json: unknown } | string | null;
  avatar?:      { _metadata?: { url?: { default?: string | null } | null } | null } | null;
  linkedinUrl?: string | null;
  __context?:   { edit?: boolean } | null;
}

type AuthorBlockProps = AuthorData & {
  content?: AuthorData;
  displaySettings?: Record<string, string | boolean>;
};

export default function AuthorBlock(props: AuthorBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const avatarUrl = data.avatar?._metadata?.url?.default;

  const bioContent =
    data.bio && typeof data.bio === "object" && "json" in data.bio
      ? (data.bio.json as RichTextProps["content"] | null)
      : null;
  const bioHtml = typeof data.bio === "string" ? data.bio : null;

  return (
    <article className="max-w-2xl mx-auto px-8 py-12 rounded-2xl bg-surface-lowest border border-ghost-border">
      <div className="flex items-start gap-5">
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt={data.name ?? ""}
            width={72}
            height={72}
            className="rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          {data.name && (
            <h3 {...pa("name")} className="font-display text-xl font-bold text-on-surface">
              {data.name}
            </h3>
          )}
          {data.role && (
            <p {...pa("role")} className="text-sm text-on-surface-variant mt-1">
              {data.role}
            </p>
          )}
          {data.linkedinUrl && (
            <Link
              href={data.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold mt-2 hover:opacity-80"
            >
              LinkedIn
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {(bioContent || bioHtml) && (
        <div
          {...pa("bio")}
          className="mt-6 text-base leading-relaxed text-on-surface-variant space-y-4"
        >
          {bioContent && <RichText content={bioContent} />}
          {bioHtml && <div dangerouslySetInnerHTML={{ __html: bioHtml }} />}
        </div>
      )}
    </article>
  );
}
