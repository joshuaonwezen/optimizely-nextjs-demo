# Optimizely Next.js Demo - Mosey Bank

A production-style reference implementation for Optimizely SaaS CMS + Feature Experimentation on Next.js 16. Built as a fictional retail banking brand (Mosey Bank), it demonstrates how the Optimizely platform fits together end-to-end: content editing, audience targeting, ISR caching, and more - with 22 annotated SDK demo pages developers can run locally against a real CMS instance.

## What this demonstrates

### CMS
| Demo page | What it covers |
|-----------|---------------|
| `/demo/visual-builder` | Visual Builder composition model, page routes, component registry, block authoring |
| `/demo/content-modelling` | Content types, property types, display templates, fragment co-location |
| `/demo/preview` | Draft vs published content, preview URL, Visual Builder iframe communication |
| `/demo/forms` | Form blocks, submit handler, audience-aware personalization loop |
| `/demo/navigation` | Graph-driven navigation tree, recursive GraphQL query, nested menu rendering |
| `/demo/localization` | Locale as content dimension, Graph locale filter, multi-language routing |
| `/demo/seo` | generateMetadata, sitemaps, JSON-LD, image optimization |
| `/demo/management-api` | Programmatic content creation, seeding, migrations |
| `/demo/rich-text` | richText property type, JSON vs HTML rendering, embedded blocks |
| `/demo/content-reuse` | Referenced vs embedded content, single source of truth, content drift |
| `/demo/media` | Image property modelling, Graph response shapes, next/image patterns, damAssets |
| `/demo/global-settings` | Singleton content items, ISR cache strategy for layout components |
| `/demo/content-lifecycle` | Editorial states, scheduled publishing, webhook events |

### Integrations
| Demo page | What it covers |
|-----------|---------------|
| `/demo/feature-experimentation` | FX flags, A/B experiments, CMS Variations, feature variables, impression firing |
| `/demo/personalization` | Audience attribute collection, visitor context, the Audience Switcher demo tool |
| `/demo/external-content` | Graph Content Source API, `_Item`/`_AssetItem`/`_ImageItem` base types, sync paths |

### Graph & Queries
| Demo page | What it covers |
|-----------|---------------|
| `/demo/caching` | Next.js ISR, Graph CDN cache, webhook-driven revalidation, two-layer cache architecture |
| `/demo/graph-queries` | Efficient querying patterns, @recursive, avoiding N+1 |
| `/demo/search` | Full-text and semantic search, cursor pagination, cache strategy |
| `/demo/listing` | Paginated list pages, sorting, filtering |

### Architecture
| Demo page | What it covers |
|-----------|---------------|
| `/demo/architecture` | How SaaS CMS, Graph, Next.js, and Feature Experimentation fit together |
| `/demo/error-handling` | Graceful degradation, notFound vs 500, error boundaries, fallback data |

## Tech stack

- **Next.js 16** (App Router, React Server Components, ISR)
- **Optimizely SaaS CMS** - Visual Builder, content types, Management API
- **Optimizely Graph** - GraphQL content delivery, Content Source API for external data
- **Optimizely Feature Experimentation** - server-side flags, A/B experiments, audience targeting
- **Tailwind CSS v4**
- **TypeScript**

## Prerequisites

You need active accounts for:

1. **Optimizely SaaS CMS** - with Graph enabled (Single Key + App Key/Secret)
2. **Optimizely Feature Experimentation** - for the FX SDK Key
3. **Node.js 20+**

One manual setup step is required in the CMS UI before seeding: the Management API cannot create containers, so you need to create a root content container yourself. In the CMS, create a new container (any name, e.g. "Demo Content"), copy its key from the URL or content properties, and add it to `.env.local`:

```
OPTIMIZELY_ROOT_CONTAINER=<your-container-key>
```

All other content is created by the seed scripts.

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/joshuaonwezen/optimizely-nextjs-demo.git
cd optimizely-nextjs-demo
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your credentials - see Environment variables below

# 3. Push content types to CMS
npm run opti:push

# 4. Seed everything (schema push + content + nav + modeling demo + webhook)
npm run seed:all

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local` - it is git-ignored.

| Variable | Description |
|----------|-------------|
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Graph Single Key for published content queries |
| `OPTIMIZELY_GRAPH_GATEWAY` | Graph endpoint (default: `https://cg.optimizely.com/content/v2`) |
| `OPTIMIZELY_CMS_URL` | Your CMS instance URL (e.g. `https://example.cms.optimizely.com`) |
| `NEXT_PUBLIC_OPTIMIZELY_CMS_URL` | Same URL - exposed to the client for Visual Builder iframe CSP |
| `OPTIMIZELY_APP_KEY` | Graph App Key (used by seed scripts for Content Source API auth) |
| `OPTIMIZELY_APP_SECRET` | Graph App Secret |
| `OPTIMIZELY_CMS_CLIENT_ID` | Management API client ID (used by seed scripts) |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | Management API client secret |
| `OPTIMIZELY_ROOT_CONTAINER` | Key of the root CMS container for seeded content (create manually in CMS UI) |
| `OPTIMIZELY_PREVIEW_SECRET` | Secret token for draft/preview mode |
| `OPTIMIZELY_REVALIDATE_SECRET` | Shared secret for the `/api/revalidate` and `/api/publish` webhook endpoints |
| `OPTIMIZELY_FX_SDK_KEY` | Feature Experimentation SDK key |

## Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint

# CMS content types
npm run opti:login       # Authenticate with the CMS CLI
npm run opti:push        # Push content type schema to CMS

# Content seeding
npm run seed:all         # One-shot: schema push + all content + webhook (recommended)
npm run seed             # Seed page content (home, about, product pages)
npm run seed:nav         # Seed navigation structure + TraditionalPage leaf pages
npm run seed:modeling    # Seed content modeling demo (articles, case studies, team, pricing, etc.)
npm run seed:faqs        # FAQ blocks and container

# Individual seed scripts (run with tsx directly)
npx tsx scripts/seed-quotes.ts              # External quote data → Graph Content Source API
npx tsx scripts/seed-fx-experiment.ts       # Feature Experimentation flag + variations
npx tsx scripts/seed-homepage-variations.ts # CMS homepage variations for FX demo
npx tsx scripts/update-homepage-variations.ts # Update existing homepage variation compositions

# Webhooks
npm run webhook:register  # Register /api/webhooks with Optimizely Graph
```

> Seed scripts require `OPTIMIZELY_CMS_CLIENT_ID` and `OPTIMIZELY_CMS_CLIENT_SECRET`. Pass them inline if you prefer not to store them in `.env.local`:
> ```bash
> OPTIMIZELY_CMS_CLIENT_ID=xxx OPTIMIZELY_CMS_CLIENT_SECRET=yyy npx tsx scripts/seed-content.ts
> ```

## Project structure

```
src/
  app/
    [[...slug]]/         Catch-all CMS page route - evaluates FX flags, fetches Graph variations
    api/
      webhooks/          Graph webhook receiver (revalidates ISR cache on content change)
      revalidate/        Manual ISR revalidation endpoint (path-specific or full-site)
      publish/           CMS publish event hook (full-site bust)
    preview/             Draft mode preview route
    demo/                22 annotated SDK demo pages (read-only, do not edit content)

  components/
    blocks/              One directory per block - index.tsx (type + component) + *.fragment.ts
    layout/              NavigationHeader, Footer, GlobalBanner

  lib/
    optimizely/
      client.ts          graphqlFetch() - typed GraphQL wrapper with ISR/no-store/preview logic
      auth.ts            OAuth token cache for Management API
      experimentation.ts FX SDK wrapper (getOptimizelyClient, getDecision)
      visitor.ts         getVisitorContext() - reads userId, device, persona, logged_in from cookies
      user.ts            getOptimizelyUser() - request-scoped FX user context via React cache()
      componentRegistry.ts Registers all content types and React components with the CMS SDK
    graphql/
      queries/           Named Graph queries with ISR tags and fallback data

scripts/
  seed-*.ts              Management API content creation scripts
  seed-quotes.ts         Content Source API (external data sync, not Management API)
  register-webhook.mjs   Registers /api/webhooks with the Graph webhook API
```

## Adding a new block

1. `src/components/blocks/<Name>/index.tsx` - export `NameType` (contentType definition) + default React component
2. `src/components/blocks/<Name>/Name.fragment.ts` - GraphQL fragment, co-located with the block component
3. `src/lib/optimizely/componentRegistry.ts` - three edits: import the block and its type, add `NameType` to `initContentTypeRegistry([...])`, add `Name` to `initReactComponentRegistry({ resolver: { ... } })`
4. `npm run opti:push` - push the updated schema to CMS

## Caching

Two independent cache layers sit between a CMS publish and a user seeing fresh content:

| Layer | Controlled by | Bypassed with |
|-------|--------------|---------------|
| Next.js fetch cache (ISR) | `next.revalidate`, `tags`, `cache: "no-store"` in `graphqlFetch()` | `revalidatePath` / `revalidateTag` via webhooks |
| Graph CDN cache | Optimizely infrastructure | `?cache=false` on the endpoint URL, or `{ cache: false }` in SDK methods |

The catch-all CMS page route (`[[...slug]]`) is `force-dynamic` and uses `{ cache: false }` on all Graph requests so every request gets the absolute latest content from Graph's data store.

ISR pages (navigation, banners, etc.) use tag-based revalidation via the `/api/webhooks` endpoint, which Optimizely Graph calls on every `bulk.completed`, `doc.updated`, and `doc.expired` event.

## Feature Experimentation + CMS Variations

Audience targeting runs entirely server-side:

1. `getOptimizelyUser()` reads the `optimizelyEndUserId` cookie (set by middleware on first visit) and evaluates all FX flags using the visitor's attributes (device, persona, logged-in state).
2. Active variation keys are passed to `getContentByPath` as a Graph variation filter.
3. Graph returns the matching CMS content variant (created in Visual Builder) or falls back to the original via `includeOriginal: true`.
4. Once a CMS variation is confirmed served, `user.decide(flagKey, [])` fires the impression to FX analytics.

The variation key string is the only contract between FX and the CMS - it must match exactly (case-sensitive) between the FX flag variation key and the CMS variation name in Visual Builder.

## Webhook endpoints

| Endpoint | Trigger | What it does |
|----------|---------|-------------|
| `POST /api/webhooks` | Optimizely Graph (`npm run webhook:register`) | Revalidates ISR layout, navigation, banner, and referrals tags |
| `POST /api/revalidate` | CMS Settings → Events | Revalidates a specific path or the full layout cache |
| `POST /api/publish` | CMS Settings → Events | Full-site layout cache bust (simpler alternative to `/api/revalidate`) |

`/api/revalidate` and `/api/publish` require the `x-revalidate-secret` header matching `OPTIMIZELY_REVALIDATE_SECRET`.

## Deploying

The app is designed for Vercel. After setting all environment variables in the Vercel dashboard:

```bash
vercel deploy
```

After deploying, re-run `npm run webhook:register` with the production URL so Graph sends webhook events to the correct endpoint.
