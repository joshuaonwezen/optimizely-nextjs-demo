import Image from "next/image";
import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import CmsRichText, { hasRichText } from "@/components/cms/CmsRichText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, isChecked, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { resolveImageUrl, resolveUrl, type ImageRef } from "../_shared/contentRefs";
import { asSdkContent } from "@/components/cms/sdkTypes";

export const AuthorBlockType = contentType({
  key: "AuthorBlock",
  displayName: "Author",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    name:        { type: "string",           displayName: "Name",        indexingType: "searchable", isLocalized: true },
    role:        { type: "string",           displayName: "Role",        isLocalized: true },
    bio:         { type: "richText",         displayName: "Bio",         indexingType: "searchable", isLocalized: true },
    // indexingType omitted (NOT "disabled") so the SDK keeps `avatar` in the generated
    // fragment. "disabled" strips it from inline composition expansions and the avatar
    // never reaches the renderer. A contentReference only accepts "disabled" or omitted,
    // so omitting is the only way to include it. Breaking change: push with --force.
    avatar:      { type: "contentReference", displayName: "Avatar", allowedTypes: ["_image"] },
    linkedinUrl: { type: "url",              displayName: "LinkedIn URL" },
  },
});

export const AuthorBlockDefaultTemplate = displayTemplate({
  key: "AuthorBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "AuthorBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

const SHOW_SOCIAL = {
  showSocial: {
    editor: "checkbox" as const,
    displayName: "Show LinkedIn link",
    sortOrder: 10,
    choices: {},
  },
};

// A byline sits inline in running content, so it defaults to no background.
export const AuthorInlineTemplate = displayTemplate({
  key: "AuthorInlineTemplate",
  isDefault: false,
  displayName: "Author byline",
  contentType: "AuthorBlock",
  tag: "Inline",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
    ...SHOW_SOCIAL,
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
    ...TEXT_COLOR,
    ...FONT_STYLE,
    ...SHOW_SOCIAL,
  },
});

interface AuthorData {
  name?:        string | null;
  role?:        string | null;
  bio?:         { json: unknown } | string | null;
  avatar?:      ImageRef;
  linkedinUrl?: string | { default?: string | null } | null;
  __context?:   { edit?: boolean } | null;
}

type AuthorBlockProps = AuthorData & {
  content?: AuthorData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function AuthorBlock(props: AuthorBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const avatarUrl = resolveImageUrl(data.avatar);
  const linkedinHref = resolveUrl(data.linkedinUrl);

  const isInline = props.displayTemplateKey === "AuthorInlineTemplate";
  const isProfile = props.displayTemplateKey === "AuthorProfileTemplate";

  const fallback = resolveStyleClasses(ds, { background: "white" });

  if (isInline) {
    const showSocial = isChecked(ds, "showSocial");
    const bg = resolveStyleClasses(ds, { background: "transparent" });
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
            <p {...pa("name")} className={`${fallback.font} text-sm font-semibold ${bg.text} leading-tight`}>
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
    const bg = resolveStyleClasses(ds, { background: "white" });
    const showLinkedIn = isChecked(ds, "showSocial");
    return (
      <div data-component="AuthorBlock" className={`rounded-2xl p-8 text-center ${bg.wrapper || "border border-ghost-border"}`}>
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
          <h3 {...pa("name")} className={`${fallback.font} text-lg font-bold ${bg.text || "text-on-surface"}`}>
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
    <article
      data-component="AuthorBlock"
      className={`max-w-2xl mx-auto px-8 py-12 rounded-2xl ${fallback.wrapper || "border border-ghost-border"}`}
    >
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
            <h3 {...pa("name")} className={`${fallback.font} text-xl font-bold ${fallback.text}`}>
              {data.name}
            </h3>
          )}
          {data.role && (
            <p {...pa("role")} className={`text-sm mt-1 ${fallback.textMuted}`}>
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

      {hasRichText(data.bio) && (
        <div
          {...pa("bio")}
          className={`richtext ${fallback.invert ? "richtext-invert" : ""} mt-6 text-base ${fallback.textMuted}`}
        >
          <CmsRichText value={data.bio} />
        </div>
      )}
    </article>
  );
}
