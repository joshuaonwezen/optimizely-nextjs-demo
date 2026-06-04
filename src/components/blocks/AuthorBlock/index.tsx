import Image from "next/image";
import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
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

export const AuthorInlineTemplate = displayTemplate({
  key: "AuthorInlineTemplate",
  isDefault: false,
  displayName: "Compact one-line byline",
  contentType: "AuthorBlock",
  tag: "Inline",
  settings: {
    showSocial: {
      editor: "checkbox" as const,
      displayName: "Show LinkedIn link",
      sortOrder: 0,
      choices: {},
    },
  },
});

// Graph returns { url: { default } } for image contentReferences; inline
// composition snapshots return { _metadata: { url: { default } } }.
type ImageRef =
  | { url?: { default?: string | null } | null; _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

interface AuthorData {
  name?:        string | null;
  role?:        string | null;
  bio?:         { json: unknown } | string | null;
  avatar?:      ImageRef;
  // type: "url" returns { default } from Graph; raw strings from inline reads
  linkedinUrl?: string | { default?: string | null } | null;
  __context?:   { edit?: boolean } | null;
}

function resolveUrl(value: string | { default?: string | null } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.default ?? null;
}

function resolveImageUrl(ref: ImageRef | undefined): string | null {
  if (!ref) return null;
  return ref.url?.default ?? ref._metadata?.url?.default ?? null;
}

type AuthorBlockProps = AuthorData & {
  content?: AuthorData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function AuthorBlock(props: AuthorBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const avatarUrl = resolveImageUrl(data.avatar);
  const linkedinHref = resolveUrl(data.linkedinUrl);

  const isInline = props.displayTemplateKey === "AuthorInlineTemplate";

  const bioContent =
    data.bio && typeof data.bio === "object" && "json" in data.bio
      ? (data.bio.json as RichTextProps["content"] | null)
      : null;
  const bioHtml = typeof data.bio === "string" ? data.bio : null;

  if (isInline) {
    const showSocial = ds?.showSocial === true;
    return (
      <div className="flex items-center gap-3">
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt={data.name ?? ""}
            width={40}
            height={40}
            className="rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          {data.name && (
            <p {...pa("name")} className="text-sm font-semibold text-on-surface leading-tight">
              {data.name}
            </p>
          )}
          {data.role && (
            <p {...pa("role")} className="text-xs text-on-surface-variant">
              {data.role}
            </p>
          )}
          {showSocial && linkedinHref && (
            <Link
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-0.5 hover:opacity-80"
            >
              LinkedIn
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    );
  }

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
          {linkedinHref && (
            <Link
              href={linkedinHref}
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
