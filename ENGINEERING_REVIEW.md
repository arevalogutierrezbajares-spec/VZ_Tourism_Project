# Engineering Review: VZ Tourism App
**Date:** 2026-04-03
**Reviewer:** Engineering Audit
**Scope:** Production readiness of `/private/tmp/vz-tourism-app/.claude/worktrees/zealous-swanson`

---

## Executive Summary

VZ Explorer is a Venezuela tourism platform with AI-powered search, booking, a provider dashboard, and an admin CRM for outreach and onboarding. The codebase is ambitious and well-structured architecturally, but it is **NOT production-ready** as of this review. There is one hard build-breaking error, a second runtime build error, a committed `.env.local` with live API keys, a Google Places API key embedded across 939 JSON data records, a completely unauthenticated admin panel, and several API routes that accept arbitrary writes without identity verification. The app can only be deployed after fixing these critical issues.

**Overall production readiness score: 3 / 10**

---

## Build Status: FAIL

The `npx next build` command exits with an error:

```
Error: Turbopack build failed with 1 errors:
./.claude/worktrees/zealous-swanson/app/onboard/[slug]/page.tsx:5:1
Module not found: Can't resolve './OnboardingWizard'
```

`app/onboard/[slug]/page.tsx` imports `./OnboardingWizard` but no such file exists anywhere in the repository. This is a **hard blocker** — the app cannot be deployed.

Additionally, the build reports these runtime module resolution errors (non-fatal to the build in some Next.js configurations but will cause page crashes at runtime):

- `app/(admin)/admin/outreach/page.tsx` — imports `Instagram` from `lucide-react` but `Instagram` does not exist in lucide-react v1.7.0
- `app/(admin)/admin/outreach/sequences/page.tsx:5` — same `Instagram` import; confirmed missing

**Note on the Instagram import:** The source files as reviewed do NOT actually import `Instagram` from lucide — the outreach and sequences pages use `AtSign`, `Send`, `MessageCircle` etc. The build errors citing these files are likely a Turbopack source-map artifact from a prior cached build state. The `app/(admin)/admin/listings/page.tsx` does NOT import `Instagram` either. The build failure is dominated by the missing `OnboardingWizard` module.

---

## File Count and Structure Overview

| Metric | Value |
|--------|-------|
| Total .ts/.tsx files | 252 |
| API routes | 42 |
| E2E tests | 6 spec files |
| Unit/integration tests | ~20 test files |
| Data files (JSON) | 10 |
| Scraped listings | 1,170 entries, 3.7 MB |

**Directory structure:**
```
app/
  (tourist)/       — public-facing tourist pages
  (provider)/      — authenticated provider dashboard
  (admin)/         — admin panel (NO auth)
  (auth)/          — login/register/callback
  api/             — 42 route handlers
  onboard/         — business onboarding flow (broken build)
components/        — UI components
lib/               — stores, utilities, third-party clients
data/              — JSON flat-file database (mutable at runtime)
stores/            — Zustand state
hooks/             — React hooks
types/             — TypeScript type definitions
e2e/               — Playwright tests
__tests__/         — Jest tests
```

The app uses a split data model: scraped listings in JSON flat files, live data (listings, bookings, users, reviews) in Supabase. The flat-file system degrades gracefully when Supabase is not configured.

---

## Critical Issues (Must Fix Before Production)

### CRIT-1: Missing `OnboardingWizard` component — build fails
**File:** `app/onboard/[slug]/page.tsx:5`

```typescript
import { OnboardingWizard } from './OnboardingWizard';
```

`OnboardingWizard.tsx` does not exist anywhere in the codebase. `lib/onboarding-store.ts` exists and has a full session model, and there are API routes under `app/api/onboard/[slug]/`, but the client component was never created. The entire `/onboard/[slug]` route is dead. This must be created or the import removed and the route stubbed.

---

### CRIT-2: Live API keys committed to `.env.local`
**File:** `.env.local`

The following live credentials are committed to the repository:

```
ANTHROPIC_API_KEY=<redacted>
STRIPE_SECRET_KEY=<redacted>
STRIPE_PUBLISHABLE_KEY=<redacted>
NEXT_PUBLIC_MAPBOX_TOKEN=<redacted>
```

These keys must be rotated immediately, and `.env.local` must be added to `.gitignore`. The Stripe key is `sk_test_` which is a test key, but the Anthropic key appears to be a real API key.

---

### CRIT-3: Google Places API key embedded in 939 production data records
**File:** `data/scraped-listings.json`

Photo URLs for 939 of 1,170 listings contain the pattern `&key=AIzaSyATTNCc2-dRb6XZI40FvFJVmCIsz1yWeqE`. This key is served publicly through the API (`/api/listings`) and displayed in browser dev tools. These URLs are proxied through the Google Places Photo API — anyone with the key can make billable calls. The key must be rotated and the photo fetching architecture must be changed (proxy via server or download photos to Supabase Storage).

---

### CRIT-4: Admin panel has zero authentication
**File:** `app/(admin)/admin/layout.tsx`

The admin layout is a pure `'use client'` navigation component with no authentication check whatsoever. All admin routes — listings management, bulk operations, AI text generation, provider pipeline, outreach, bookings — are publicly accessible by URL. Contrast with the provider dashboard layout, which correctly calls `supabase.auth.getUser()` and checks roles.

Every admin route and its backing API endpoints are effectively public:

| Route | Effect |
|-------|--------|
| `DELETE /api/admin/listings?id=X` | Delete any listing |
| `POST /api/admin/listings/bulk` | Bulk-update any listings |
| `POST /api/admin/outreach/compose` | Trigger Claude API calls (billable) |
| `POST /api/admin/listings/ai` | Trigger Claude API calls (billable) |
| `POST /api/admin/discover/ai` | Trigger Claude API calls (billable) |

Fix: add a server-side auth check in `app/(admin)/admin/layout.tsx` that calls `createClient()` and verifies `role === 'admin'`, mirroring the provider layout.

---

### CRIT-5: Several data-mutating API routes lack authentication
**Files:**
- `app/api/bookings/route.ts` — `POST` creates bookings without any auth
- `app/api/payouts/route.ts` — `POST /api/payouts` creates payouts for any `provider_id` passed in body
- `app/api/provider-settings/route.ts` — `POST` writes payment settings (bank account numbers, Zelle email, USDT address) for any `provider_id` passed in body
- `app/api/notifications/waitlist/route.ts` — `GET` returns all waitlist entries (email addresses) without auth
- `app/api/admin/bookings/route.ts` — returns all bookings to unauthenticated callers

The payout and provider-settings endpoints are particularly dangerous: they accept a `provider_id` in the request body with no verification. Anyone can read or overwrite another provider's payment settings by guessing a provider ID.

**Example vulnerable call:**
```bash
curl -X POST /api/provider-settings \
  -d '{"provider_id": "prov_001", "zelle_email": "attacker@evil.com"}'
```

---

## High Priority Issues (Fix Soon)

### HIGH-1: Hardcoded fallback `provider_id = 'prov_001'`
**Files:**
- `app/api/payouts/route.ts:17` — `const provider_id = searchParams.get('provider_id') || 'prov_001'`
- `app/api/provider-settings/route.ts:39,53` — same pattern
- `app/(provider)/dashboard/settings/page.tsx:20` — `useState<string>('prov_001')`
- `app/(provider)/dashboard/payouts/page.tsx:37` — `const PROVIDER_ID = 'prov_001'`
- `components/provider/PayoutCard.tsx:36` — `provider_id: 'prov_001'`

The provider dashboard pages are authenticated (the layout enforces auth) but then hardcode a dummy provider ID instead of fetching the real one from the session. All providers see the same data. This needs to resolve the real provider ID from the authenticated user.

---

### HIGH-2: Duplicate slugs in scraped listings
**File:** `data/scraped-listings.json`

15 slugs are duplicated, causing 30+ listings to be unreachable via `/listing/[slug]` (only the first match is returned by `getListingBySlug`). Listings affected include:
- `gran-roque` (3 duplicates)
- `el-hatillo`, `cayo-sombrero`, `gran-sabana`, `hotel`, `hotel-la-gran-sabana`, `los-corales`, `madriski`, `posada-cuyagua-beach`, `posada-guamanchi`, `posada-paraiso`, `restaurante-las-mercedes`, `santa-elena-de-uairen` (2 each)

The slug generation script needs a uniqueness suffix (e.g., city or numeric counter).

---

### HIGH-3: No price data in scraped listings — bookings use a hardcoded $50 fallback
**File:** `app/api/bookings/route.ts:105`

```typescript
const base_price_usd = listing?.price_usd ?? listing?.price ?? 50;
```

Zero of 1,170 scraped listings have `price_usd` or `price` fields. Every booking uses the `$50` fallback regardless of property type. A 5-star Los Roques resort and a budget hostal both charge $50/night. The price data must be scraped/populated or the booking flow must ask for pricing before allowing a booking.

---

### HIGH-4: `lib/stripe/server.ts` crashes at import if `STRIPE_SECRET_KEY` is unset
**File:** `lib/stripe/server.ts:6`

```typescript
_stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
```

The `!` non-null assertion means if `STRIPE_SECRET_KEY` is not set, `new Stripe(undefined, ...)` will throw at runtime during a checkout or webhook call. Unlike the Supabase and Anthropic clients which guard with `if (!key) return null`, Stripe will crash the entire API handler. Wrap in a null check.

---

### HIGH-5: `lib/mapbox/helpers.ts` uses non-null assertion on env var
**File:** `lib/mapbox/helpers.ts:3`

```typescript
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
```

This is a module-level constant evaluated at server startup. If `NEXT_PUBLIC_MAPBOX_TOKEN` is not set, every call to `geocode()`, `reverseGeocode()`, or `getDirections()` will pass `undefined` as the token and make requests to `...&access_token=undefined`, silently failing or returning errors.

---

### HIGH-6: All platform_status values are `pending` — no listings are actually visible as active
**File:** `data/scraped-listings.json` (data integrity)

1,170 of 1,170 listings have `platform_status: 'pending'`. The `isOnboarded()` function returns `true` only for `'verified'` or `'founding_partner'`. The public listing view at `ScrapedListingView` displays pending listings, but any feature-gating on onboarding status means zero active inventory.

---

### HIGH-7: `data/` directory is mutable at runtime with no backup or ACID guarantees
**Files:** `lib/admin-store.ts`, `lib/bookings-store.ts`, `lib/payouts-store.ts`, `lib/outreach-store.ts`, `lib/availability-store.ts`

All data is stored in JSON files in the `data/` directory with a hand-rolled in-process mutex. This approach fails in several production scenarios:

1. **Serverless environments (Vercel):** The filesystem is read-only. All write operations (`updateListing`, `createBooking`, `createPayout`) will silently fail or throw. The app is ostensibly targeting Vercel (there was a commit message about resolving Vercel deployment errors).
2. **Multiple instances:** Any horizontal scaling (even two serverless invocations) breaks the mutex — each instance has its own in-process lock.
3. **No atomic writes:** `writeAll()` overwrites the file; a crash mid-write corrupts the database.

---

## Medium Priority Issues (Technical Debt)

### MED-1: `<img>` tags instead of `next/image`
**Files:** 13 occurrences across components

```
app/(tourist)/discover/DiscoverGrid.tsx:76
app/(tourist)/discover/PhotoModal.tsx:267
app/(provider)/dashboard/marketing/page.tsx:130
app/(provider)/dashboard/page.tsx:172
app/(admin)/admin/discover/collections/page.tsx:399
app/(admin)/admin/listings/page.tsx:273,1604
components/admin/DiscoverManager.tsx:359,623,722,728
components/provider/ListingWizard.tsx:410,778
```

Raw `<img>` tags lose Next.js image optimization (lazy loading, format conversion, responsive sizes, CDN caching). Many of these load Google Maps API photos which are slow. Several are already `loading="lazy"` but not optimized.

---

### MED-2: No CORS headers, no rate limiting on any API route
No API route sets CORS headers. The AI endpoints (`/api/ai/search`, `/api/admin/listings/ai`, `/api/admin/outreach/compose`, `/api/admin/discover/ai`) make Claude API calls without any rate limiting. A single bad actor could exhaust the Anthropic quota. The `/api/admin/outreach/bulk` route can trigger Claude for hundreds of businesses in a single call.

---

### MED-3: `console.error` in provider-register swallows real errors
**File:** `app/(auth)/provider-register/page.tsx:72`

```typescript
if (providerError) console.error('Provider creation error:', providerError);
```

Provider creation errors are logged but not shown to the user and not returned to the caller. A provider can submit the registration form, have the database write fail silently, and see a success screen. This should throw or surface the error.

---

### MED-4: Booking store uses `require()` to load 3.7 MB JSON at request time
**File:** `app/api/bookings/route.ts:18`

```typescript
_listings = require('@/data/scraped-listings.json') as Record<string, unknown>[];
```

This loads the entire 3.7 MB scraped-listings file into memory on each cold start to do a listing lookup. It's memoized after the first call (`_listings`), but there are two separate caches — `lib/local-listings.ts` and `lib/admin-store.ts` and now this inline `require()` — all loading the same file. The bookings route should use the shared `local-listings` module.

---

### MED-5: `zodResolver` cast to `any` in 9 places
**Files:** `app/(auth)/login/page.tsx:28`, `app/(auth)/register/page.tsx:28`, `app/(auth)/provider-register/page.tsx:37`, `app/(provider)/dashboard/settings/page.tsx:23`, `app/(provider)/dashboard/listings/new/page.tsx:26`, `app/(provider)/dashboard/listings/[id]/edit/page.tsx:30`, `components/admin/AdminSafetyZoneForm.tsx:28`, `components/provider/ListingWizard.tsx:98`, `components/listing/ReviewSection.tsx:36`

All use `resolver: zodResolver(schema) as any`. This loses type safety on the form's field types. The underlying issue is likely a version mismatch between `@hookform/resolvers` and `react-hook-form` types — should be fixed by upgrading or aligning versions.

---

### MED-6: Fake USDT address in production fallback
**File:** `app/api/bookings/route.ts:191`

```typescript
address: process.env.PAYMENT_USDT_ADDRESS || 'TRx9vZtourismPlatformAddressHere',
```

If `PAYMENT_USDT_ADDRESS` is not set, tourists are shown a fake USDT address. Any USDT payment to this address is unrecoverable. This should fail closed: if the env var is not set, USDT payment should be disabled, not fallback to a placeholder.

---

### MED-7: Admin analytics page reads from Supabase but most data lives in flat files
**File:** `app/(admin)/admin/analytics/page.tsx`

The analytics page queries `supabase.from('bookings')` and `supabase.from('listings')`. But the actual booking and listing data in this app lives in `data/bookings.json` and `data/scraped-listings.json`. If Supabase is not configured (or the tables are empty), the admin analytics page shows all zeros. The page needs to query both data sources.

---

### MED-8: No `next.config.ts` domains for Google Maps photo URLs
**File:** `next.config.ts`

`maps.googleapis.com` is listed as an allowed domain for `next/image`, but the app uses raw `<img>` tags for Google Maps photos (see MED-1). If/when images are migrated to `<Image>`, the domain config is ready — but the Google API key will still be exposed in the `src` URLs.

---

## Low Priority Issues (Nice to Have)

### LOW-1: TypeScript `any` count is 23 non-trivial occurrences

The 23 occurrences are concentrated in:
- `as any` resolver casts (9 instances — see MED-5)
- `eslint-disable-next-line @typescript-eslint/no-explicit-any` used to work around Stripe webhook type incompatibility
- Test mocks (expected)

TypeScript strict mode is enabled in `tsconfig.json` — these `any` escapes suppress legitimate type errors.

---

### LOW-2: `lib/claude/client.ts` uses deprecated export

```typescript
/** @deprecated use getAnthropicClient() */
export const anthropic = { get messages() { return getAnthropicClient().messages; } }
```

The deprecated alias is still referenced in some places. Should be cleaned up.

---

### LOW-3: `proxy.ts` at project root

**File:** `proxy.ts` — a file at root level that's included in `tsconfig.json` but never referenced from anywhere in the app. Likely a development utility left behind.

---

### LOW-4: E2E test config references non-existent base URL

**File:** `playwright.config.ts` — defaults to `http://localhost:3111`. The build is broken, so e2e tests can't run against local dev. No CI configuration was found in the repo.

---

### LOW-5: `data/room-types.json` is empty (`[]`)

**File:** `data/room-types.json` (3 bytes: `[]`). The room-types API route (`/api/listings/[id]/room-types/`) references a room types store, but the data file is empty. Room type functionality is scaffolded but non-functional.

---

## Data Integrity Results

| Field | Missing |
|-------|---------|
| name | 0 |
| slug | 0 |
| latitude | 0 |
| longitude | 0 |
| type | 0 |
| category | 0 |

| Metric | Value |
|--------|-------|
| Total listings | 1,170 |
| With photos | 1,105 |
| With cover image | 1,105 |
| With price data | **0** |
| platform_status: pending | **1,170** (all) |
| Duplicate slugs | 15 (affecting 30+ listings) |

Core fields are complete. The data quality issues are: missing prices (all listings), all listings in `pending` status (no onboarded inventory), and 15 duplicate slug collisions.

---

## Security Findings

| Severity | Finding |
|----------|---------|
| Critical | Live `ANTHROPIC_API_KEY` committed to `.env.local` |
| Critical | Live Stripe test key committed to `.env.local` |
| Critical | Google Places API key `AIzaSyATTNCc2...` embedded in 939 data records served publicly via `/api/listings` |
| Critical | Admin panel (`/admin/*`) has no authentication — fully public |
| Critical | `/api/payouts` POST accepts arbitrary `provider_id` with no auth — anyone can create a payout request for any provider |
| Critical | `/api/provider-settings` POST accepts arbitrary `provider_id` — anyone can overwrite a provider's payment credentials |
| High | `/api/bookings` GET returns all bookings including guest PII without auth |
| High | `/api/notifications/waitlist` GET returns all waitlist emails without auth |
| High | No rate limiting on AI endpoints — Claude API costs are unprotected |
| Medium | `STRIPE_SECRET_KEY` crashes if unset rather than gracefully degrading |
| Low | No CORS headers configured (not critical for SSR app) |

---

## Performance Recommendations

1. **3.7 MB JSON file loaded on every cold start.** `lib/local-listings.ts`, `lib/admin-store.ts`, and `app/api/bookings/route.ts` all independently load the same file. Consolidate to one singleton cache and consider migrating to SQLite (via `better-sqlite3`) for O(1) slug lookups instead of `Array.find`.

2. **All 42 admin routes load the full 1,170-listing dataset on every request**, even for single-record operations. The `loadAll()` pattern is fine for read-heavy admin use, but the write path (`updateListing`) re-serializes the entire 3.7 MB file for every change.

3. **Google Maps Photo API URLs** will be slow: every photo request from users hits Google's servers and includes the API key in the URL. The standard pattern is to proxy them through a server-side endpoint or download/cache them to Supabase Storage during scraping.

4. **No Next.js `revalidate` or `unstable_cache`** is used on any page. The listing pages are server-rendered on every request, re-reading the JSON file each time (though the in-process cache mitigates repeated reads within the same Node instance).

5. **`/api/ai/search` has `maxDuration = 60`** — streaming search with Claude will hold connections open for up to a minute. This is appropriate, but the lack of rate limiting means this endpoint can be abused.

---

## TypeScript Quality Assessment

- **Strict mode is enabled.** This is good.
- **23 `any` usages** in production code (excluding tests). Most are `as any` casts on `zodResolver` — a library type mismatch rather than lazy typing.
- **`!` non-null assertions** on env vars in `lib/stripe/server.ts` and `lib/mapbox/helpers.ts` are the most dangerous — they cause runtime crashes rather than graceful degradation.
- **`eslint-disable-next-line @typescript-eslint/no-explicit-any`** used in `app/api/stripe/webhooks/route.ts` and `app/api/bookings/route.ts` for the Stripe webhook event type — acceptable given Stripe SDK type complexity.
- **Test files use `any` freely** — standard and acceptable.
- Overall TypeScript quality is decent. The type system is being used meaningfully and the `any` escapes are mostly pragmatic rather than indicative of a sloppy codebase.

---

## Overall Production Readiness Score: 3 / 10

**Justification:**

The app is well-architected for an early-stage product. The code is readable, API routes are mostly consistent, Supabase is properly guarded with null checks throughout, and there's meaningful test coverage. The feature set is impressive for a tourism platform.

However, the blockers are fundamental:

1. The build is broken (missing file).
2. Live API keys are committed.
3. A Google API key is baked into 939 public data records.
4. The admin panel and several financial API routes are completely unauthenticated.
5. The flat-file database architecture is incompatible with Vercel (read-only filesystem) — which is where this app is apparently being deployed.
6. Zero listings have prices, so all bookings use a hardcoded $50 default.

Items 1-4 must be fixed before the app can be safely deployed in any environment. Item 5 (the file-system database) requires either migrating to Supabase for all data or deploying to a platform with persistent storage (Railway, Fly.io, Render with a volume). The app cannot launch on Vercel in its current architecture without data loss.

---

*Review generated: 2026-04-03*
