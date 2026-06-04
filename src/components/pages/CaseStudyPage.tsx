import Image from "next/image";
import Link from "next/link";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { OUTCOME_ITEM_FRAGMENT } from "@/components/blocks/OutcomeItemBlock/fragment";
import { TESTIMONIAL_FRAGMENT } from "@/components/blocks/TestimonialBlock/fragment";

interface ImageRef {
  _metadata?: { url?: { default?: string | null } | null } | null;
}

interface OutcomeData {
  __typename?: string;
  stat?: string | null;
  suffix?: string | null;
  label?: string | null;
  _metadata?: { key?: string | null } | null;
}

interface TestimonialData {
  __typename?: string;
  quote?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorImage?: ImageRef | null;
  _metadata?: { key?: string | null } | null;
}

interface RelatedRef {
  _metadata?: {
    key?: string | null;
    displayName?: string | null;
    url?: { default?: string | null } | null;
  } | null;
  title?: string | null;
  summary?: string | null;
  clientName?: string | null;
}

interface CaseStudyContent {
  _metadata?: { key?: string | null; displayName?: string | null } | null;
  title?: string | null;
  clientName?: string | null;
  industry?: string | null;
  summary?: string | null;
  heroImage?: ImageRef | null;
  challenge?: { json?: unknown; html?: string | null } | null;
  solution?: { json?: unknown; html?: string | null } | null;
  outcomes?: Array<{ _metadata?: { key?: string | null } | null } | null> | null;
  testimonial?: { _metadata?: { key?: string | null } | null } | null;
  tags?: string[] | null;
  relatedCaseStudies?: RelatedRef[] | null;
}

const INDUSTRY_LABEL: Record<string, string> = {
  "personal-finance": "Personal Finance",
  "business-banking": "Business Banking",
  "investments": "Investments",
  "market-insights": "Market Insights",
};

const OUTCOMES_BY_KEYS_QUERY = /* GraphQL */ `
  query OutcomesByKeys($keys: [String!]) {
    OutcomeItemBlock(where: { _metadata: { key: { in: $keys } } }) {
      items { ...OutcomeItemBlockData }
    }
  }
  ${OUTCOME_ITEM_FRAGMENT}
`;

const TESTIMONIAL_BY_KEY_QUERY = /* GraphQL */ `
  query TestimonialByKey($key: String!) {
    TestimonialBlock(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
      items { ...TestimonialBlockData }
    }
  }
  ${TESTIMONIAL_FRAGMENT}
`;

async function loadOutcomes(keys: string[]): Promise<OutcomeData[]> {
  if (keys.length === 0) return [];
  const res = await graphqlFetch<{ OutcomeItemBlock?: { items?: OutcomeData[] } }>(
    OUTCOMES_BY_KEYS_QUERY,
    { keys },
    { next: { revalidate: 300 } }
  );
  const items = res.data?.OutcomeItemBlock?.items ?? [];
  // Preserve the original ordering by key
  const byKey = new Map(items.map((i) => [i._metadata?.key, i]));
  return keys.map((k) => byKey.get(k)).filter((i): i is OutcomeData => Boolean(i));
}

async function loadTestimonial(key: string | null | undefined): Promise<TestimonialData | null> {
  if (!key) return null;
  const res = await graphqlFetch<{ TestimonialBlock?: { items?: TestimonialData[] } }>(
    TESTIMONIAL_BY_KEY_QUERY,
    { key },
    { next: { revalidate: 300 } }
  );
  return res.data?.TestimonialBlock?.items?.[0] ?? null;
}

export default async function CaseStudyPage({ content }: { content: CaseStudyContent }) {
  const { pa } = getPreviewUtils(content as any);

  const heroUrl = content.heroImage?._metadata?.url?.default;
  const industryLabel = content.industry ? INDUSTRY_LABEL[content.industry] ?? content.industry : null;

  const outcomeKeys = (content.outcomes ?? [])
    .map((o) => o?._metadata?.key)
    .filter((k): k is string => Boolean(k));
  const outcomes = await loadOutcomes(outcomeKeys);

  const testimonial = await loadTestimonial(content.testimonial?._metadata?.key);
  const tags = (content.tags ?? []).filter(Boolean);
  const related = (content.relatedCaseStudies ?? []).filter((r) => r?._metadata?.url?.default);

  return (
    <article className="max-w-4xl mx-auto px-8 pt-16 pb-24">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-6">
          <span className="text-brand">Case Study</span>
          {industryLabel && (
            <>
              <span>·</span>
              <span>{industryLabel}</span>
            </>
          )}
          {content.clientName && (
            <>
              <span>·</span>
              <span {...pa("clientName")}>{content.clientName}</span>
            </>
          )}
        </div>

        {content.title && (
          <h1
            {...pa("title")}
            className="font-display text-4xl md:text-5xl font-extrabold text-on-surface leading-tight mb-6"
          >
            {content.title}
          </h1>
        )}

        {content.summary && (
          <p
            {...pa("summary")}
            className="text-xl text-on-surface-variant leading-relaxed"
          >
            {content.summary}
          </p>
        )}
      </header>

      {heroUrl && (
        <div {...pa("heroImage")} className="relative w-full aspect-[16/9] mb-12 rounded-2xl overflow-hidden">
          <Image src={heroUrl} alt={content.title ?? ""} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 896px" />
        </div>
      )}

      {outcomes.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 py-8 border-y border-ghost-border">
          {outcomes.map((o, i) => (
            <OptimizelyComponent key={i} content={o as any} />
          ))}
        </section>
      )}

      {content.challenge && (
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-4">The challenge</h2>
          <div {...pa("challenge")} className="prose text-on-surface-variant leading-relaxed space-y-6">
            {content.challenge.json ? (
              <RichText content={content.challenge.json as RichTextProps["content"]} />
            ) : content.challenge.html ? (
              <div dangerouslySetInnerHTML={{ __html: content.challenge.html }} />
            ) : null}
          </div>
        </section>
      )}

      {content.solution && (
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-4">Our solution</h2>
          <div {...pa("solution")} className="prose text-on-surface-variant leading-relaxed space-y-6">
            {content.solution.json ? (
              <RichText content={content.solution.json as RichTextProps["content"]} />
            ) : content.solution.html ? (
              <div dangerouslySetInnerHTML={{ __html: content.solution.html }} />
            ) : null}
          </div>
        </section>
      )}

      {testimonial && (
        <section className="my-12">
          <OptimizelyComponent content={testimonial as any} />
        </section>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-8 border-t border-ghost-border mb-12">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant mr-2 self-center">Tags</span>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/en/insights/?tag=${encodeURIComponent(tag)}`}
              className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-low text-on-surface hover:bg-surface-container transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-ghost-border">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-6">Related case studies</h2>
          <ul className="space-y-4">
            {related.map((cs, i) => {
              const url = cs._metadata?.url?.default ?? "#";
              const title = cs.title ?? cs._metadata?.displayName ?? "Untitled";
              return (
                <li key={i}>
                  <Link
                    href={url}
                    className="block rounded-2xl bg-surface-lowest border border-ghost-border p-6 hover-ambient transition-shadow"
                  >
                    <p className="font-display text-lg font-bold text-on-surface mb-1">{title}</p>
                    {cs.clientName && (
                      <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">{cs.clientName}</p>
                    )}
                    {cs.summary && (
                      <p className="text-sm text-on-surface-variant">{cs.summary}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
