import Image from "next/image";
import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, FONT_STYLE,
  BG_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

export const AuthorBlockType = contentType({
  key: "AuthorBlock",
  displayName: "Author",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    name:        { type: "string",           displayName: "Name",        indexingType: "searchable", isLocalized: true },
    role:        { type: "string",           displayName: "Role",        isLocalized: true },
    bio:         { type: "richText",         displayName: "Bio",         indexingType: "searchable", isLocalized: true },
    avatar:      { type: "contentReference", displayName: "Avatar", allowedTypes: ["_image"], indexingType: "disabled" },
    linkedinUrl: { type: "url",              displayName: "LinkedIn URL" },
  },
});

export const AuthorInlineTemplate = displayTemplate({
  key: "AuthorInlineTemplate",
  isDefault: false,
  displayName: "Author byline",
  contentType: "AuthorBlock",
  tag: "Inline",
  settings: {
    showSocial: {
      editor: "checkbox" as const,
      displayName: "Show LinkedIn link",
      sortOrder: 0,
      choices: {},
    },
    ...BACKGROUND,
    ...FONT_STYLE,
  },
});

export const AuthorProfileTemplate = displayTemplate({
  key: "AuthorProfileTemplate",
  isDefault: false,
  displayName: "Profile card (photo and name, no bio)",
  contentType: "AuthorBlock",
  tag: "Profile",
  settings: {
    ...BACKGROUND,
    ...FONT_STYLE,
    showLinkedIn: {
      editor: "checkbox" as const,
      displayName: "Show LinkedIn link",
      sortOrder: 5,
      choices: {},
    },
  },
});

type ImageRef =
  | { url?: { default?: string | null } | null; _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

interface AuthorData {
  name?:        string | null;
  role?:        string | null;
  bio?:         { json: unknown } | string | null;
  avatar?:      ImageRef;
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
  const isProfile = props.displayTemplateKey === "AuthorProfileTemplate";

  const bioContent =
    data.bio && typeof data.bio === "object" && "json" in data.bio
      ? (data.bio.json as RichTextProps["content"] | null)
      : null;
  const bioHtml = typeof data.bio === "string" ? data.bio : null;
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];

  if (isInline) {
    const showSocial = ds?.showSocial === true;
    const bgKey = (ds?.background as string) || "transparent";
    const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.transparent;
    const wrapperBg = bg.wrapper ? `${bg.wrapper} rounded-xl px-4 py-2` : "";
    return (
      <div data-component="AuthorBlock" className={`flex items-center gap-3 ${wrapperBg}`}>
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
            <p {...pa("name")} className={`text-sm font-semibold ${bg.text || "text-on-surface"} leading-tight`}>
              {data.name}
            </p>
          )}
          {data.role && (
            <p {...pa("role")} className={`text-xs ${bg.textMuted || "text-on-surface-variant"}`}>
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

  if (isProfile) {
    const bgKey = (ds?.background as string) || "white";
    const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.white;
    const showLinkedIn = ds?.showLinkedIn === true;
    return (
      <div data-component="AuthorBlock" className={`rounded-2xl p-8 text-center ${bg.wrapper || "bg-surface-lowest border border-ghost-border"}`}>
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt={data.name ?? ""}
            width={80}
            height={80}
            className="rounded-full object-cover mx-auto mb-4"
          />
        )}
        {data.name && (
          <h3 {...pa("name")} className={`${fontClass} text-lg font-bold ${bg.text || "text-on-surface"}`}>
            {data.name}
          </h3>
        )}
        {data.role && (
          <p {...pa("role")} className={`text-sm mt-1 ${bg.textMuted || "text-on-surface-variant"}`}>
            {data.role}
          </p>
        )}
        {showLinkedIn && linkedinHref && (
          <Link
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold mt-3 hover:opacity-80"
          >
            LinkedIn
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>
    );
  }

  return (
    <article data-component="AuthorBlock" className="max-w-2xl mx-auto px-8 py-12 rounded-2xl bg-surface-lowest border border-ghost-border">
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
            <h3 {...pa("name")} className={`${fontClass} text-xl font-bold text-on-surface`}>
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
