import "server-only";
import { buildExternalPreviewQuery } from "@/lib/preview/shareLink";
import { getSiteUrl } from "@/lib/siteUrl";
import { categoryLabels } from "./categories";
import { getPageDocument, getPageVersions, type PageRef, type PageVersion } from "./pages";
import { changedFields, visibleText } from "./text";

// "Ready" is what a page gets when it is marked ready to publish where no
// approval sequence applies, so a reviewer can be asked about those too.
const AWAITING_REVIEW = ["InReview", "Ready"];
const MAX_TEXT = 12_000;

// A signed /preview/share link pinned to this exact version: the approver (or
// anyone they forward the report to) sees the submission without a CMS login.
function previewUrl({ facts }: PageVersion): string | null {
  const query = buildExternalPreviewQuery({ key: facts.contentKey, loc: facts.locale, ver: facts.version });
  return query ? `${getSiteUrl()}/preview/share${query}` : null;
}

// The version an editor submitted, and what it changes against the published
// page. Reads the exact version: a later edit gets a new version number.
export async function getReviewContext(ref: PageRef, version?: string) {
  const locale = ref.locale ?? "en";
  const versions = await getPageVersions(ref.contentKey, locale);
  const waiting = versions
    .filter((entry) => AWAITING_REVIEW.includes(entry.facts.status))
    .sort((a, b) => Number(b.facts.version) - Number(a.facts.version));
  const submitted = version ? versions.find((entry) => entry.facts.version === version) : waiting[0];

  if (!submitted) {
    return {
      error: version
        ? `Version ${version} of ${ref.contentKey} ('${locale}') was not found. It may have been published, declined or replaced.`
        : `No version of ${ref.contentKey} ('${locale}') is waiting for review.`,
      versions: versions.map((entry) => ({ version: entry.facts.version, status: entry.facts.status })),
    };
  }
  if (!submitted.isPage) {
    return { error: `'${submitted.facts.name}' (${submitted.facts.contentType}) is not a page.` };
  }

  const published = versions.find((entry) => entry.facts.status === "Published") ?? null;
  const isLive = published?.facts.version === submitted.facts.version;
  const [document, publishedDocument, labels] = await Promise.all([
    getPageDocument(submitted),
    published && !isLive ? getPageDocument(published) : null,
    categoryLabels(submitted.facts.categories),
  ]);

  const changes = publishedDocument ? changedFields(publishedDocument, document) : null;
  const text = visibleText(document);
  const { facts } = submitted;
  return {
    page: {
      contentKey: facts.contentKey,
      locale: facts.locale,
      name: facts.name,
      contentType: facts.contentType,
      url: facts.url,
    },
    submitted: {
      version: facts.version,
      status: facts.status,
      submittedBy: facts.lastModifiedBy,
      submittedAt: facts.lastModified,
    },
    published: published
      ? { version: published.facts.version, lastModified: published.facts.lastModified }
      : null,
    note: isLive
      ? "This version is already published."
      : published
        ? undefined
        : "This page has never been published, so the whole page is new.",
    metaTitle: facts.metaTitle,
    metaDescription: facts.metaDescription,
    categories: labels,
    changedFields: changes?.map((change) => change.field) ?? null,
    changes,
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}...` : text,
    previewUrl: previewUrl(submitted),
  };
}
