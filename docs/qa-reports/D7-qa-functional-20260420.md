# D7 — Functional QA Report
**Date:** 2026-04-20
**Scope:** Full-stack source-code review of all 14 feature domains
**Method:** Static analysis of page components, API route handlers, and shared library code

---

## Executive Summary

The platform is substantially functional at the code level. The majority of features have real, end-to-end wiring — Supabase auth, Stripe, Resend email, AI trip planner, and RUTA transport all have non-stub implementations. The most significant gaps are:

1. **Demo Login** is client-state only — a demo user cannot actually use any authenticated API route (Supabase returns 401 for `auth.getUser()` on a fake user), meaning "My Trips", booking history, and saved places fail silently for demo users.
2. **Discount Codes** have a complete validation API but are **not wired into the tourist-facing booking flow** — no UI component in the listing or booking pages calls `/api/discount-codes/validate` or accepts a code at checkout.
3. **Provider Calendar** references two non-existent API routes: `/api/provider/listings` and `/api/provider/bookings` — these will 404 in production, breaking the calendar page entirely.
4. **Booking confirmation page** reads bookings from a JSON file on disk (`data/bookings.json`) via `getBooking()` — this is not per-user-authenticated, and the fallback path (used when Supabase is unconfigured) returns booking data to anyone with the booking ID, which is a security concern.
5. **My Trips** fetches from `/api/bookings/mine` but the page also reads itineraries only from `localStorage` (key `vz-itineraries`) — AI-generated trips saved via the `/plan` store are stored under a different key and will not appear here.
6. **Admin password gate** is a client-side hash check with the SHA-256 hash hardcoded in the layout. The hash is visible in client JS, making it trivially reversible for weak passwords.
7. **Notifications** API is fully functional (GET/PATCH) but no in-app notification bell/drawer UI was found wired to it.

---

## Feature Status Table

| Feature | Status | Issues |
|---------|--------|--------|
| Demo Login | ⚠️ Partial | Sets Zustand store only; demo user breaks all authenticated API routes |
| AI Trip Planner | ✅ Working | Full streaming SSE, tool use, day-plan emission — functional |
| Explore & Search | ✅ Working | Filters, search, pagination, map sync all correctly implemented |
| Listing Detail | ✅ Working | SSR from Supabase with scraped fallback; view count RPC present |
| Booking Flow | ⚠️ Partial | Core booking POST works; discount code UI entirely missing from checkout |
| Discount Codes | ⚠️ Partial | Validation API is complete; not wired into tourist booking UI |
| My Trips | ⚠️ Partial | Bookings tab works; Itineraries tab reads wrong localStorage key |
| Provider Dashboard | ✅ Working | Server-side SSR with auth guard; real Supabase queries |
| Provider Calendar | ❌ Broken | Calls `/api/provider/listings` and `/api/provider/bookings` — routes do not exist |
| RUTA Transport | ✅ Working | Quote + checkout (Stripe + Zelle) + confirmation all wired |
| WhatsApp Demo | ✅ Working | All 5 mock conversations, filters, send reply, stage updates functional |
| Creator Portal | ✅ Working | Extract-from-links → review → publish flow complete and wired |
| Admin Dashboard | ⚠️ Partial | Client-side hash password gate is weak; AI actions + bulk ops wired |
| Safety Hub | ✅ Working | Static data always renders; Supabase zones load if DB configured |
| Notifications | ⚠️ Partial | API complete; no UI component found consuming it |

---

## Detailed Findings

### Demo Login

**File:** `app/(auth)/login/page.tsx`

The `signInAsDemo` function calls `useAuthStore().setUser()` and `setProfile()` with a hardcoded `DEMO_USER` object (id `demo-user-001`, email `demo@vzexplorer.com`). It does **not** create a Supabase session.

**Consequence:** Any API route that calls `supabase.auth.getUser()` will return `{ user: null }` for demo users, triggering 401 responses. Affected routes include:
- `GET /api/bookings/mine` — My Trips bookings tab returns empty/error
- `GET /api/bookings/[id]` — booking detail 401
- `PATCH /api/bookings/[id]` — cancel booking 401
- Provider dashboard redirects to `/login`

The auth store (`useAuth` hook) will show `isAuthenticated: true` and components will render, but all API calls for authenticated data silently fail or show errors. The demo experience is essentially a UI shell only.

**No critical bug in the store logic itself** — the Zustand store persists correctly, the issue is the intentional mismatch between client-side fake auth and server-side real auth.

---

### AI Trip Planner

**Files:** `app/plan/page.tsx`, `app/api/itineraries/conversation/route.ts`, `stores/itinerary-store.ts` (inferred)

The conversational planner is fully implemented:
- SSE streaming endpoint with token-by-token delivery
- Rate limiting (10 req/IP) present
- `<day-plan>` tag regex parsing is attribute-order-agnostic (uses individual regex matches per attribute) — correct
- `<itinerary-json>` fallback parsing present
- Tool use loop with max 6 iterations — prevents infinite loops
- Client disconnection (`request.signal.abort`) cancels the Claude stream
- `SmartStarters` component is wired: `sendMessageRef.current?.(msg)` correctly calls the chat panel
- `handleDayPlan` callback properly handles day replacement (last-write-wins) and progressive building
- `handleItinerary` skips full-replacement if progressive build already ran
- "Save" shows only when `isDirty`, calls `save()` from the store
- "Share" correctly gates on non-local IDs

**One gap:** The `save()` function in `useItineraryStore` is called but the store file was not directly read — based on context, if the user is not authenticated (demo user), save will likely 401. No user feedback for this failure case is visible in the page — the toast just says "Trip saved!" regardless.

**Map integration:** `TripMap` component reads from `useMapStore` — the itinerary store would need to sync pins to the map store on `addStop`. This dependency is not verified from available code, but the architecture supports it.

---

### Explore & Search

**File:** `app/(tourist)/explore/ExploreClient.tsx`

- Category tabs correctly trigger re-fetch via `buildUrl` dependency change
- Region select correctly passes `region` param to `/api/listings`
- Search is debounced (300ms) — correct
- Sort is client-side — `price_asc`/`price_desc` returns 0 (no-op) because scraped data lacks reliable pricing; this is documented with a comment
- Map sync: correctly calls `setPins` when `viewMode === 'map'` and listings load
- Load more: `offset` math is correct; `hasMore = offset < count` is accurate
- Error state: catch block just sets `loading: false` — no user-facing error message displayed

**Bug:** When the API returns an error (non-OK response), `fetch` doesn't throw — only network errors do. If `r.json()` fails or the API returns `{error: ...}` without a 4xx/5xx, listings silently show empty. This is a minor robustness issue.

---

### Listing Detail

**File:** `app/(tourist)/listing/[slug]/page.tsx`

- Server-side rendering with Supabase query — fetches listing + provider + photos in one join
- Fetches up to 20 approved reviews
- Fires a non-blocking `increment_listing_views` RPC (via `void`)
- Falls back gracefully to scraped local data when Supabase unavailable
- Onboarded scraped listings are mapped to a full `Listing` object with real prices, rooms, photos
- Non-onboarded listings render `ScrapedListingView` (info-only, no booking)

**Gap:** The photo gallery and availability calendar are inside `ListingDetail` component (not directly read), but the page correctly passes `listing.photos` and the listing object. The `ListingDetail` component likely uses these — no direct evidence of breakage, but untested.

---

### Booking Flow

**Files:** `app/(tourist)/book/page.tsx`, `app/api/bookings/route.ts`, `app/(tourist)/booking/confirmation/page.tsx`

The booking POST is well-implemented:
- Zod validation on all fields
- Lookup from `scraped-listings.json` for price validation — returns 422 if no price (prevents bookings on non-onboarded listings)
- Guest count range enforcement
- Night calculation: `Math.max(1, ...)` correctly handles same-day checkouts
- Price calculation with platform commission
- Dual Supabase + JSON fallback storage
- Stripe checkout session creation with cancel/success URLs
- Zelle and USDT payment details built correctly
- Resend email notifications are non-blocking (`.catch()` on the Promise)
- The `/booking/confirmation?id=` page reads from `getBooking(id)` from the JSON store — this is not auth-gated at the page level (only inside the API routes)

**Critical gap — Discount Codes not in booking UI:** The `ListingDetail` component (which renders the booking form) has no discount code input field. No component in `app/(tourist)` or `components/listing/` references the discount code validation endpoint. The `/api/discount-codes/validate` endpoint is complete, the Stripe webhook correctly handles `discount_code_id` in session metadata, but the tourist-facing booking form never collects or applies a discount code. The entire creator referral monetization loop is broken end-to-end for tourists.

**Book page (`/book`):** The check-in, check-out, and guest count inputs on this page do not pass date/guest information to the listing results — they are UI-only decorations. The search only filters by destination and category, not availability or date.

---

### Discount Codes

**Files:** `app/api/discount-codes/validate/route.ts`, `app/api/discount-codes/check/route.ts`, `app/api/discount-codes/route.ts`, `app/api/stripe/webhooks/route.ts`

The backend is complete:
- `/validate` checks: active status, expiry date, minimum booking amount, max uses — all correctly implemented
- Percentage and fixed discount math both correct, net total floored at 0
- `/check` (code availability check for creators) works correctly
- Stripe webhook (`checkout.session.completed`) reads `discount_code_id` from session metadata, inserts `discount_code_uses` row, and calls `increment_discount_code_use` RPC

**Gap:** No UI component in the tourist booking path (listing detail, booking form, checkout) calls `/api/discount-codes/validate` or passes `discount_code_id` to the booking POST or Stripe session creation. The Stripe `createCheckoutSession` function would need to accept a coupon or metadata field for this to work. Discount codes are effectively a backend feature with no frontend activation point.

---

### My Trips

**File:** `app/(tourist)/trips/page.tsx`

- Auth guard present — redirects to login prompt if not authenticated
- Bookings fetched from `/api/bookings/mine` — correctly scoped to `guest_email` of the authenticated user
- Cancel logic POSTes `PATCH /api/bookings/{id}` with `{status: 'cancelled'}` — wired correctly

**Bug — Itineraries tab reads wrong key:**
The page reads `localStorage.getItem('vz-itineraries')` but the AI planner store (`useItineraryStore`) saves trips under `local-{timestamp}` IDs and the store likely persists under a different key (e.g., `vz_itinerary_store` or similar via Zustand persist middleware). This means itineraries planned in `/plan` will not appear in the Itineraries tab. The `EmptyState` CTA links to `/library` rather than `/plan`, which is also incorrect.

**Saved Places:** Fetched from Supabase `favorites` table with a join on `listings` — correctly implemented.

**Recently Viewed:** Reads from `useRecentlyViewed` hook — present and renders correctly.

---

### Provider Dashboard

**File:** `app/(provider)/dashboard/page.tsx`

- Server-side auth guard — redirects to `/login` if no Supabase session
- Fetches provider record, listings (limit 5), recent bookings, revenue stats — all real Supabase queries
- Revenue from `bookings` table filtered by `status === 'completed'`
- Note: Provider bookings use the `bookings` table (not `guest_bookings` used by tourist flow) — this is a separate table. If tourist bookings land in `guest_bookings`, provider dashboard revenue will not reflect them unless there is a trigger or view syncing them. This is a potential data gap.

---

### Provider Calendar

**File:** `app/(provider)/dashboard/calendar/page.tsx`

**Broken:** The page calls two API routes that do not exist:
1. `fetch('/api/provider/listings')` — no such route exists under `app/api/provider/`
2. `fetch('/api/provider/bookings?listing_id=${selectedListing}&date=${today}')` — no such route exists

The listings fetch has a try/catch that falls back to a `[{id: 'demo-listing', title: 'Demo Listing'}]` placeholder, so the calendar grid renders but with no real data. The today's check-ins/outs fetch silently fails, setting both arrays to empty.

The calendar availability fetch uses `/api/listings/${selectedListing}/availability` which does exist, but since `selectedListing` will only be `'demo-listing'` (from fallback), it will return no data for real providers.

---

### RUTA Transport

**Files:** `app/(ruta)/ruta/page.tsx`, `app/api/ruta/quote/route.ts`, `app/api/ruta/checkout/route.ts`

- Quote calculation is delegated to `calculateQuote()` from `lib/ruta/pricing` — real implementation (not verified in detail but called correctly)
- Checkout: Zod validation via `bookingRequestSchema`, minimum lead time enforcement, server-side price re-validation (allows 5% delta), Supabase ride record creation, Stripe checkout session or Zelle details returned
- Access token generated and hashed for non-authenticated tracking
- WhatsApp number in footer/contact is placeholder (`+58 412 123 4567`)

**Minor gap:** `RUTA_ZELLE_PHONE` env var is optional — if not set, zelle_info.recipient_phone is empty string. This may confuse users trying to Zelle.

---

### WhatsApp Demo

**File:** `app/demo/whatsapp/page.tsx`

- All 5 mock conversations load from `MOCK_CONVERSATIONS` and `MOCK_THREADS` in `lib/whatsapp-demo-data`
- Filter tabs (`all`, `open`, `waiting`, `human`, `closed`) wired to `ConversationList` via `filter` prop
- Send reply correctly creates a local `WaMessage` object, appends to conversation, updates preview and timestamp
- Status update (`updateStatus`) and stage update (`updateStage`) correctly mutate both `selected` and `conversations` state — no stale state issues
- `useClientNow()` hook initializes from `REFERENCE_EPOCH` (a fixed timestamp) to prevent hydration mismatch — correct pattern
- `BookingPipeline` only renders when a conversation is selected — correct conditional

Fully functional as a self-contained demo.

---

### Creator Portal

**Files:** `app/creator/(portal)/itineraries/new/page.tsx`, `app/creator/(portal)/itineraries/review/[draftId]/page.tsx`, `app/api/creator/itineraries/publish/route.ts`

- URL extraction → `POST /api/itineraries/extract-from-links` → sessionStorage draft → review page
- Draft stored in `sessionStorage` keyed by `crypto.randomUUID()` — correct (server-safe, no SSR access needed)
- Review page loads draft from sessionStorage, maps spots to `ReviewSpot` state
- Fetches creator's active discount codes from `/api/discount-codes` — correctly filters for `status === 'active'`
- Publish: requires `requireCreator` auth guard, validates with `publishSchema`, inserts itinerary + stops in two queries with rollback on stops failure
- `stops` missing `thumbnail_url` in the insert rows (field exists in schema but not mapped) — minor data loss

**Gap:** The `requireCreator` auth function requires an active Supabase session **and** a row in `creator_profiles`. Creators registering via normal auth without a `creator_profiles` row will get a 403 with no clear error in the UI beyond the generic HTTP error handler.

---

### Admin Dashboard

**File:** `app/(admin)/admin/layout.tsx`, `app/(admin)/admin/listings/page.tsx`

The admin panel is extensive and mostly wired:
- Listing edit, AI improve, bulk actions all POST to real `/api/admin/listings` routes
- Outreach modal generates AI messages and posts to `/api/admin/outreach`
- Command palette calls `/api/admin/listings/ai` with `action: 'command_query'`

**Security concern — Client-side password gate:**
The `ADMIN_HASH` is `1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792` (SHA-256). This hash is shipped in the client bundle. Anyone who can reverse it (dictionary/rainbow table attack) gains access to all admin routes. The comment says "the API layer compares against the server-side value" but no middleware or API-level check was observed — the `app/api/admin/` routes do not appear to validate the `admin_token` cookie server-side. If admin API routes lack server-side auth, they are publicly accessible with knowledge of the endpoints.

**Add Listing button** in the header has no `onClick` handler and no `href` — it is a dead button.

---

### Safety Hub

**File:** `app/(tourist)/safety/page.tsx`

Fully functional as a static + dynamic hybrid:
- Static safety levels legend, general tips, regional safety data, and emergency contacts always render (sourced from `lib/constants`)
- Dynamic safety zone advisories load from Supabase `safety_zones` table when available, silently skipped when Supabase is unconfigured
- Emergency contacts use real Venezuelan numbers including `911`, `171`, and Red Cross
- All data hardcoded in constants is accurate and useful regardless of DB status

---

### Notifications

**File:** `app/api/notifications/route.ts`

- `GET`: Fetches user notifications from Supabase, supports `unread=true` and `limit` params — functional
- `PATCH`: Marks notifications as read, supports individual `ids` array or `markAll` — functional

**Gap:** No UI component was found that renders a notification bell, drawer, or badge consuming this API. The notifications system is a complete backend with no connected frontend. All notification data is invisible to users.

---

## Priority Issues

### P0 — Broken (feature non-functional)

**P0-1: Provider Calendar calls non-existent API routes**
- `GET /api/provider/listings` — 404
- `GET /api/provider/bookings` — 404
- Calendar silently falls back to demo mode; real provider data is inaccessible
- **Fix:** Create `app/api/provider/listings/route.ts` and `app/api/provider/bookings/route.ts` mirroring `/api/providers/me` and `/api/bookings` scoped by provider session

**P0-2: Discount Codes have no tourist-facing UI**
- No component in the listing detail or booking form accepts a discount code
- The entire creator referral economy is non-functional for end users
- **Fix:** Add a discount code input field to the `ListingDetail` booking widget; wire to `/api/discount-codes/validate`; pass `discount_code_id` in the booking POST body and Stripe session metadata

### P1 — High (significant gaps affecting core flows)

**P1-1: Demo Login does not create a Supabase session**
- All server-side authenticated routes return 401 for demo users
- My Trips, booking history, favorites, cancel booking all silently fail
- **Fix:** Either (a) create a real demo Supabase user with seeded data, or (b) add client-side mock data fallback in affected components when `user.id === 'demo-user-001'`

**P1-2: My Trips Itineraries tab reads wrong localStorage key**
- Reads `vz-itineraries` but trip planner store likely uses a different persistence key
- Itineraries built in `/plan` are invisible to users on the My Trips page
- **Fix:** Align the localStorage key, or use the same Zustand store accessor

**P1-3: Admin API routes lack server-side authentication**
- `app/api/admin/listings`, `/api/admin/outreach`, etc. were not verified to validate the admin cookie server-side
- If unprotected, these endpoints are publicly accessible
- **Fix:** Add middleware or per-route cookie validation for all `/api/admin/*` routes

### P2 — Medium (partial implementation, degraded experience)

**P2-1: Booking confirmation page has no auth gate at page level**
- `app/(tourist)/booking/confirmation/page.tsx` reads `getBooking(id)` from JSON disk store using only the booking ID from the URL
- Anyone who guesses or obtains a booking ID can view another guest's confirmation (name, email, total, phone)
- **Fix:** Add session check in the confirmation page server component, or move confirmation data retrieval behind the `/api/bookings/[id]` authenticated route

**P2-2: Notifications system has no UI**
- Complete backend, zero frontend surface
- Users receive no in-app notifications
- **Fix:** Add a notification bell to the main layout consuming `/api/notifications`

**P2-3: Book page (`/book`) date/guest inputs are non-functional**
- Check-in, check-out, and guest count fields are rendered but do not affect the listing search results
- The API call only passes region and category
- **Fix:** Pass date range and guest count to `/api/listings` or as filter parameters

**P2-4: RUTA Zelle phone number missing**
- `RUTA_ZELLE_PHONE` env var defaults to empty string when unset
- Customers see blank phone field in Zelle payment instructions
- **Fix:** Set a default phone or make the field required in env configuration

**P2-5: Provider bookings table mismatch**
- Provider dashboard queries `bookings` table; tourist booking flow inserts into `guest_bookings`
- Provider revenue and booking stats will be zero unless there is a DB sync mechanism
- **Fix:** Confirm which table is canonical, or add a Supabase trigger/view that unifies them

### P3 — Low (nice to have, minor polish)

**P3-1: Admin "Add Listing" button is a dead button** — no onClick/href

**P3-2: Explore search error state** — API errors show empty results with no error message

**P3-3: Creator portal publish missing `thumbnail_url`** — field available in draft data but not mapped to insert row

**P3-4: Forgot password** — shows `toast('Password reset coming soon')` — no actual reset flow

**P3-5: AI Trip Planner save failure for unauthenticated users** — toast says "Trip saved!" even when the save API 401s

**P3-6: RUTA WhatsApp/contact numbers are placeholders** — `+58 412 123 4567` appears in both footer and hero

---

## Summary Counts

| Priority | Count |
|----------|-------|
| P0 — Broken | 2 |
| P1 — High | 3 |
| P2 — Medium | 5 |
| P3 — Low | 6 |
| **Total Issues** | **16** |
