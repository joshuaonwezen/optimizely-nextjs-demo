import type { TaxonomyTerm } from "./_taxonomy";

// The Mosey Bank category tree: four levels deep
// (product > borrowing > mortgages > remortgaging), which matches Optimizely's
// "avoid hierarchies deeper than three or four levels" guidance.
//
// Grouping nodes are isAvailable (so they still index into Graph and can anchor
// a browse tree) but isSelectable: false, so an editor cannot tag a page with a
// bare "Product". Assigning one returns
// 400 "The taxonomy term '<key>' is not selectable."
//
// Keys are snake_case because the API rejects hyphens (^[A-Za-z][_0-9A-Za-z]+$),
// and must be globally unique - hence first_time_buyer_mortgage (a product)
// versus first_time_buyers (an audience).
//
// Terms are created parents-first: a child whose parent does not exist 400s. A
// term's parent can NEVER be changed afterwards, so reshaping this tree means
// `npm run seed:categories -- --fresh` (delete and recreate).

export interface TermDef extends TaxonomyTerm {
  key: string;
  displayName: string;
}

export const TAXONOMY_TREE: TermDef[] = [
  // Axis 1 - who the content is for
  { key: "audience", displayName: "Audience", description: "Who the content is written for.", sortOrder: 10, isAvailable: true, isSelectable: false },
  { key: "personal_finance", displayName: "Personal Finance", parent: "audience", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "first_time_buyers", displayName: "First-time Buyers", parent: "personal_finance", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "families", displayName: "Families", parent: "personal_finance", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "retirement_planners", displayName: "Retirement Planners", parent: "personal_finance", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "business_banking", displayName: "Business Banking", parent: "audience", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "startups", displayName: "Startups", parent: "business_banking", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "established_sme", displayName: "Established SMEs", parent: "business_banking", sortOrder: 20, isAvailable: true, isSelectable: true },

  // Axis 2 - which product the content concerns
  { key: "product", displayName: "Product", description: "The banking product the content concerns.", sortOrder: 20, isAvailable: true, isSelectable: false },

  { key: "everyday", displayName: "Everyday Banking", parent: "product", sortOrder: 10, isAvailable: true, isSelectable: false },
  { key: "current_accounts", displayName: "Current Accounts", parent: "everyday", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "instant_payments", displayName: "Instant Payments", parent: "current_accounts", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "mobile_banking", displayName: "Mobile Banking", parent: "current_accounts", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "foreign_exchange", displayName: "Foreign Exchange", parent: "everyday", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "travel_money", displayName: "Travel Money", parent: "foreign_exchange", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "international_payments", displayName: "International Payments", parent: "foreign_exchange", sortOrder: 20, isAvailable: true, isSelectable: true },

  { key: "borrowing", displayName: "Borrowing", parent: "product", sortOrder: 20, isAvailable: true, isSelectable: false },
  { key: "mortgages", displayName: "Mortgages", parent: "borrowing", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "first_time_buyer_mortgage", displayName: "First-time Buyer Mortgages", parent: "mortgages", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "remortgaging", displayName: "Remortgaging", parent: "mortgages", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "buy_to_let", displayName: "Buy to Let", parent: "mortgages", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "overpayments", displayName: "Overpayments", parent: "mortgages", sortOrder: 40, isAvailable: true, isSelectable: true },
  { key: "loans", displayName: "Loans and Overdrafts", parent: "borrowing", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "personal_loans", displayName: "Personal Loans", parent: "loans", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "overdrafts", displayName: "Overdrafts", parent: "loans", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "business_lending", displayName: "Business Lending", parent: "loans", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "credit_cards", displayName: "Credit Cards", parent: "borrowing", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "personal_credit_cards", displayName: "Personal Credit Cards", parent: "credit_cards", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "business_credit_cards", displayName: "Business Credit Cards", parent: "credit_cards", sortOrder: 20, isAvailable: true, isSelectable: true },

  { key: "saving_investing", displayName: "Saving and Investing", parent: "product", sortOrder: 30, isAvailable: true, isSelectable: false },
  { key: "savings", displayName: "Savings", parent: "saving_investing", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "easy_access", displayName: "Easy Access", parent: "savings", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "fixed_rate", displayName: "Fixed Rate", parent: "savings", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "isas", displayName: "ISAs", parent: "saving_investing", sortOrder: 20, isAvailable: true, isSelectable: true },
  // Deliberately left with no content: facets only return buckets that are in
  // use, so this shows the difference between the full taxonomy and what is
  // actually applied. See the /demo/categories page.
  { key: "cash_isa", displayName: "Cash ISA", parent: "isas", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "stocks_isa", displayName: "Stocks and Shares ISA", parent: "isas", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "junior_isa", displayName: "Junior ISA", parent: "isas", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "investments", displayName: "Investments", parent: "saving_investing", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "general_investment", displayName: "General Investment Account", parent: "investments", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "pensions", displayName: "Pensions", parent: "saving_investing", sortOrder: 40, isAvailable: true, isSelectable: true },

  { key: "business", displayName: "Business Products", parent: "product", sortOrder: 40, isAvailable: true, isSelectable: false },
  { key: "business_accounts", displayName: "Business Accounts", parent: "business", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "business_current_account", displayName: "Business Current Account", parent: "business_accounts", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "merchant_services", displayName: "Merchant Services", parent: "business_accounts", sortOrder: 20, isAvailable: true, isSelectable: true },

  // Axis 3 - what kind of content it is. Two levels is right for this axis:
  // the editorial angle does not subdivide the way products do.
  { key: "topic", displayName: "Topic", description: "The editorial angle of the content.", sortOrder: 30, isAvailable: true, isSelectable: false },
  { key: "market_insights", displayName: "Market Insights", parent: "topic", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "guides", displayName: "How-to Guides", parent: "topic", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "customer_stories", displayName: "Customer Stories", parent: "topic", sortOrder: 30, isAvailable: true, isSelectable: true },
  { key: "rates_and_fees", displayName: "Rates and Fees", parent: "topic", sortOrder: 40, isAvailable: true, isSelectable: true },
  { key: "support", displayName: "Help and Support", parent: "topic", sortOrder: 50, isAvailable: true, isSelectable: true },
  { key: "company", displayName: "About the Company", parent: "topic", sortOrder: 60, isAvailable: true, isSelectable: true },

  // Axis 4 - editorial workflow. Mark this branch Internal in the CMS UI
  // (Settings > Categories > Edit > Usage) to demo usage filtering: the write
  // API has no usage field, so terms are created Public and toggled by hand.
  // Applied to a handful of pages only - a lifecycle term on everything is
  // noise that crowds out every other facet.
  { key: "lifecycle", displayName: "Editorial Lifecycle", description: "Internal editorial state. Not for public navigation.", sortOrder: 40, isAvailable: true, isSelectable: false },
  { key: "evergreen", displayName: "Evergreen", parent: "lifecycle", sortOrder: 10, isAvailable: true, isSelectable: true },
  { key: "needs_review", displayName: "Needs Review", parent: "lifecycle", sortOrder: 20, isAvailable: true, isSelectable: true },
  { key: "campaign_2026", displayName: "Campaign 2026", parent: "lifecycle", sortOrder: 30, isAvailable: true, isSelectable: true },
];

/**
 * Maps the legacy ArticlePage.category / CaseStudyPage.industry enum values onto
 * term keys. Used by the seed to migrate existing values and by the front end to
 * fall back to the property when a page has no categories yet.
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "personal-finance": "personal_finance",
  "business-banking": "business_banking",
  investments: "investments",
  "market-insights": "market_insights",
};

/**
 * Per-page term assignments, keyed by the trailing part of the page URL. These
 * win outright over the rule table below and carry the editorial judgement a URL
 * cannot express: which articles are guides versus market commentary, and which
 * are flagged for review so the Internal branch has real data.
 */
const URL_OVERRIDES: Array<{ endsWith: string; terms: string[] }> = [
  { endsWith: "/insights/articles/mortgage-rates-explained/", terms: ["mortgages", "market_insights", "rates_and_fees", "personal_finance", "evergreen"] },
  { endsWith: "/insights/articles/saving-for-first-home/", terms: ["first_time_buyer_mortgage", "easy_access", "guides", "first_time_buyers", "evergreen"] },
  { endsWith: "/insights/articles/business-banking-essentials/", terms: ["business_accounts", "guides", "startups", "evergreen"] },
  { endsWith: "/articles-demo/business-banking-basics/", terms: ["business_accounts", "guides", "startups", "needs_review"] },
  { endsWith: "/articles-demo/guide-to-isas/", terms: ["isas", "guides", "personal_finance", "evergreen"] },
  { endsWith: "/articles-demo/savings-tips-2025/", terms: ["savings", "guides", "personal_finance", "campaign_2026"] },
  { endsWith: "/case-studies/local-bakery-growth/", terms: ["business_lending", "customer_stories", "startups", "evergreen"] },
  { endsWith: "/case-studies/family-finance-journey/", terms: ["first_time_buyer_mortgage", "customer_stories", "families", "evergreen"] },
];

/**
 * Most-specific-wins URL rules for product placement. The FIRST pattern that
 * matches supplies the product term, so deeper pages resolve to their own leaf
 * rather than collapsing into the section term. Order matters: put the deepest
 * paths first.
 *
 * Pages are tagged leaf-only - a page under /mortgage/remortgaging/ gets
 * `remortgaging`, NOT also `mortgages` / `borrowing` / `product`. Filtering by a
 * parent expands to its descendants at query time instead (see
 * expandToUris in src/lib/taxonomy.ts).
 */
const PRODUCT_RULES: Array<{ match: RegExp; term: string }> = [
  { match: /\/personal\/current-account\/instant-payments/, term: "instant_payments" },
  { match: /\/personal\/current-account\/mobile-app/, term: "mobile_banking" },
  { match: /\/personal\/current-account\/travel-money/, term: "travel_money" },
  { match: /\/personal\/current-account/, term: "current_accounts" },
  { match: /\/business\/international-payments/, term: "international_payments" },

  { match: /\/mortgage\/first-time-buyers/, term: "first_time_buyer_mortgage" },
  { match: /\/mortgage\/remortgaging/, term: "remortgaging" },
  { match: /\/mortgage\/buy-to-let/, term: "buy_to_let" },
  { match: /\/mortgage\/overpayments/, term: "overpayments" },
  { match: /\/mortgage/, term: "mortgages" },

  { match: /\/personal\/overdrafts/, term: "overdrafts" },
  { match: /\/personal\/loans/, term: "personal_loans" },
  { match: /business-lending/, term: "business_lending" },
  { match: /\/business\/business-credit-cards/, term: "business_credit_cards" },
  { match: /\/personal\/credit-cards/, term: "personal_credit_cards" },

  { match: /easy-access-savings/, term: "easy_access" },
  { match: /fixed-rate-savings/, term: "fixed_rate" },
  { match: /\/personal\/savings/, term: "savings" },
  { match: /\/investments\/stocks-isa/, term: "stocks_isa" },
  { match: /\/investments\/junior-isa/, term: "junior_isa" },
  { match: /\/investments\/general-investment/, term: "general_investment" },
  { match: /\/investments\/pensions/, term: "pensions" },
  { match: /\/investments/, term: "investments" },

  { match: /business-current-account/, term: "business_current_account" },
  { match: /merchant-services/, term: "merchant_services" },
  { match: /\/business\/business-banking/, term: "business_accounts" },
];

/** Audience rules. Every matching rule contributes, so a page can serve two. */
const AUDIENCE_RULES: Array<{ match: RegExp; terms: string[] }> = [
  { match: /\/mortgage\/first-time-buyers/, terms: ["first_time_buyers"] },
  { match: /junior-isa/, terms: ["families"] },
  { match: /pensions/, terms: ["retirement_planners"] },
  { match: /merchant-services|business-lending/, terms: ["established_sme"] },
  { match: /\/business/, terms: ["business_banking"] },
  { match: /\/personal|\/mortgage|\/investments|\/insights/, terms: ["personal_finance"] },
];

/** Topic rules for non-editorial pages. */
const TOPIC_RULES: Array<{ match: RegExp; terms: string[] }> = [
  { match: /\/case-studies\//, terms: ["customer_stories"] },
  { match: /\/help\//, terms: ["support"] },
  { match: /\/about\//, terms: ["company"] },
  { match: /pricing/, terms: ["rates_and_fees"] },
];

/**
 * Lifecycle is applied deliberately, to a handful of pages. Tagging everything
 * `evergreen` (as an earlier version did) put one term on 97% of content and
 * buried every other facet bucket.
 */
const LIFECYCLE_RULES: Array<{ match: RegExp; terms: string[] }> = [
  { match: /\/help\/accessibility/, terms: ["needs_review"] },
  { match: /\/about\/press/, terms: ["needs_review"] },
  { match: /fixed-rate-savings/, terms: ["campaign_2026"] },
  { match: /\/business\/pricing/, terms: ["campaign_2026"] },
  { match: /\/personal\/current-account\/$/, terms: ["evergreen"] },
  { match: /\/mortgage\/$/, terms: ["evergreen"] },
  { match: /\/personal\/savings\/$/, terms: ["evergreen"] },
];

// Hubs, fixtures and the site root carry no editorial meaning, so tagging them
// would only pollute the facet counts the demo is built to show.
const SKIP = [
  /^\/$/,
  /^\/demo-fixtures\/nav-flag/,
  /^\/demo-fixtures\/$/,
  /^\/demo-fixtures\/articles-demo\/$/,
  /^\/contact-form\/$/,
  /^\/(en\/)?insights\/$/,
  /^\/(en\/)?insights\/articles\/$/,
  /^\/(en\/)?insights\/case-studies\/$/,
];

/**
 * Resolves the term keys for a page URL: an explicit override if one matches,
 * otherwise the most specific product term plus every matching audience, topic
 * and lifecycle term. Returns an empty array for pages that should stay
 * untagged - the seed clears any categories those pages already carry.
 */
export function termsForUrl(url: string): string[] {
  if (SKIP.some((re) => re.test(url))) return [];

  const override = URL_OVERRIDES.find((o) => url.endsWith(o.endsWith));
  if (override) return override.terms;

  const terms = new Set<string>();

  // Most specific product wins; only one product term per page.
  const product = PRODUCT_RULES.find((r) => r.match.test(url));
  if (product) terms.add(product.term);

  for (const rule of AUDIENCE_RULES) {
    if (rule.match.test(url)) rule.terms.forEach((t) => terms.add(t));
  }
  for (const rule of TOPIC_RULES) {
    if (rule.match.test(url)) rule.terms.forEach((t) => terms.add(t));
  }
  for (const rule of LIFECYCLE_RULES) {
    if (rule.match.test(url)) rule.terms.forEach((t) => terms.add(t));
  }

  return [...terms];
}
