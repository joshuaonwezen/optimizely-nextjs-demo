import Image from "next/image";
import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, FONT_STYLE,
  BG_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

export const TeamMemberBlockType = contentType({
  key: "TeamMemberBlock",
  displayName: "Team Member",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    name:        { type: "string",           displayName: "Name",      indexingType: "searchable", isLocalized: true },
    role:        { type: "string",           displayName: "Role",      isLocalized: true },
    photo:       { type: "contentReference", displayName: "Photo", allowedTypes: ["_image"], indexingType: "disabled" },
    bio:         { type: "string",           displayName: "Short bio", indexingType: "searchable", isLocalized: true },
    linkedinUrl: { type: "url",              displayName: "LinkedIn URL" },
  },
});

export const TeamMemberHorizontalTemplate = displayTemplate({
  key: "TeamMemberHorizontalTemplate",
  isDefault: false,
  displayName: "Horizontal card",
  contentType: "TeamMemberBlock",
  tag: "Horizontal",
  settings: {
    ...BACKGROUND,
    ...FONT_STYLE,
  },
});

type ImageRef =
  | { url?: { default?: string | null } | null; _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

interface TeamMemberData {
  name?:        string | null;
  role?:        string | null;
  photo?:       ImageRef;
  bio?:         string | null;
  linkedinUrl?: string | { default?: string | null } | null;
  __context?: { edit?: boolean } | null;
}

function resolveImageUrl(ref: ImageRef | undefined): string | null {
  if (!ref) return null;
  return ref.url?.default ?? ref._metadata?.url?.default ?? null;
}

type TeamMemberBlockProps = TeamMemberData & {
  content?: TeamMemberData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

function resolveUrl(value: string | { default?: string | null } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.default ?? null;
}

export default function TeamMemberBlock(props: TeamMemberBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const photoUrl = resolveImageUrl(data.photo);
  const linkedinHref = resolveUrl(data.linkedinUrl);

  const isHorizontal = props.displayTemplateKey === "TeamMemberHorizontalTemplate";
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];

  if (isHorizontal) {
    const bgKey = (ds?.background as string) || "white";
    const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.white;
    return (
      <div data-component="TeamMemberBlock" className={`flex items-center gap-5 p-5 rounded-2xl hover-ambient ${bg.wrapper || "bg-surface-lowest border border-ghost-border"}`}>
        <div className="relative w-16 h-16 rounded-full flex-shrink-0 overflow-hidden bg-surface-low">
          {photoUrl ? (
            <Image src={photoUrl} alt={data.name ?? ""} fill className="object-cover" sizes="64px" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${fontClass} text-xl font-bold text-on-surface-variant`}>
              {data.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {data.name && (
            <h3 {...pa("name")} className={`${fontClass} text-base font-bold ${bg.text || "text-on-surface"}`}>
              {data.name}
            </h3>
          )}
          {data.role && (
            <p {...pa("role")} className={`text-sm ${bg.textMuted || "text-on-surface-variant"}`}>
              {data.role}
            </p>
          )}
          {data.bio && (
            <p {...pa("bio")} className={`text-sm ${bg.textMuted || "text-on-surface-variant"} leading-relaxed mt-1 line-clamp-2`}>
              {data.bio}
            </p>
          )}
          {linkedinHref && (
            <Link href={linkedinHref} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-semibold text-brand mt-1 hover:opacity-80">
              LinkedIn →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-component="TeamMemberBlock" className="rounded-2xl bg-surface-lowest border border-ghost-border p-6 text-center hover-ambient transition-shadow">
      <div className="relative w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-surface-low">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={data.name ?? ""}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${fontClass} text-2xl font-bold text-on-surface-variant`}>
            {data.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
      </div>
      {data.name && (
        <h3 {...pa("name")} className={`${fontClass} text-lg font-bold text-on-surface`}>
          {data.name}
        </h3>
      )}
      {data.role && (
        <p {...pa("role")} className="text-sm text-on-surface-variant mb-3">
          {data.role}
        </p>
      )}
      {data.bio && (
        <p {...pa("bio")} className="text-sm text-on-surface-variant leading-relaxed">
          {data.bio}
        </p>
      )}
      {linkedinHref && (
        <Link
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-semibold text-brand mt-3 hover:opacity-80"
        >
          LinkedIn →
        </Link>
      )}
    </div>
  );
}
