# F2 — Architecture Review
**Date:** 2026-04-20
**Branch:** main
**Reviewer:** Claude Sonnet 4.6 (automated)

---

## Executive Summary

The VZ Explorer codebase has a sound overall architecture: App Router is used correctly with a clear server/client split, Supabase access is server-side in page components, and Zustand stores use `skipHydration` to avoid SSR mismatches. The most critical gaps are a missing auth guard on `POST /api/bookings` (unauthenticated booking creation), a hardcoded password hash shipped in client-side JavaScript, both in-memory rate limiters that reset on every cold start, and several god-component files exceeding 1,000–1,800 lines. A secondary concern is the dual `ListingCard` / `BrowseListingCard` divergence and raw `<img>` tags bypassing Next.js image optimization in admin and provider views.

---

## App Router / Server Components

### Findings

**Correct server-component data fetching:**
- `app/(tourist)/listing/[slug]/page.tsx` — async Server Component, Supabase queries run server-side. Correct.
- `app/(tourist)/explore/page.tsx` — async Server Component, calls `getTotalCount()` server-side, then hands off interactive filtering to `<ExploreClient>`. Correct pattern.
- `app/(tourist)/explore/category/[slug]/page.tsx` — async Server Component with `export const revalidate = 604800`. Correct ISR usage.
- `app/(provider)/dashboard/layout.tsx` — async Server Component that calls `supabase.auth.getUser()` server-side before rendering. Correct auth guard.

**Unnecessary `'use client'` directives:**
- `app/demo/_components/DemoFooter.tsx:1` — marked `'use client'` but contains only `Link` and `Logo` with no hooks or event handlers. Can be Server Component.
- `app/demo/_components/BookingCategories.tsx:1`, `HowItWorks.tsx:1`, `FinalCTA.tsx:1`, `CreatorProgram.tsx:1`, `PosadaOwners.tsx:1`, `SafetySection.tsx:1` — all marked `'use client'`. Spot-check on `DemoFooter` confirms at least one has no interactive logic. The demo landing page loads 12 client components; several are likely static-renderable.

**Admin layout as Client Component — significant concern:**
- `app/(admin)/admin/layout.tsx` is `'use client'` (line 1) and implements the entire password gate in the browser. The SHA-256 hash `1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792` is hardcoded in the JS bundle shipped to all users (line 29). Any visitor can extract this hash from the page source. See P0 section.

**`plan/page.tsx` is a full Client Component (line 1):**
- The trip planning page is entirely client-rendered. While necessary for the live AI streaming + Zustand store interaction, there is no `generateMetadata` export, which means the page has no SEO title/description.

---

## Data Fetching & N+1 Issues

### Findings

**Sequential queries in `app/(tourist)/listing/[slug]/page.tsx`:**
- Lines 55–70: two sequential Supabase queries — first fetches `listings` (with `provider` and `photos` joined), then fetches `reviews` for that listing. These could be parallelized with `Promise.all()` for a latency saving of ~1 round trip. Not an N+1, but a sequential-when-parallel opportunity.

**Date-filtered listing path — in-memory per-listing availability check:**
- `app/api/listings/route.ts` lines 241–267: when `check_in`/`check_out` are provided, the route first fetches up to 10,000 listings from Supabase (line 189: `.limit(10000)`) then filters each one via `getAvailability(l.id, ...)` which reads from an in-memory store. This is an in-process loop not a DB N+1, but fetching 10,000 rows as a baseline is concerning at scale.

**Admin outreach bulk endpoint — sequential AI calls in loop:**
- `app/api/admin/outreach/bulk/route.ts` lines 69–78: iterates over `businesses` array and calls `await composeMessage(business, channel)` sequentially inside a `for...of` loop. Each call makes a Claude API round-trip (~0.5–2s). For 50 businesses this is 25–100 seconds of sequential processing. No `Promise.all` with concurrency limiting is used.

**No N+1 found in standard page routes:** The main tourist-facing pages (`/explore`, `/listing/[slug]`) do not fetch inside map/forEach loops.

---

## Component Architecture Issues

### Dual ListingCard

Two separate listing card components exist with different feature sets:

| | `components/listing/ListingCard.tsx` | `components/listing/BrowseListingCard.tsx` |
|---|---|---|
| Input type | `Listing` (full DB type) | `BrowseApiListing` (lighter API shape) |
| Images | `next/image` with `fill` | raw `<img>` with `loading="lazy"` |
| Favorites | `FavoriteButton` (separate component) | Inline `useFavoritesStore` |
| Add to trip | No | Yes — `useItineraryStore` |
| Compact variant | Yes (`compact` prop) | Yes (`variant="compact"`) |
| Used in | `app/(tourist)/explore/category/[slug]/page.tsx` (Server Component context) | `ExploreClient.tsx`, `app/(tourist)/book/page.tsx` |

The split is partially justified — `ListingCard` works in Server Components, `BrowseListingCard` handles client-side store interactions. However, the two are diverging: `BrowseListingCard` uses raw `<img>` (line 226), missing `next/image` optimization. The compact variants overlap significantly. A single card with a `mode="server" | "client"` prop would reduce maintenance surface.

### God Components

| File | Lines | Issue |
|---|---|---|
| `app/(admin)/admin/listings/page.tsx` | 1,871 | Full CRUD UI, modals, form state, bulk ops, AI generation — all in one file |
| `app/onboard/[slug]/OnboardingWizard.tsx` | 1,687 | Multi-step wizard with 6+ steps, all form logic, photo upload, Stripe wiring |
| `components/whatsapp/AiSettingsPanel.tsx` | 1,146 | All WhatsApp AI config UI in one component |
| `app/(provider)/dashboard/messages/brain/page.tsx` | 1,008 | Provider brain/knowledge editor |
| `components/provider/ListingWizard.tsx` | 882 | Listing creation wizard |
| `app/(provider)/dashboard/messages/page.tsx` | 809 | Full WhatsApp inbox UI |
| `app/(admin)/admin/providers/page.tsx` | 802 | Provider pipeline UI |
| `components/map/MapContainer.tsx` | 524 | Mapbox map with pins, zones, controls, routing — no sub-components |

Each of these exceeds 300 lines and mixes data-fetching logic, form state, and render logic. They are not broken (they work), but they are high-risk for regressions on edit.

---

## API Route Design

### Validation Coverage

| Route | Zod | Auth | Notes |
|---|---|---|---|
| `POST /api/bookings` | Yes — `createBookingSchema` | **No auth** | P0: unauthenticated booking creation |
| `GET /api/bookings` | N/A | Yes — `getUser()` | Correct |
| `GET /api/bookings/[id]` | N/A | Yes | Correct |
| `PATCH /api/bookings/[id]` | Partial — status validated against array, but no Zod schema | Yes | Missing Zod schema; `body as { status?, notes? }` type cast at line 88 |
| `POST /api/discount-codes` | Yes — `createCodeSchema` | Yes | Correct |
| `POST /api/discount-codes/validate` | Yes — `validateSchema` | **No auth** | Intentional (public endpoint for checkout) |
| `POST /api/stripe/checkout` | No Zod | **No auth** | P1: bookingId accepted without verifying caller owns booking |
| `POST /api/whatsapp/send` | No Zod | Yes — `getUser()` + provider check | Body validated manually; could use Zod |
| `PUT /api/whatsapp/config` | No Zod | Yes — `getUser()` + provider check | Allowlist filter at line 68–79 is sufficient but not typed |
| `POST /api/admin/outreach/bulk` | No Zod | Yes — `requireAdmin()` | `business_ids` array validated manually |
| `POST /api/admin/discover/ai` | No Zod | Yes — `requireAdmin()` | Body destructured without schema |
| `GET /api/places/autocomplete` | N/A | **No auth** | Intentional public endpoint but proxies Google API key — no rate limit |
| `GET /api/places/photo` | SSRF guard only | **No auth** | Proxies Google Photos API; has SSRF guard and cache headers. Acceptable for public media proxy. |

### Rate Limiting Gaps

- `POST /api/bookings` — no rate limit. An unauthenticated caller can create unlimited booking records.
- `GET /api/places/autocomplete` — no rate limit. Each request proxies to Google Places API at platform cost.
- `POST /api/admin/outreach/bulk` — no rate limit beyond the `requireAdmin()` gate. One request can trigger N sequential Claude API calls.
- **In-memory limiters are serverless-unsafe**: both `lib/api/rate-limit.ts` (sliding window `Map`) and `app/api/whatsapp/webhook/route.ts:41` (`rateLimitMap`) live in module-level variables. On Vercel, every cold start gets a fresh map — the rate limit is per-instance, not global. Under load (multiple concurrent functions), limits are bypassed.

---

## State Management

### Zustand Stores

Five stores: `auth-store`, `favorites-store`, `itinerary-store`, `map-store`, `recently-viewed-store`, `search-store`, `provider-store`.

**Hydration — correctly handled:**
- All persisted stores (`auth`, `favorites`, `itinerary`, `recently-viewed`) use `skipHydration: true` in their persist config.
- `components/common/StoreHydration.tsx` calls `store.persist.rehydrate()` inside a `useEffect` — this is the correct pattern to avoid SSR/CSR hydration mismatches.
- `StoreHydration` is rendered in the tourist layout (verified via `app/(tourist)/layout.tsx` → `Navbar`/`Footer` component tree).

**localStorage direct access (not through Zustand):**
- `app/(tourist)/trips/page.tsx:219` — reads `localStorage.getItem('vz-itineraries')` directly, separate from the Zustand store. This creates a second source of truth for itinerary data; the `itinerary-store` uses `vz_itinerary` as its key (different key name).
- `app/(provider)/dashboard/pms/onboarding/page.tsx:74` — sets `localStorage.setItem('pms_property_id', ...)` outside any store.
- `app/demo/whatsapp/brain/page.tsx:243,262,271,280` — uses localStorage as API fallback for demo knowledge state.

**`creator/(portal)/layout.tsx` auth pattern:**
- Lines 25–33: reads auth from Zustand store (`useAuthStore.getState().user`) as a shortcut, then falls back to a Supabase check. This is a client-side auth check in a layout — if Zustand hasn't hydrated yet on first render, the layout briefly shows a blank state before the Supabase check fires. The `skipHydration: true` pattern means rehydration is deferred, creating a possible flash.

---

## Bundle & Performance

### Mapbox — correctly lazy-loaded
- `MapContainer` is loaded with `dynamic(() => import(...), { ssr: false })` at the call site in `ExploreClient.tsx:11`, `map/page.tsx:30`, and `components/itinerary/TripMap.tsx:11`. Mapbox GL JS is imported inside `useEffect` via dynamic `import('mapbox-gl')` at `components/map/MapContainer.tsx:128` and `332`. Correct pattern.

### Raw `<img>` Tags Bypassing next/image Optimization

The following locations use raw `<img>` instead of `next/image`, missing automatic WebP conversion, lazy loading queue, and placeholder blur:

| File | Line | Context |
|---|---|---|
| `components/listing/BrowseListingCard.tsx` | 226 | Main explore grid card (high-traffic path) |
| `components/listing/BrowseListingCard.tsx` | 284 | Default variant image |
| `components/admin/DiscoverManager.tsx` | 366, 630, 730, 736 | Admin-only — lower impact |
| `components/provider/ListingWizard.tsx` | 411, 780 | Photo preview (blob URLs — next/image cannot handle these; raw `<img>` is correct here) |
| `components/itinerary/SpotReviewCard.tsx` | 97 | Itinerary spot thumbnail |
| `app/(tourist)/trips/page.tsx` | 385 | Trip page place covers |
| `app/(provider)/dashboard/page.tsx` | 182 | Provider dashboard listing thumbnails |
| `app/(admin)/admin/listings/page.tsx` | 274, 1645 | Admin listing images |
| `app/(admin)/admin/discover/collections/page.tsx` | 404 | Collection cover |

The most impactful is `BrowseListingCard.tsx:226` — this renders for every card in the explore grid (up to 24 per page load). Using raw `<img>` here means no WebP conversion and no native lazy-loading prioritization.

**Note:** `ListingWizard.tsx:411,780` use object URL previews (`photo.preview`) which must be raw `<img>` — next/image cannot handle blob: URLs. Those are correctly raw.

### next.config.ts
- `turbopack.root: __dirname` is set — valid configuration.
- Image `remotePatterns` allows `*.supabase.co`, `*.bstatic.com`, `*.amazonaws.com` — wildcard subdomain patterns are broad but acceptable.
- No `output: 'standalone'` or other prod optimizations configured. Not a bug.

---

## Error Handling Gaps

### Sample of 5 API Routes

**`app/api/bookings/route.ts` (GET):**
- Lines 58–76: Supabase path wrapped in try/catch with fallback to JSON store. Good.
- Catch block logs the error and falls through. Acceptable.

**`app/api/bookings/route.ts` (POST):**
- No outer try/catch wrapping the full POST handler. If `createServiceClient()` throws (e.g. env var misconfiguration), an unhandled exception propagates to Next.js — returns a 500 with a framework error page rather than a JSON error. Stripe session creation has a try/catch (line 218). Email sending uses `.catch()` (line 322). Mixed coverage.

**`app/api/whatsapp/webhook/route.ts` (POST):**
- `processInbound` is called via `waitUntil()` with a `.catch()` handler — uncaught errors inside are caught and logged. Good.
- `handleMessage` per-message errors are caught individually at line 141. Good.

**`app/api/itineraries/route.ts` (GET):**
- No try/catch. A Supabase runtime error at line 68 (`const { data, error, count } = await query`) will propagate as an unhandled exception. Partially mitigated because PostgREST errors are returned in `error` not as throws — but connection failures would throw.

**`app/api/admin/outreach/compose/route.ts` (POST):**
- The `for...of channels` loop (lines 65–86) calls `await client.messages.create(...)` without per-channel try/catch. A rate limit or API error from Claude will throw and surface the outer try/catch at line 138 — returning a 500 with the error message. Acceptable but all channels fail if one fails.

---

## Auth Architecture

### Route Group Auth Summary

| Group | Auth Mechanism | Coverage |
|---|---|---|
| `app/(tourist)/` | No layout-level guard — individual pages check auth as needed | Correct: tourist pages are public-by-default |
| `app/(provider)/dashboard/` | `DashboardLayout` (Server Component) checks `getUser()` + `profile.role` — redirect to `/login` on fail | Correct |
| `app/(admin)/admin/` | `AdminLayout` (Client Component) — password gate via SHA-256 cookie check in browser JS | Weak — see below |
| `app/(auth)/` | Public layout for login/register | Correct |
| `app/(ruta)/ruta/` | No layout-level auth check found in `app/(ruta)/layout.tsx` | Needs investigation |

### Admin Auth Architecture — Critical Weakness

`app/(admin)/admin/layout.tsx` implements auth entirely client-side:
1. The SHA-256 hash `1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792` is hardcoded in the JS bundle shipped to every visitor (line 29). This hash can be used to forge the `admin_token` cookie without knowing the password — set `document.cookie = 'admin_token=<hash>'` and the UI unlocks.
2. Even with the hash, the admin API routes correctly use `requireAdmin()` which calls Supabase `getUser()` and checks `profile.role === 'admin'`. So the API is protected at the server level.
3. The client-side gate is therefore only a UX gate, not a security gate. Admin API routes are properly secured. However, the admin UI pages can be rendered by anyone who sets the cookie with the known hash.

### `POST /api/bookings` — Missing Auth Guard

`app/api/bookings/route.ts:79` — the `POST` handler creates a booking without calling `getUser()`. The `GET` handler at line 43 requires auth. Any anonymous user or script can `POST /api/bookings` with arbitrary `guest_name`, `guest_email`, and `listing_id` and create booking records in the Supabase `guest_bookings` table and/or the JSON fallback store. The email confirmation is also sent to the `guest_email` field (line 288), which allows sending transactional emails to arbitrary addresses.

### `POST /api/stripe/checkout` — Missing Ownership Check

`app/api/stripe/checkout/route.ts:5` — accepts a `bookingId` and creates a Stripe checkout session without verifying the caller owns that booking. Any authenticated or unauthenticated user who knows a `bookingId` (a UUID) can trigger a Stripe checkout for someone else's booking. The booking is looked up from the in-memory JSON store (`getBooking(bookingId)` at line 24) which has no ownership check.

### Demo API — No Auth on Production Data

`app/api/demo/whatsapp/knowledge/route.ts` — uses `createServiceClient()` (bypasses RLS) and a hardcoded `DEMO_PROVIDER_ID = '7d78c3cc-0097-4866-a345-d5d1c7783050'`. This endpoint has no auth check. Any caller can `GET` or `PUT` data for that provider. If `DEMO_PROVIDER_ID` matches a real production provider's row, their knowledge base is writable by anyone.

---

## Priority Issues

### P0 (Critical — Broken or Security)

**P0-1: `POST /api/bookings` has no auth guard**
- File: `app/api/bookings/route.ts:79`
- Any anonymous caller can create booking records and trigger confirmation emails to arbitrary email addresses.
- Fix: Add `createClient()` + `getUser()` check at the start of the POST handler, same as GET (lines 48–52).

**P0-2: Admin password hash hardcoded in client bundle**
- File: `app/(admin)/admin/layout.tsx:29`
- `ADMIN_HASH = '1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792'` is shipped to every browser visitor. Setting `document.cookie = 'admin_token=<hash>'` bypasses the UI gate.
- Fix: Move admin UI auth to a middleware (`middleware.ts`) or a Server Component that validates the cookie server-side against `process.env.ADMIN_PASSWORD`. Never ship the hash client-side.

**P0-3: `POST /api/stripe/checkout` has no ownership verification**
- File: `app/api/stripe/checkout/route.ts:24`
- A caller who knows any `bookingId` (UUID) can create a Stripe checkout session for that booking.
- Fix: Add auth check; verify `booking.guest_email === user.email` before creating the session.

### P1 (High — Hurts Quality or Performance)

**P1-1: In-memory rate limiters are not effective in serverless**
- Files: `lib/api/rate-limit.ts`, `app/api/whatsapp/webhook/route.ts:41`
- Module-level `Map` instances reset on each cold start. Under concurrent load, multiple function instances each have their own counter.
- Fix: Replace with a Redis/Upstash-based rate limiter or use Vercel's `@upstash/ratelimit`. Short-term mitigation: accept the limitation but document it.

**P1-2: `POST /api/places/autocomplete` proxies Google API with no rate limit**
- File: `app/api/places/autocomplete/route.ts`
- Every keystroke in any location input that calls this endpoint makes a Google Places API call at platform cost. No auth required, no rate limiting.
- Fix: Add `rateLimit(getClientIp(request), 30)` from `lib/api/rate-limit` and consider caching common queries.

**P1-3: Admin outreach bulk endpoint — sequential Claude calls in loop**
- File: `app/api/admin/outreach/bulk/route.ts:69`
- Sequential `await composeMessage(...)` in `for...of` loop. 50 businesses = 50 serial Claude calls.
- Fix: Use `Promise.all` with concurrency limiting (`p-limit` or a manual semaphore, max 5 concurrent).

**P1-4: `BrowseListingCard.tsx:226` uses raw `<img>` on the main explore grid**
- File: `components/listing/BrowseListingCard.tsx:226, 284`
- High-traffic path (24 cards per explore page). Missing WebP conversion and Next.js image optimization.
- Fix: Replace with `next/image` using `fill` + `sizes`. The image hostname patterns need to be confirmed in `next.config.ts`.

**P1-5: Dual ListingCard divergence**
- Files: `components/listing/ListingCard.tsx`, `components/listing/BrowseListingCard.tsx`
- Two cards with overlapping responsibilities, different image rendering strategies, and diverging feature sets. Maintenance risk.
- Fix: Consolidate into a single card component with appropriate props for server vs. client context differences.

**P1-6: Sequential Supabase queries in listing page**
- File: `app/(tourist)/listing/[slug]/page.tsx:55–70`
- `listings` query followed by `reviews` query sequentially. Wrap with `Promise.all` for ~50% latency reduction on this page.

### P2 (Medium — Tech Debt)

**P2-1: God components exceeding 800 lines**
- `app/(admin)/admin/listings/page.tsx` (1,871 lines), `app/onboard/[slug]/OnboardingWizard.tsx` (1,687 lines), `components/whatsapp/AiSettingsPanel.tsx` (1,146 lines), `app/(provider)/dashboard/messages/brain/page.tsx` (1,008 lines), `components/provider/ListingWizard.tsx` (882 lines).
- Each should be split into sub-components or step components.

**P2-2: `PATCH /api/bookings/[id]` missing Zod schema**
- File: `app/api/bookings/[id]/route.ts:88`
- Body is cast with `as { status?, notes?, special_requests? }` rather than parsed with Zod. Allows unknown fields through.

**P2-3: Demo API endpoint has no auth**
- File: `app/api/demo/whatsapp/knowledge/route.ts`
- Publicly writable via `PUT` using service client. If `DEMO_PROVIDER_ID` corresponds to a real provider, their data is exposed.
- Fix: Add a simple secret-token check (`DEMO_SECRET` env var) or restrict to `NODE_ENV === 'development'`.

**P2-4: `app/(tourist)/trips/page.tsx:219` reads localStorage key `vz-itineraries` directly**
- This is a different key from the Zustand store key `vz_itinerary`. Two parallel itinerary persistence systems.
- Fix: Standardize on one key or read from the Zustand store.

**P2-5: `app/(ruta)/layout.tsx` has no auth guard**
- File: `app/(ruta)/layout.tsx`
- The `(ruta)` route group (dispatch, vehicles, drivers) renders with no server-side auth check in the layout. Individual pages may or may not check auth independently.

**P2-6: `app/plan/page.tsx` has no `generateMetadata`**
- File: `app/plan/page.tsx`
- The planning page is a full `'use client'` page with no metadata export. Title shows as the default site title in browser tabs and search results.

**P2-7: `itinerary-store.ts` uses `devtools` middleware in production**
- File: `stores/itinerary-store.ts:38`
- `devtools` is wrapped unconditionally. Should be gated: `process.env.NODE_ENV === 'development' ? devtools(...) : ...`.

### P3 (Low — Nice to Have)

**P3-1: Admin outreach compose endpoint — no per-channel try/catch**
- File: `app/api/admin/outreach/compose/route.ts:65`
- Claude API error in one channel fails all channels. Per-channel try/catch with partial success response would be more robust.

**P3-2: `app/api/itineraries/route.ts` GET has no outer try/catch**
- File: `app/api/itineraries/route.ts:68`
- Connection-level Supabase failures will surface as unhandled exceptions. Add a top-level try/catch.

**P3-3: Multiple `<img>` tags in admin/provider views without `loading="lazy"`**
- Files: `app/(admin)/admin/listings/page.tsx:274,1645`, `app/(admin)/admin/discover/collections/page.tsx:404`, `app/(provider)/dashboard/page.tsx:182`, `components/admin/DiscoverManager.tsx:630,730,736`
- Admin/provider paths — lower priority but adds unnecessary image load overhead.

**P3-4: `app/api/bookings/route.ts` POST has no outer try/catch**
- If `createServiceClient()` throws unexpectedly, the response is a Next.js framework error rather than a structured JSON error.

**P3-5: `places/autocomplete` result is not cached**
- File: `app/api/places/autocomplete/route.ts`
- Identical queries (common city/region names) hit Google API on every request. Adding `next: { revalidate: 3600 }` to the fetch or caching results in memory would reduce API costs.
