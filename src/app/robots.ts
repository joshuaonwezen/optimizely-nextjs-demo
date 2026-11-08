import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

// AI training, AI search and AI assistant crawlers. Google-Extended and
// Applebot-Extended aren't crawlers but opt-out tokens: Googlebot/Applebot keep
// indexing for regular search, they just can't feed the content to AI models.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "claude-web",
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "Bytespider",
  "TikTokSpider",
  "CCBot",
  "Amazonbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "MistralAI-User",
  "DuckAssistBot",
  "YouBot",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "Diffbot",
  "PanguBot",
  "PetalBot",
  "Timpibot",
  "ImagesiftBot",
  "omgili",
  "omgilibot",
  "Webzio-Extended",
  "Kangaroo Bot",
  "iaskspider/2.0",
  "img2dataset",
  "VelenPublicWebCrawler",
  "FriendlyCrawler",
  "Scrapy",
];

// SEO/backlink crawlers: high request volume, no value for a demo site.
const SEO_CRAWLERS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "barkrowler",
  "serpstatbot",
];

// The /demo pages are SDK documentation, not site content, and the faceted ones
// (categories, listing) are crawler traps: every facet link adds one more
// ?category= param, so each filtered page links to ~50 new URLs and the URL
// space never ends. One crawler there made millions of uncacheable requests.
// robots.txt matching is a prefix match, so this covers /demo and every query.
const DEMO_PATH = "/demo";

// Served at /robots.txt. Advisory only: well-behaved bots honour it, but scrapers
// that ignore it or spoof their user agent have to be blocked at the edge.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/preview", "/api/", DEMO_PATH] },
      { userAgent: [...AI_CRAWLERS, ...SEO_CRAWLERS], disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
