import Image from "next/image";
import Link from "next/link";
import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const TeamMemberBlockType = contentType({
  key: "TeamMemberBlock",
  displayName: "Team Member",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    name:        { type: "string",           displayName: "Name", indexingType: "searchable" },
    role:        { type: "string",           displayName: "Role" },
    photo:       { type: "contentReference", displayName: "Photo", allowedTypes: ["_image"], indexingType: "disabled" },
    bio:         { type: "string",           displayName: "Short bio" },
    linkedinUrl: { type: "url",              displayName: "LinkedIn URL" },
  },
});

// Graph contentReference comes back as { url: { default } }; inline
// composition snapshots come back as { _metadata: { url: { default } } }.
type ImageRef =
  | { url?: { default?: string | null } | null; _metadata?: { url?: { default?: string | null } | null } | null }
  | null;

interface TeamMemberData {
  name?:        string | null;
  role?:        string | null;
  photo?:       ImageRef;
  bio?:         string | null;
  // type: "url" comes back as { default } from Graph; some seed payloads
  // and inline composition reads may pass it as a raw string.
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
};

function resolveUrl(value: string | { default?: string | null } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.default ?? null;
}

export default function TeamMemberBlock(props: TeamMemberBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const photoUrl = resolveImageUrl(data.photo);
  const linkedinHref = resolveUrl(data.linkedinUrl);

  return (
    <div className="rounded-2xl bg-surface-lowest border border-ghost-border p-6 text-center hover-ambient transition-shadow">
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
          <div className="w-full h-full flex items-center justify-center font-display text-2xl font-bold text-on-surface-variant">
            {data.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
      </div>
      {data.name && (
        <h3 {...pa("name")} className="font-display text-lg font-bold text-on-surface">
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
