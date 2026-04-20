# Master Issue Registry — VZ Explorer Production QA
**Date:** 2026-04-20
**Reports Consolidated:** 15 (Waves 1–3: F1, F2, F3, F4, D1, D2, D3, D4, D5, D6, D6b, D7, A1, A2, A3)
**Total Issues:** 127
**P0:** 22 | **P1:** 43 | **P2:** 40 | **P3:** 22

---

## WHAT'S WORKING WELL

The following patterns were confirmed solid by multiple agents — preserve these:

- **Availability calendar** — custom-built, per-day dynamic pricing, range hover preview, ARIA grid. Production quality. (D2, A3)
- **Stripe + RUTA webhook signature verification** — correctly implemented HMAC-SHA256 with `timingSafeEqual`. (F3, D6b)
- **WhatsApp HMAC-SHA256 webhook verification** — correctly implemented with raw body + timing-safe compare. (F3, D6b)
- **Zustand store hydration** — `skipHydration: true` + `StoreHydration` component avoids SSR mismatches. (F2)
- **AI trip planner streaming UX** — SSE, tool-use loop, abort on disconnect, `<day-plan>` tag parsing. (D7)
- **Auth modal focus trap** — production-quality accessibility implementation. (D3, A3)
- **QR code + ICS download on confirmation** — practical for connectivity-challenged destination. (D2, A3)
- **Provider dashboard auth guard** — correctly server-side via `getUser()` + role check. (F2)
- **Category/region hero pages** — editorial quality, ISR-cached. (D1)
- **Zelle/USDT payment options** — appropriate for Venezuela market. (D2, A3)
- **Safety integration** — SafetyBadge throughout, safety zones in browse. Unique among competitors. (A3)
- **TypeScript compiles clean** — `tsc --noEmit` exits 0, no compiler errors. (F1)
- **WhatsApp rate-limit dedup** — `wa_message_id` uniqueness check prevents double-processing. (D6b, A2)

---

## P0 — CRITICAL (fix before any deployment)

### [SECURITY]

**P0-SEC-001** | Agents: F2, F3, D5, D7, A1 (5)
**Title:** Admin SHA-256 password hash hardcoded in client JS bundle — UI bypass trivial
**File:** `app/(admin)/admin/layout.tsx:29`
**Fix:** Remove `ADMIN_HASH` from client bundle; move admin auth to Next.js middleware or a server component that validates `process.env.ADMIN_PASSWORD` server-side; never ship a hash client-side.

**P0-SEC-002** | Agents: F3, D5 (2)
**Title:** Hardcoded PMS bridge secret fallback `'vav-bridge-dev-secret-2026'` committed to source
**File:** `app/api/pms/[...path]/route.ts:6`
**Fix:** Remove the `|| 'vav-bridge-dev-secret-2026'` fallback; throw an error at startup if `PMS_BRIDGE_SECRET` is not set.

**P0-SEC-003** | Agents: F2, F3, A2 (3)
**Title:** `POST /api/bookings` has no auth guard — anonymous users can create unlimited bookings and trigger confirmation emails to arbitrary addresses
**File:** `app/api/bookings/route.ts:79`
**Fix:** Add `createClient()` + `getUser()` auth check at the start of the POST handler, matching the GET handler pattern at line 43–52.

**P0-SEC-004** | Agents: F2, F3 (2)
**Title:** `POST /api/stripe/checkout` accepts any bookingId without verifying caller ownership
**File:** `app/api/stripe/checkout/route.ts:24`
**Fix:** Add auth check; verify `booking.guest_email === user.email` before creating the Stripe checkout session.

**P0-SEC-005** | Agents: F1, F3 (2)
**Title:** Live API keys (Anthropic, Groq, WhatsApp, Supabase service-role) present in `.env.local` — verify not committed to git
**File:** `/Users/tomas/VZ_Tourism_Project/.env.local`
**Fix:** Confirm `.env.local` is in `.gitignore`; check git history for accidental commits; rotate all four keys if any doubt exists.

**P0-SEC-006** | Agents: F4, A2 (2)
**Title:** Hardcoded `prov_001` provider ID in live payout and settings routes — financial data of `prov_001` exposed to any admin-cookie holder
**File:** `app/api/payouts/route.ts:21`, `app/api/provider-settings/route.ts:43,60`, `app/(provider)/dashboard/payouts/page.tsx:37`
**Fix:** Derive `providerId` from the authenticated Supabase session (`getUser()` + providers table lookup) in all three files; remove the TODO fallback.

**P0-SEC-007** | Agents: A1 (1)
**Title:** No `middleware.ts` — protected routes have no global auth enforcement; new routes default to public
**File:** (missing file: `middleware.ts`)
**Fix:** Create `middleware.ts` using `@supabase/ssr` to enforce session checks for `/(provider)/*`, `/(admin)/*`, `/(ruta)/*` route groups and redirect to `/login` on failure.

### [BOOKING]

**P0-BOK-001** | Agents: A1, A2 (2)
**Title:** `guest_bookings` vs `bookings` table split — tourist bookings NEVER appear in provider dashboard (zero bookings, zero revenue visible to all providers)
**File:** `app/api/bookings/route.ts` (writes `guest_bookings`), `app/(provider)/dashboard/page.tsx` and all provider data pages (read `bookings`)
**Fix:** Add a Supabase trigger syncing `guest_bookings` inserts into `bookings`, or unify to one table, or update all provider dashboard queries to read from `guest_bookings`.

**P0-BOK-002** | Agents: D2, D7, A3 (3)
**Title:** Discount code UI does not exist in the tourist-facing booking form — entire creator referral economy is non-functional
**File:** `components/listing/BookingForm.tsx` (no discount input), `app/api/discount-codes/validate/route.ts` (functional backend)
**Fix:** Add a collapsible "Have a promo code?" input at the Review or Payment step; POST to `/api/discount-codes/validate`; pass `discount_code_id` in booking POST body and Stripe session metadata.

**P0-BOK-003** | Agents: A2 (1)
**Title:** Provider dashboard shows ALL guest bookings (no scoping) — any authenticated provider sees all guests' PII (name, email, phone, confirmation codes)
**File:** `app/(provider)/dashboard/bookings/page.tsx:97`
**Fix:** Replace `getAllBookings()` with a scoped query that filters bookings where `listing.provider_id = authenticated_provider.id`.

**P0-BOK-004** | Agents: A2 (1)
**Title:** Provider booking PATCH ownership check is inverted — `guest_email !== user.email` blocks providers from confirming/cancelling any booking; all provider actions silently 401
**File:** `app/api/bookings/[id]/route.ts:121`
**Fix:** Add a separate provider-auth path that checks `listing.provider_id === authenticated_provider.id` when the caller role is `provider`.

**P0-BOK-005** | Agents: D7, A1 (2)
**Title:** Provider Calendar calls two non-existent API routes — all providers see only "Demo Listing" placeholder
**File:** `app/(provider)/dashboard/calendar/page.tsx` (calls `/api/provider/listings` and `/api/provider/bookings` — both 404)
**Fix:** Create `app/api/provider/listings/route.ts` and `app/api/provider/bookings/route.ts` scoped to authenticated provider session.

### [TOURIST]

**P0-TRS-001** | Agents: D2 (1)
**Title:** All scraped listing images broken — old Google Places API format with exposed API key; every scraped listing shows "Image unavailable" placeholder
**File:** `data/scraped-listings.json` (5,394 old-format `photo_reference` URLs); `components/common/ImageGallery.tsx`
**Fix:** Migrate photo references to the new Places v1 format and route through `/api/places/photo` proxy, or replace with Unsplash/Cloudinary-hosted images for scraped listings; rotate the exposed `AIzaSy...` key in `data/scraped-listings.json`.

**P0-TRS-002** | Agents: A1, A3 (2)
**Title:** Review write form is never shown — `canReview` prop hardwired to `undefined` for all listings; no tourist can write a review
**File:** `app/(tourist)/listing/[slug]/page.tsx` (never passes `canReview`), `components/listing/ListingDetail.tsx:197`
**Fix:** In the listing server component, query `guest_bookings` for `{guest_email, listing_id, status: 'completed'}`; pass `canReview={true}` and `bookingId` when found.

### [PROVIDER]

**P0-PRV-001** | Agents: D4 (1)
**Title:** Provider listing edit — `Select` components do not show existing category/region values; saving without touching them clears the fields
**File:** `app/(provider)/dashboard/listings/[id]/edit/page.tsx:149–162`
**Fix:** Use controlled `Select` with `defaultValue` populated from `reset(json.data)`, or switch to controlled `value` prop tied to form state.

**P0-PRV-002** | Agents: D4 (1)
**Title:** No photo upload UI anywhere in listing create or edit workflow — all listings are photo-less
**File:** `app/(provider)/dashboard/listings/new/page.tsx:31` (photos: []), `edit/page.tsx`
**Fix:** Add a photo upload section using the existing `/api/upload` route with file picker, drag-and-drop, and preview; wire to the existing `photos: []` field.

**P0-PRV-003** | Agents: D4 (1)
**Title:** `window.location.reload()` in ProviderBookingActions on every confirm/cancel action — catastrophic UX, full page flash and scroll reset
**File:** `components/provider/ProviderBookingActions.tsx:49`
**Fix:** Replace `window.location.reload()` with `router.refresh()` (Next.js App Router) or optimistic state update.

### [INFRA]

**P0-INF-001** | Agents: F1 (1)
**Title:** Test suite broken — 57 failures across 10 suites; `createServiceClient is not a function` in all integration tests; coverage unmeasurable
**File:** `__tests__/integration/api/` (all 8 suites), `__tests__/unit/api/discount-codes.test.ts`
**Fix:** Fix the Jest mock for `lib/supabase/server.ts` to correctly export `createServiceClient` as a named function; verify mock is applied globally in `jest.config.ts`.

**P0-INF-002** | Agents: F4, A2 (2)
**Title:** Dual `BookingStatus` type — `'payment_submitted'` (file store) vs `'refunded'` (DB type) creates silent type mismatches across the platform
**File:** `types/database.ts:3`, `lib/bookings-store.ts:4`, `types/api.ts`
**Fix:** Reconcile into one canonical `BookingStatus` type; add `'payment_submitted'` to `types/database.ts` and remove the divergent definition in `bookings-store.ts`.

### [ADMIN]

**P0-ADM-001** | Agents: D5, D7 (2)
**Title:** Admin "Add Listing" button in header has no `onClick` handler — primary admin CTA is non-functional
**File:** `app/(admin)/admin/listings/page.tsx:1381`
**Fix:** Add `onClick` handler that opens the existing listing creation modal or navigates to the create form.

### [RUTA]

**P0-RTA-001** | Agents: D5 (1)
**Title:** RUTA dispatch uses `window.alert()` for error states — blocks UI thread, inaccessible, unprofessional in ops dashboard
**File:** `app/(ruta)/ruta/dispatch/page.tsx:85,99`
**Fix:** Replace all `alert()` / `confirm()` calls with in-context toast notifications or confirmation dialogs using shadcn `AlertDialog`.

**P0-RTA-002** | Agents: D5 (1)
**Title:** RUTA dispatch has no real-time updates — dispatchers act on stale data; no polling, WebSocket, or refresh button
**File:** `app/(ruta)/ruta/dispatch/page.tsx`
**Fix:** Add Supabase realtime subscription on the `ruta_rides` table, or implement 30-second polling with a visible "Last updated" indicator.

---

## P1 — HIGH PRIORITY (fix this week)

### [SECURITY]

**P1-SEC-001** | Agents: F2, F3, D6b (3)
**Title:** In-memory rate limiters are per-serverless-instance and reset on cold start — effective rate limit is zero in production
**File:** `lib/api/rate-limit.ts`, `app/api/whatsapp/webhook/route.ts:39–51`
**Fix:** Replace module-level `Map`-based rate limiting with an Upstash/Redis-backed rate limiter (e.g., `@upstash/ratelimit`) keyed on IP + endpoint.

**P1-SEC-002** | Agents: F3 (1)
**Title:** `/api/places/autocomplete` and `/api/ruta/geocode` proxy Google Places API with no rate limiting — cost exposure
**File:** `app/api/places/autocomplete/route.ts`, `app/api/ruta/geocode/route.ts`
**Fix:** Apply `rateLimit(getClientIp(request), 30)` from `lib/api/rate-limit`; hardcode `country = 'VE'` in geocode to prevent quota abuse.

**P1-SEC-003** | Agents: F3 (1)
**Title:** `/api/whatsapp/send` has no rate limiting — compromised provider account can spam guests at unlimited rate
**File:** `app/api/whatsapp/send/route.ts`
**Fix:** Apply per-provider rate limit (e.g., 60 messages/hour) using the same rate-limit library.

**P1-SEC-004** | Agents: F3 (1)
**Title:** Upload endpoint accepts arbitrary Supabase bucket names from user input
**File:** `app/api/upload/route.ts:13`
**Fix:** Whitelist allowed buckets: `const ALLOWED_BUCKETS = ['listings', 'avatars', 'itineraries']; const bucket = ALLOWED_BUCKETS.includes(requested) ? requested : 'listings';`

**P1-SEC-005** | Agents: A1 (1)
**Title:** No HTTP security headers — no `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`, or `Permissions-Policy`
**File:** `next.config.ts` (missing `headers()` config)
**Fix:** Add `async headers()` to `next.config.ts` with standard security headers for all routes.

**P1-SEC-006** | Agents: F3 (1)
**Title:** `STRIPE_WEBHOOK_SECRET` used with `!` non-null assertion — missing env var causes unhandled runtime exception instead of graceful 503
**File:** `lib/stripe/server.ts:77`
**Fix:** Add an explicit check `if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({error:'Not configured'}, {status:503})` before use.

### [BOOKING]

**P1-BOK-001** | Agents: D2, A1 (2)
**Title:** Mobile booking CTA buried below the fold on all mobile devices — no sticky bottom bar
**File:** `components/listing/ListingDetail.tsx:207`
**Fix:** Add a `fixed bottom-16 left-0 right-0 z-30` booking bar on mobile showing price + "Reserve" button that scrolls to/opens the booking form; use `lg:hidden` to hide on desktop.

**P1-BOK-002** | Agents: D2, D7 (2)
**Title:** Pending and `payment_submitted` bookings invisible in My Trips "Upcoming" tab
**File:** `app/(tourist)/trips/page.tsx:249–251`
**Fix:** Change `upcoming` filter to include `status === 'pending'` and `status === 'payment_submitted'` in addition to `'confirmed'`.

**P1-BOK-003** | Agents: D2, A3 (2)
**Title:** No "View my trips" CTA on booking confirmation page — users abandoned after payment
**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx`
**Fix:** Add `<Button asChild><Link href="/trips">View my trips</Link></Button>` as the primary post-booking CTA alongside "Explore more".

**P1-BOK-004** | Agents: A2 (1)
**Title:** No availability check before booking creation — two guests can double-book the same listing for overlapping dates
**File:** `app/api/bookings/route.ts` (entire POST handler)
**Fix:** Before inserting, query `guest_bookings` for overlapping confirmed bookings on the same `listing_id` and date range; return 409 Conflict if found.

**P1-BOK-005** | Agents: A2 (1)
**Title:** Provider cancels confirmed booking — no Stripe refund initiated and no email sent to guest
**File:** `components/provider/ProviderBookingActions.tsx`
**Fix:** In the provider cancel handler, call `stripe.refunds.create({payment_intent: booking.payment_intent_id})` and send a cancellation email via Resend before updating status.

**P1-BOK-006** | Agents: A1, A2 (2)
**Title:** Stripe checkout fallback path (`/api/stripe/checkout`) only reads from file-store — Supabase-stored bookings return 404 on payment retry; user permanently stuck
**File:** `app/api/stripe/checkout/route.ts`
**Fix:** When `getBooking()` returns null, fall through to a Supabase `guest_bookings` query by ID before returning 404.

**P1-BOK-007** | Agents: A2 (1)
**Title:** `$0` checkout via 100% discount code crashes Stripe session creation with unhandled error
**File:** `app/api/stripe/checkout/route.ts:47`
**Fix:** Check `if (chargeAmount === 0)` and either create a free order without Stripe, or return a dedicated 200 response marking the booking as confirmed without payment.

**P1-BOK-008** | Agents: A2 (1)
**Title:** No idempotency key on booking POST — failed mid-flight creates orphaned `pending` bookings; retry creates duplicate bookings
**File:** `app/api/bookings/route.ts`
**Fix:** Accept an `idempotency_key` in the booking POST body; check for existing bookings with the same key before creating a new record.

### [AUTH]

**P1-AUT-001** | Agents: D3, A1 (2)
**Title:** No password reset flow — "Forgot password?" fires a toast; users permanently locked out
**File:** `app/(auth)/login/page.tsx:165`
**Fix:** Create `app/(auth)/forgot-password/page.tsx` that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` and shows a "Check your email" confirmation screen.

**P1-AUT-002** | Agents: D3 (1)
**Title:** No post-registration email verification UX — UI immediately redirects to `/` after `signUp()` claiming success; users expect to be logged in but aren't verified
**File:** `app/(auth)/register/page.tsx:70–72`
**Fix:** After `signUp()` succeeds, show a success screen: "Check your email — click the verification link to activate your account." Do not `router.push('/')` immediately.

**P1-AUT-003** | Agents: D3 (1)
**Title:** Provider DB insert failure silently swallowed — auth account created, `providers` row missing, success toast shown; data corruption
**File:** `app/(auth)/provider-register/page.tsx:65–79`
**Fix:** Check `if (providerError)` and show an inline error state with a "Retry" button rather than logging and proceeding; roll back the auth user if provider insert fails.

**P1-AUT-004** | Agents: D3, D7, A1 (3)
**Title:** Demo persona name is "Tomas Demo" — developer's real first name visible to all production users who try the demo
**File:** `app/(auth)/login/page.tsx:23`, `components/common/AuthModal.tsx:21`
**Fix:** Replace `full_name: 'Tomas Demo'` with a neutral persona: `'Demo Traveler'` or `'Alex Demo'`.

**P1-AUT-005** | Agents: D3 (1)
**Title:** Messages page — null `provider_phone` produces invalid WhatsApp URL `https://wa.me/?text=...`
**File:** `app/(tourist)/messages/page.tsx:29–30`
**Fix:** Disable (or hide) the "Message Host" button when `provider_phone` is null; show a "Host contact not available" state.

**P1-AUT-006** | Agents: D3 (1)
**Title:** Messages page — unauthenticated user causes `fetching` spinner to show forever (state deadlock)
**File:** `app/(tourist)/messages/page.tsx:39–45`
**Fix:** In the `if (!isAuthenticated) return;` early return, also call `setFetching(false)` to release the spinner state.

**P1-AUT-007** | Agents: D3 (1)
**Title:** No password change option in Account Settings — users who signed up with email/password have no self-service path
**File:** `app/(tourist)/account/page.tsx`
**Fix:** Add a "Change password" section that calls `supabase.auth.updateUser({ password })` after re-authentication.

### [TOURIST]

**P1-TRS-001** | Agents: D1, A3 (2)
**Title:** Map page outside tourist layout — no mobile navigation bar; mobile users are stranded with no nav
**File:** `app/map/page.tsx` (outside `(tourist)` layout group)
**Fix:** Move `/map` inside the `(tourist)` layout group, or duplicate the `MobileTabBar` and `Navbar` into the map page.

**P1-TRS-002** | Agents: D1 (1)
**Title:** Discover "Add to Trip" button permanently invisible on touch/mobile — `opacity: hovered ? 1 : 0` with no touch affordance
**File:** `app/(tourist)/discover/DiscoverGrid.tsx:193`
**Fix:** Show the "Add to Trip" button unconditionally on touch devices using `@media (hover: none)` or by detecting touch capability; use `focus-visible` to show on keyboard focus.

**P1-TRS-003** | Agents: D1 (1)
**Title:** Guide article "Read guide" links are dead ends — ArrowRight icon but no `href` or `Link` wrapper
**File:** `app/(tourist)/explore/category/[slug]/page.tsx:186–220`
**Fix:** Wrap guide cards in `<Link href="/library/[slug]">` or the appropriate route; create the guide detail routes if they don't exist.

**P1-TRS-004** | Agents: D1 (1)
**Title:** Price sort options ("Price: low to high" / "Price: high to low") shown in UI but return no-op — non-functional UI controls
**File:** `app/(tourist)/explore/ExploreClient.tsx:73–74, 180`
**Fix:** Remove the non-functional sort options from the select menu until reliable price data is available, or implement the sort against `price_usd` for onboarded listings.

**P1-TRS-005** | Agents: D1 (1)
**Title:** FilterOverlay region badges not keyboard-activatable — `Badge` renders as `<span>`, not interactive
**File:** `app/(tourist)/explore/FilterOverlay.tsx:83`
**Fix:** Replace `<Badge onClick>` with `<button>` or `<Badge asChild><button>`.

**P1-TRS-006** | Agents: D1 (1)
**Title:** FilterOverlay safety level filter uses color only for active state — WCAG 1.4.1 violation
**File:** `app/(tourist)/explore/FilterOverlay.tsx:131`
**Fix:** Add an icon (e.g., `CheckCircle`) alongside the color change for the active state per DESIGN.md rule.

**P1-TRS-007** | Agents: A1 (1)
**Title:** Missing `sitemap.ts` and `robots.txt` — 1,170+ listing pages uncrawlable; admin/dashboard routes being indexed
**File:** (missing `app/sitemap.ts`, `app/robots.ts`)
**Fix:** Create `app/sitemap.ts` generating listing + category + region URLs dynamically; create `app/robots.ts` disallowing `/admin`, `/dashboard`, `/demo`, `/api`.

**P1-TRS-008** | Agents: A1 (1)
**Title:** No JSON-LD structured data on listing pages — zero rich results (star ratings, price) in Google search
**File:** `app/(tourist)/listing/[slug]/page.tsx`
**Fix:** Add `LodgingBusiness` or `TouristAttraction` JSON-LD `<script>` tag in `generateMetadata`/page head using listing data.

**P1-TRS-009** | Agents: A1 (1)
**Title:** `skip to content` `<a href="#main">` in root layout has no matching `id="main"` target — keyboard/screen reader shortcut broken
**File:** `app/layout.tsx:52`, all layout files missing `id="main"`
**Fix:** Add `id="main"` to the main content wrapper in `app/(tourist)/layout.tsx`, `app/(provider)/dashboard/layout.tsx`, and root layout.

**P1-TRS-010** | Agents: D1 (1)
**Title:** Map pin touch target is 16px (visual diameter) — fails 44px WCAG minimum; pins untappable on mobile
**File:** `components/map/MapContainer.tsx:177`
**Fix:** Add a transparent hit-area circle layer on top: `circle-radius: 22, circle-opacity: 0` to expand the tap target without changing visual appearance.

### [PROVIDER]

**P1-PRV-001** | Agents: D4 (1)
**Title:** Analytics "estimated views" = `bookings.length * 4.2` displayed as real data — fabricated metric misleads providers
**File:** `app/(provider)/dashboard/analytics/page.tsx:81`
**Fix:** Remove the fabricated metric entirely, or label it explicitly "Estimated (based on booking volume)" with a tooltip explaining the formula; wire Vercel Analytics to collect real view data.

**P1-PRV-002** | Agents: D4 (1)
**Title:** No `loading.tsx` per sub-route in provider dashboard — 9 sub-pages show blank white screen during data fetch
**File:** `app/(provider)/dashboard/` (missing `loading.tsx` in bookings, analytics, revenue, payouts, guests, marketing, settings, listings, calendar)
**Fix:** Create a shared `app/(provider)/dashboard/loading.tsx` skeleton that matches the general layout; or add per-page loading states.

**P1-PRV-003** | Agents: A1 (1)
**Title:** `useRealtimeNotifications` and `useRealtimeBookings` hooks exist but are consumed by zero components — providers never notified of new bookings
**File:** `hooks/use-realtime.ts` (exports unused), `app/(provider)/dashboard/`
**Fix:** Wire `useRealtimeBookings` in the provider dashboard layout to show a badge on the Bookings nav item; add notification bell with `useRealtimeNotifications`.

**P1-PRV-004** | Agents: D4 (1)
**Title:** AI Brain sections — collapsing an edited section without saving silently discards all changes (no dirty flag, no unsaved-changes warning)
**File:** `app/(provider)/dashboard/messages/brain/page.tsx`
**Fix:** Add a `isDirty` flag per section; show a "You have unsaved changes" warning before collapse; or implement auto-save on accordion close.

### [INFRA]

**P1-INF-001** | Agents: F1, F4 (2)
**Title:** `loadDrivers`/`loadVehicles` called before declaration in RUTA dispatch — `react-hooks/immutability` error; potential React Compiler breakage
**File:** `app/(ruta)/ruta/dispatch/drivers/page.tsx:31`, `vehicles/page.tsx:29`
**Fix:** Convert to `useCallback` and move declarations above the `useEffect` that calls them.

**P1-INF-002** | Agents: F4 (1)
**Title:** Missing `not-found.tsx` — invalid URLs return HTTP 200 with error UI; damages SEO (soft 404s indexed by Google)
**File:** (missing `app/not-found.tsx`)
**Fix:** Create `app/not-found.tsx` with a friendly "Page not found" UI, navigation back to explore, and correct HTTP 404 status.

**P1-INF-003** | Agents: A1 (1)
**Title:** No Privacy Policy, Terms of Service, or Cookie Consent — Stripe merchant requirement; GDPR/data law exposure; registration form ToS links are dead `href="#"`
**File:** `app/(auth)/register/page.tsx:205,207`, `app/(auth)/provider-register/page.tsx:207,209`
**Fix:** Create `app/legal/privacy/page.tsx` and `app/legal/terms/page.tsx` with at minimum placeholder content; add a cookie consent banner; update all `href="#"` links.

**P1-INF-004** | Agents: A1 (1)
**Title:** No OG image configured — all social share previews are imageless (text only)
**File:** `app/layout.tsx` (missing `openGraph.image`)
**Fix:** Create `app/opengraph-image.tsx` with branded default; include `listing.cover_image_url` in `generateMetadata` for listing pages.

### [WHATSAPP]

**P1-WAS-001** | Agents: D6b (1)
**Title:** No confirmation before closing a conversation or resuming AI mode — accidental destructive mode changes in production
**File:** `components/whatsapp/BookingPipeline.tsx:99–104`
**Fix:** Add `AlertDialog` confirmation for the `closed` mode button and for switching back to `ai` mode when current status is `human`.

**P1-WAS-002** | Agents: D6b (1)
**Title:** WhatsApp demo page mobile layout completely broken — three fixed-width columns with no responsive breakpoints overflow horizontally
**File:** `app/demo/whatsapp/page.tsx:108–137`
**Fix:** Implement responsive column collapse: mobile shows ConversationList → tap opens thread view → BookingPipeline becomes a bottom sheet.

**P1-WAS-003** | Agents: A2 (1)
**Title:** Groq timeout → guest receives no reply and no fallback message; `processInbound` catch only logs
**File:** `lib/whatsapp-ai.ts:197–218`, `app/api/whatsapp/webhook/route.ts`
**Fix:** In the `processInbound` catch block, send a fallback message to the guest: "We're experiencing a brief delay. A team member will respond shortly." before escalating.

### [RUTA]

**P1-RTA-001** | Agents: D5 (1)
**Title:** RUTA `lang` attribute not updated on locale change — screen readers mispronounce all non-English content when language is switched
**File:** `lib/ruta/i18n.tsx`
**Fix:** Add `document.documentElement.lang = locale` in the locale change handler.

**P1-RTA-002** | Agents: D5 (1)
**Title:** Selected pickup/dropoff location shows raw lat/lng coordinates (`10.6035, -66.9736`) instead of resolved address
**File:** `components/ruta/BookingForm.tsx`
**Fix:** Store and display the address string from the geocode response alongside the coordinates; show the address string in the confirmation UI.

---

## P2 — MEDIUM (fix this sprint)

### [SECURITY]

**P2-SEC-001** | Agents: F3 (1)
**Title:** `successUrl`/`cancelUrl` in `/api/stripe/checkout` accepted from client — potential open redirect
**File:** `app/api/stripe/checkout/route.ts:13–17`
**Fix:** Build redirect URLs server-side from `bookingId` and `NEXT_PUBLIC_APP_URL`; do not accept caller-supplied redirect URLs.

**P2-SEC-002** | Agents: F3 (1)
**Title:** Plaintext WhatsApp access token stored as DB fallback when Vault is unavailable — live Meta token in `access_token` column
**File:** `lib/whatsapp/token.ts`, `app/api/whatsapp/config/route.ts:104–128`
**Fix:** Add a warning log and operator-visible alert in the Connection tab when Vault write fails and plaintext fallback is used.

**P2-SEC-003** | Agents: F3 (1)
**Title:** PMS proxy (`/api/pms/[...path]`) forwards path segments without sanitization — potential path traversal to PMS microservice
**File:** `app/api/pms/[...path]/route.ts:131–132`
**Fix:** Validate `path` segments against an allowlist of known PMS routes, or sanitize `..` segments before constructing the proxy URL.

**P2-SEC-004** | Agents: F2 (1)
**Title:** Demo WhatsApp knowledge API (`/api/demo/whatsapp/knowledge`) has no auth — publicly writable via PUT with service client
**File:** `app/api/demo/whatsapp/knowledge/route.ts`
**Fix:** Add a `DEMO_SECRET` env var check, or restrict to `NODE_ENV === 'development'`.

**P2-SEC-005** | Agents: A1 (1)
**Title:** Email delivery may silently fail — `RESEND_FROM_EMAIL` not configured; fallback domain `bookings@vz-tourism.com` likely has no SPF/DKIM
**File:** `app/api/bookings/route.ts` (email sending), `.env.local`
**Fix:** Configure `RESEND_FROM_EMAIL` and `RESEND_NOTIFY_EMAIL` in all environments; verify SPF/DKIM for sending domain in Resend dashboard.

**P2-SEC-006** | Agents: A1, A2 (2)
**Title:** Booking confirmation page has no auth gate — anyone with a booking ID can view another guest's PII (name, email, total, phone)
**File:** `app/(tourist)/booking/confirmation/page.tsx`
**Fix:** Add session check in the confirmation server component; verify `booking.guest_email === user.email` before rendering.

**P2-SEC-007** | Agents: D6b (1)
**Title:** `custom_instructions` injected verbatim into WhatsApp AI system prompt — prompt injection risk from compromised provider
**File:** `lib/whatsapp-ai.ts:127–129`
**Fix:** Strip `[NEEDS_HUMAN:` patterns, role-override sequences, and `##` markers from `custom_instructions`; enforce server-side max 2,000 char limit in the config PUT route.

### [BOOKING]

**P2-BOK-001** | Agents: D2 (1)
**Title:** Raw booking status strings rendered in My Trips (e.g. "payment_submitted") — no human-readable label mapping
**File:** `app/(tourist)/trips/page.tsx:94`
**Fix:** Map `booking.status` to human labels matching the `STATUS_CONFIG` in `bookings/[id]/page.tsx` (e.g., "Payment Sent", "Confirmed", "Cancelled").

**P2-BOK-002** | Agents: D2 (1)
**Title:** No refund estimate shown in trips-list inline cancel flow — users cancel blind
**File:** `app/(tourist)/trips/page.tsx:64–80`
**Fix:** Call `getRefundEstimate(booking)` (already exists in `bookings/[id]/page.tsx`) and display the estimated refund amount in the "Are you sure?" confirmation.

**P2-BOK-003** | Agents: D2 (1)
**Title:** Booking confirmation dates displayed as raw ISO strings (`2026-08-05`) not formatted
**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx:212–219`
**Fix:** Apply `format(parseISO(booking.check_in), 'EEE, MMM d, yyyy')` using `date-fns`.

**P2-BOK-004** | Agents: A1 (1)
**Title:** No booking confirmation email sent to provider — providers only learn of bookings by checking the dashboard
**File:** `app/api/bookings/route.ts`
**Fix:** Add a Resend email to the listing provider's email address alongside the guest confirmation and ops team notification.

**P2-BOK-005** | Agents: A2 (1)
**Title:** Stripe webhook `checkout.session.completed` has no idempotency guard for discount code use — Stripe retry increments `times_used` twice
**File:** `app/api/stripe/webhooks/route.ts:55–61`
**Fix:** Add a unique constraint on `discount_code_uses(booking_id)` or check for existing use record before incrementing.

**P2-BOK-006** | Agents: A2 (1)
**Title:** Discount code race condition on `max_uses = 1` — two concurrent users can both pass validation and both use the code
**File:** `app/api/discount-codes/validate/route.ts:64–69`
**Fix:** Use a database-level `SELECT FOR UPDATE` or an atomic increment RPC for validation to prevent concurrent overuse.

### [AUTH]

**P2-AUT-001** | Agents: D3 (1)
**Title:** Auth layout uses hardcoded `bg-sky-50 to-blue-100` gradient — not DESIGN.md OKLCH tokens
**File:** `app/(auth)/layout.tsx:6`
**Fix:** Replace with `from-background to-muted` or the warm OKLCH palette from DESIGN.md.

**P2-AUT-002** | Agents: D3 (1)
**Title:** Account Settings uses raw `<input>` with hardcoded `focus:ring-sky-500` — not shadcn `<Input>` component; visual inconsistency
**File:** `app/(tourist)/account/page.tsx:164–310` (8 instances)
**Fix:** Replace all raw `<input>` elements with the shadcn `<Input>` component; replace `bg-sky-500` save button with `<Button variant="default">`.

**P2-AUT-003** | Agents: D3 (1)
**Title:** Password/confirm fields in 2-column grid with no responsive breakpoint — ~160px wide on mobile; show/hide eye button overlaps content
**File:** `app/(auth)/register/page.tsx:120`, `provider-register/page.tsx:156`
**Fix:** Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for the password pair and all other 2-col field pairs.

**P2-AUT-004** | Agents: D3 (1)
**Title:** No Google OAuth on registration page — inconsistency with login page's primary CTA
**File:** `app/(auth)/register/page.tsx`
**Fix:** Add "Continue with Google" as the first option on the registration page, same as the login page.

**P2-AUT-005** | Agents: D3 (1)
**Title:** Notifications system (GET/PATCH API complete) has no frontend UI — notification bell/badge/drawer entirely absent
**File:** `app/api/notifications/route.ts` (backend), all layout files (missing bell)
**Fix:** Add a notification bell icon to the `Navbar` and `ProviderSidebar` that shows unread count and opens a notification drawer consuming `/api/notifications`.

**P2-AUT-006** | Agents: A1 (1)
**Title:** No account deletion option — GDPR right to erasure; also required for Stripe merchant compliance
**File:** `app/(tourist)/account/page.tsx`, `app/(provider)/dashboard/settings/page.tsx`
**Fix:** Add "Delete my account" to account settings; call `supabase.auth.admin.deleteUser()` and purge PII from all tables.

### [PROVIDER]

**P2-PRV-001** | Agents: D4 (1)
**Title:** Duplicate `STATUS_CONFIG` object defined identically in 5 files — all use hardcoded Tailwind; drift will occur
**File:** `app/(provider)/dashboard/messages/page.tsx`, `components/whatsapp/ConversationList.tsx`, `components/whatsapp/MessageThread.tsx`, `app/(provider)/dashboard/bookings/page.tsx`, `components/provider/BookingInboxItem.tsx`
**Fix:** Extract to `lib/status-config.ts` using DESIGN.md OKLCH status tokens; import in all five files.

**P2-PRV-002** | Agents: D4 (1)
**Title:** Provider payouts page and settings page `provider_id` hardcoded to `prov_001` — financial data leakage (also P0-SEC-006; this entry tracks the UX fix)
**File:** See P0-SEC-006 for the security fix; additionally update UI to show a loading/error state when `providerId` is not yet resolved.

**P2-PRV-003** | Agents: D4 (1)
**Title:** Overview page "Edit" listing action uses `Eye` icon — misleading (eye = view, not edit)
**File:** `app/(provider)/dashboard/page.tsx:195`
**Fix:** Replace `Eye` icon with `Pencil` or `Edit2` from Lucide.

**P2-PRV-004** | Agents: D4, D7 (2)
**Title:** Provider dashboard queries `bookings` table; tourist booking flow inserts to `guest_bookings` — mismatch (related to P0-BOK-001; P2 tracks remaining provider pages beyond overview)
**File:** `app/(provider)/dashboard/revenue/page.tsx`, `app/(provider)/dashboard/analytics/page.tsx`, `app/(provider)/dashboard/guests/page.tsx`
**Fix:** After P0-BOK-001 is resolved (table sync), update these pages to read from the unified table.

**P2-PRV-005** | Agents: D4 (1)
**Title:** Calendar — no touch support for date range drag-select; mouse events only; calendar unusable on mobile
**File:** `app/(provider)/dashboard/calendar/page.tsx`
**Fix:** Add `onTouchStart`/`onTouchMove`/`onTouchEnd` handlers mirroring the mouse drag-select logic.

**P2-PRV-006** | Agents: D4 (1)
**Title:** `TooltipTrigger render={<Link>}` API mismatch in collapsed sidebar "Back to app" link — link unreachable when sidebar is collapsed
**File:** `components/provider/ProviderSidebar.tsx:302`
**Fix:** Use the `asChild` prop pattern: `<TooltipTrigger asChild><Link ...>...</Link></TooltipTrigger>`.

**P2-PRV-007** | Agents: D4 (1)
**Title:** AI Brain page shows "Saved — Sofía will use this in her next reply" even when API fails and only localStorage was written — misleading success
**File:** `app/demo/whatsapp/brain/page.tsx:268–275`
**Fix:** Distinguish local-only saves with a different flash message: `"Saved locally — changes will sync when connection is restored"`.

**P2-PRV-008** | Agents: A1 (1)
**Title:** Analytics not configured — all "estimated" metrics are fabricated numbers presented as real business data
**File:** `app/layout.tsx` (missing Vercel Analytics), `app/(provider)/dashboard/analytics/page.tsx`
**Fix:** Add `<Analytics />` from `@vercel/analytics/react` to `app/layout.tsx` to begin collecting real pageview data immediately.

### [TOURIST]

**P2-TRS-001** | Agents: D1, D6 (2)
**Title:** `BrowseListingCard` (main explore grid card) uses `rounded-xl` not `rounded-2xl` and missing `border` class — DESIGN.md violation
**File:** `components/listing/BrowseListingCard.tsx:269`
**Fix:** Change `rounded-xl` to `rounded-2xl`; add `border border-border` to the card container.

**P2-TRS-002** | Agents: D1, D2, F2 (3)
**Title:** `BrowseListingCard` uses raw `<img>` tag — no WebP conversion, no LCP optimization, no blur placeholder on highest-traffic page
**File:** `components/listing/BrowseListingCard.tsx:226, 284`
**Fix:** Replace with `<Image fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />` from `next/image`.

**P2-TRS-003** | Agents: D1, D6 (2)
**Title:** `font-display` (Fraunces) / `font-body` (Plus Jakarta Sans) not applied in any tourist, provider, or admin route — entire design system font identity missing from product
**File:** All 37+ files under `app/(tourist)/`, `app/(provider)/`, `app/(admin)/`
**Fix:** Apply `font-display` to all `h1`/`h2` elements on category/region/discover pages; apply `font-body` to body copy paragraphs. Fonts are loaded but never applied.

**P2-TRS-004** | Agents: D1 (1)
**Title:** Discover hero uses hardcoded dark hex gradients and decorative gradient orbs — violates DESIGN.md "photography-forward" + "no decorative blobs"
**File:** `app/(tourist)/discover/DiscoverGrid.tsx:299–320`
**Fix:** Replace gradient hero with a photography-based hero image; remove the two radial gradient `div` "orbs".

**P2-TRS-005** | Agents: A3 (1)
**Title:** Homepage category strip and editorial picks link to deprecated `/library/...` routes — will 404 or route incorrectly
**File:** `app/page.tsx:69, 47`
**Fix:** Update all `/library/category/...` links to `/explore/category/...` and `/library/region/...` to `/explore/region/...`.

**P2-TRS-006** | Agents: D7 (1)
**Title:** My Trips Itineraries tab reads wrong localStorage key (`vz-itineraries`) — itineraries built in `/plan` use a different Zustand persist key and are invisible
**File:** `app/(tourist)/trips/page.tsx:219`
**Fix:** Align the localStorage key with the Zustand store's persist key, or read directly from the store via `useItineraryStore`.

### [DESIGN]

**P2-DSN-001** | Agents: D6, D1, D2, D4 (4)
**Title:** Status color tokens (`bg-status-confirmed`, `bg-status-pending`, etc.) defined in globals.css but used in only 2 files; 25+ files use raw `bg-green-*`/`bg-yellow-*`/`bg-red-*` — breaks dark mode
**File:** `app/(tourist)/trips/page.tsx`, `app/(provider)/dashboard/` (multiple files), `components/whatsapp/` (multiple files), `components/listing/BrowseListingCard.tsx`
**Fix:** Global find-and-replace of common status color patterns to use semantic tokens from DESIGN.md; prioritize tourist-facing and provider dashboard files.

**P2-DSN-002** | Agents: D6 (1)
**Title:** Entire `app/(admin)/` section uses `bg-white` with no `dark:` variant — admin panel becomes white-on-white or invisible in dark mode
**File:** All 10 files under `app/(admin)/admin/`
**Fix:** Replace `bg-white` with `bg-background`; replace `text-gray-*` with `text-foreground`/`text-muted-foreground`; replace `border-gray-*` with `border-border` throughout all admin files.

**P2-DSN-003** | Agents: D6 (1)
**Title:** `app/(admin)/admin/listings/page.tsx` uses zero shadcn/ui components, has 10+ raw hex `style={{}}` props, and 60+ hardcoded Tailwind classes — worst design-system compliance in codebase
**File:** `app/(admin)/admin/listings/page.tsx`
**Fix:** Systematic pass replacing inline hex styles and raw `<button>`/`<input>` elements with `Button`, `Input`, `Badge` from shadcn/ui; replace hardcoded hex with OKLCH tokens.

**P2-DSN-004** | Agents: D6 (1)
**Title:** `text-[10px]`/`text-[9px]` sub-scale sizes in 40+ locations across 15 files — below documented 12px minimum
**File:** `app/(admin)/admin/outreach/page.tsx` (×12), `app/(admin)/admin/listings/page.tsx` (×11), `components/whatsapp/AiSettingsPanel.tsx` (×13), `components/whatsapp/BookingPipeline.tsx` (×5), `components/whatsapp/MessageThread.tsx` (×5), etc.
**Fix:** Define a `text-2xs: 10px` token in `globals.css` if 10px is intentional; replace all `text-[10px]` arbitrary values with the named token; enforce `text-xs` (12px) minimum for user-facing content.

### [INFRA]

**P2-INF-001** | Agents: F2, F3 (2)
**Title:** 30 of 81 API routes have no top-level `try/catch` — unhandled Supabase or network errors return unstructured 500s
**File:** `app/api/itineraries/route.ts`, `app/api/profile/route.ts`, `app/api/upload/route.ts`, `app/api/notifications/route.ts`, `app/api/providers/` routes, `app/api/listings/[id]/route.ts`, `app/api/admin/bookings/route.ts`, `app/api/ruta/dispatch/route.ts` (and 22 others)
**Fix:** Wrap all API route handlers in a top-level `try/catch` that returns `NextResponse.json({error: 'Internal error'}, {status: 500})` with the error logged server-side.

**P2-INF-002** | Agents: F4 (1)
**Title:** `zodResolver(schema) as any` cast in all 9 form files — TypeScript cannot verify form field names match schema keys; field name typos silently accepted
**File:** `app/(auth)/login/page.tsx`, `register/page.tsx`, `provider-register/page.tsx`, `dashboard/listings/[id]/edit/page.tsx`, `listings/new/page.tsx`, `settings/page.tsx`, `components/provider/ListingWizard.tsx`, `components/admin/AdminSafetyZoneForm.tsx`, `components/listing/ReviewSection.tsx`
**Fix:** Add proper generic typing: `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })` in all 9 files to remove the cast.

**P2-INF-003** | Agents: F1 (1)
**Title:** `Math.random()` called during render in OnboardingWizard — causes visual flicker on every re-render
**File:** `app/onboard/[slug]/OnboardingWizard.tsx:1548–1553`
**Fix:** Pre-compute the random values in `useMemo` or `useState` so they are stable between re-renders.

**P2-INF-004** | Agents: A1 (1)
**Title:** Supabase realtime subscription in provider messages page has no reconnect logic — silent message freeze on dropped connection
**File:** `hooks/use-realtime.ts`
**Fix:** Add `channel.on('system', {event: 'error'}, () => { reconnect() })` handler; implement exponential-backoff reconnect.

**P2-INF-005** | Agents: F4 (1)
**Title:** `shadcn` CLI tool listed as runtime production dependency — inflates bundle
**File:** `package.json:41`
**Fix:** Move `shadcn` from `dependencies` to `devDependencies`.

---

## P3 — BACKLOG

### [SECURITY]

**P3-SEC-001** | Agents: F3 (1)
**Title:** Cron endpoint `/api/ruta/cron/expire-zelle` passes auth check when `CRON_SECRET` is unset (falsy `&&` short-circuit)
**File:** `app/api/ruta/cron/expire-zelle/route.ts:9–13`
**Fix:** Explicitly check `if (!process.env.CRON_SECRET || header !== process.env.CRON_SECRET)` to fail closed when env var is unset.

**P3-SEC-002** | Agents: F3 (1)
**Title:** `NEXT_PUBLIC_MAPBOX_TOKEN` must be restricted by domain in Mapbox dashboard to prevent quota theft
**File:** Mapbox dashboard configuration (not a code change)
**Fix:** Log into Mapbox dashboard, edit the public token, add URL restriction to `*.vzexplorer.com` (or production domain).

**P3-SEC-003** | Agents: A2 (1)
**Title:** RUTA quote price validation bypassed if both Mapbox and DB are unavailable — `catch` block accepts any submitted price unconditionally
**File:** `app/api/ruta/checkout/route.ts:56–59`
**Fix:** In the catch block, return a 503 error rather than silently accepting the submitted price.

### [BOOKING]

**P3-BOK-001** | Agents: D2 (1)
**Title:** `completed` status on confirmation page uses blue (info) color — should be green (confirmed) for positive state
**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx:56–59`
**Fix:** Map `'completed'` to `bg-status-confirmed text-status-confirmed` in `STATUS_CONFIG`.

**P3-BOK-002** | Agents: D2 (1)
**Title:** Guest count +/- buttons in BookingForm are `h-8 w-8` (32px) — below 44px mobile touch target minimum
**File:** `components/listing/BookingForm.tsx:281–313`
**Fix:** Increase to `h-11 w-11` or add `min-h-[44px] min-w-[44px]`.

**P3-BOK-003** | Agents: D2 (1)
**Title:** Cancel booking in booking detail page uses native `alert()` for failure — should use toast or inline error
**File:** `app/(tourist)/bookings/[id]/page.tsx:126`
**Fix:** Replace `alert('Failed to cancel...')` with `toast.error(...)`.

**P3-BOK-004** | Agents: A2 (1)
**Title:** Zelle confirmation in RUTA accepts any `verified_amount_usd` without comparing to quoted price — dispatcher can confirm partial payments
**File:** `app/api/ruta/zelle-confirm/route.ts:10–11`
**Fix:** Compare `verified_amount_usd` against `ride.price_quoted_usd`; reject if delta exceeds 5%.

**P3-BOK-005** | Agents: A2 (1)
**Title:** Unconfirmed email accounts — no resend-confirmation-email flow; accounts stuck in limbo if link expires
**File:** `app/(auth)/login/page.tsx` (no resend link)
**Fix:** Add "Resend confirmation email" link on the login page calling `supabase.auth.resend()`.

### [TOURIST]

**P3-TRS-001** | Agents: D1 (1)
**Title:** `BrowseListingCard` tier badge emojis not `aria-hidden` — screen reader reads "trophy Founding Partner"
**File:** `components/listing/BrowseListingCard.tsx:127, 134`
**Fix:** Wrap emoji in `<span aria-hidden="true">🏆</span>`.

**P3-TRS-002** | Agents: D1 (1)
**Title:** Safety Hub has no link to the map page for zone visualization; no breadcrumb
**File:** `app/(tourist)/safety/page.tsx`
**Fix:** Add a "View on Map" link pointing to `/map`; add a breadcrumb component.

**P3-TRS-003** | Agents: A1 (1)
**Title:** Date formatting is US-centric throughout — confusing for Venezuelan users (MM/DD vs DD/MM)
**File:** Multiple date-display locations across tourist and provider pages
**Fix:** Use `date-fns/locale/es` locale where displaying dates to users; add a tooltip noting dates are in Venezuela time (VET, UTC-4) for booking-related date displays.

**P3-TRS-004** | Agents: A1 (1)
**Title:** No OG image alt-language support — `<html lang="en">` static; Spanish content mispronounced by screen readers
**File:** `app/layout.tsx:49`
**Fix:** Once i18n is scaffolded, update `<html lang>` dynamically based on the detected/selected locale.

**P3-TRS-005** | Agents: D1 (1)
**Title:** Discover Featured badge overlaps category badge — both at `top-3` same vertical position on short-caption cards
**File:** `app/(tourist)/discover/DiscoverGrid.tsx:237`
**Fix:** Offset the Featured badge position: `top-3 left-1/2` → `top-10 left-1/2` or place Featured badge on the opposite corner.

**P3-TRS-006** | Agents: A1 (1)
**Title:** Fabricated viewer statistics shown as real data — provider join page `Math.max(round(review_count * 1.8), 240)` displayed as "travelers viewed your area this month"
**File:** `app/join/[slug]/page.tsx`
**Fix:** Remove the fabricated metric or label it "Estimated" with a footnote explaining the methodology.

**P3-TRS-007** | Agents: A3 (1)
**Title:** Photo lightbox has no swipe gesture support — arrow buttons only; mobile photo UX feels non-native
**File:** `components/common/ImageGallery.tsx`
**Fix:** Add `onTouchStart`/`onTouchEnd` delta handler: if `delta > 50px` call `onPrev()` or `onNext()`.

### [PROVIDER]

**P3-PRV-001** | Agents: D4 (1)
**Title:** `console.log` in `app/api/ruta/cron/expire-zelle/route.ts` — should not be in production
**File:** `app/api/ruta/cron/expire-zelle/route.ts`
**Fix:** Remove `console.log`; use `console.error` for actual errors only.

**P3-PRV-002** | Agents: D5 (1)
**Title:** Admin listings page fetches all 9,999+ listings on page load — performance risk as dataset grows
**File:** `app/(admin)/admin/listings/page.tsx` (`fetch('/api/admin/listings?limit=9999')`)
**Fix:** Implement server-side cursor pagination; load 50 rows at a time with "Load more" or virtual scroll.

### [INFRA]

**P3-INF-001** | Agents: F4 (1)
**Title:** `require()` CommonJS dynamic imports inside ESM App Router API routes — bypasses bundler tree-shaking
**File:** `app/api/bookings/route.ts:22`, `mine/route.ts:10`, `[id]/route.ts:11`, `lib/admin-store.ts:75`
**Fix:** Replace `require()` calls with `import()` dynamic imports or direct `await import(path)`.

**P3-INF-002** | Agents: F4 (1)
**Title:** `@types/uuid` v10 in devDependencies with `uuid` v13 runtime — type definitions three major versions behind
**File:** `package.json`
**Fix:** Update `@types/uuid` to `^13.0.0` or migrate `generateId()` in `lib/utils.ts` to `crypto.randomUUID()` and remove the `uuid` dependency.

**P3-INF-003** | Agents: F2 (1)
**Title:** `itinerary-store.ts` uses Zustand `devtools` middleware unconditionally in production
**File:** `stores/itinerary-store.ts:38`
**Fix:** Gate devtools: `process.env.NODE_ENV === 'development' ? devtools(store) : store`.

**P3-INF-004** | Agents: F1 (1)
**Title:** ESLint scans `frontend/.next/` build artifacts — pollutes output with thousands of irrelevant violations
**File:** `.eslintignore` or `eslint.config.js` (missing `frontend/.next` ignore pattern)
**Fix:** Add `frontend/.next` and `frontend/node_modules` to `.eslintignore`.

### [WHATSAPP]

**P3-WAS-001** | Agents: D6b (1)
**Title:** ConversationList "Refresh" button has no `onClick` handler — clicking does nothing
**File:** `components/whatsapp/ConversationList.tsx:141`
**Fix:** Wire to a no-op with `toast('Live refresh not available in demo')` or implement a real re-fetch.

**P3-WAS-002** | Agents: D6b (1)
**Title:** `groupedMessages()` `useCallback` result called inline — memoization wasted, groups recomputed every render
**File:** `components/whatsapp/MessageThread.tsx:153`
**Fix:** Convert to `useMemo`: `const groups = useMemo(() => groupedMessages(), [messages])`.

---

## EXECUTION PLAN FOR WAVE 6

### E1 — Tourist Core Agent
**Files owned:** `components/listing/`, `app/(tourist)/explore/`, `app/(tourist)/listing/`, `app/(tourist)/discover/`, `app/(tourist)/safety/`, `app/map/`, `app/page.tsx`
**P0 issues:** P0-TRS-001, P0-TRS-002
**P1 issues:** P1-TRS-001, P1-TRS-002, P1-TRS-003, P1-TRS-004, P1-TRS-005, P1-TRS-006, P1-TRS-007, P1-TRS-008, P1-TRS-009, P1-TRS-010
**P2 issues:** P2-TRS-001, P2-TRS-002, P2-TRS-003, P2-TRS-004, P2-TRS-005

### E2 — Booking Funnel Agent
**Files owned:** `app/(tourist)/booking/`, `app/(tourist)/bookings/`, `app/(tourist)/trips/`, `app/(tourist)/book/`, `components/listing/BookingForm.tsx`, `components/common/ImageGallery.tsx`, `hooks/use-booking.ts`, `app/api/bookings/`
**P0 issues:** P0-BOK-001, P0-BOK-002, P0-BOK-003, P0-BOK-004
**P1 issues:** P1-BOK-001, P1-BOK-002, P1-BOK-003, P1-BOK-004, P1-BOK-005, P1-BOK-006, P1-BOK-007, P1-BOK-008
**P2 issues:** P2-BOK-001, P2-BOK-002, P2-BOK-003, P2-BOK-004, P2-BOK-005, P2-BOK-006

### E3 — Provider + Admin Agent
**Files owned:** `app/(provider)/`, `app/(admin)/`, `components/provider/`, `app/api/provider/`, `app/api/admin/`, `app/(ruta)/`
**P0 issues:** P0-BOK-005, P0-PRV-001, P0-PRV-002, P0-PRV-003, P0-RTA-001, P0-RTA-002, P0-ADM-001
**P1 issues:** P1-PRV-001, P1-PRV-002, P1-PRV-003, P1-PRV-004, P1-RTA-001, P1-RTA-002
**P2 issues:** P2-PRV-001, P2-PRV-002, P2-PRV-003, P2-PRV-004, P2-PRV-005, P2-PRV-006, P2-PRV-007, P2-PRV-008

### E4 — Design System Agent (global files only)
**Files owned:** `app/globals.css`, `tailwind.config.ts`, `components/ui/`, `app/layout.tsx`, `app/(auth)/layout.tsx`
**P1 issues:** P1-INF-002, P1-INF-003, P1-INF-004
**P2 issues:** P2-DSN-001, P2-DSN-002, P2-DSN-003, P2-DSN-004, P2-AUT-001
**Note:** Design system token replacements (status colors, font tokens, border-radius) span many files — E4 should produce a global search-and-replace pass first, then component-level fixes in coordination with E1/E2/E3.

### E5 — Security + Infrastructure Agent
**Files owned:** `app/api/`, `lib/`, `middleware.ts` (to be created), `next.config.ts`, `app/sitemap.ts` (to be created), `app/robots.ts` (to be created), `app/not-found.tsx` (to be created), `app/legal/` (to be created)
**P0 issues:** P0-SEC-001, P0-SEC-002, P0-SEC-003, P0-SEC-004, P0-SEC-005, P0-SEC-006, P0-SEC-007, P0-INF-001, P0-INF-002
**P1 issues:** P1-SEC-001, P1-SEC-002, P1-SEC-003, P1-SEC-004, P1-SEC-005, P1-SEC-006, P1-INF-001, P1-INF-002, P1-INF-003, P1-INF-004
**P2 issues:** P2-SEC-001, P2-SEC-002, P2-SEC-003, P2-SEC-004, P2-SEC-005, P2-SEC-006, P2-SEC-007, P2-INF-001, P2-INF-002, P2-INF-003, P2-INF-004, P2-INF-005

### E6 — WhatsApp + RUTA Agent
**Files owned:** `app/demo/whatsapp/`, `app/(ruta)/`, `lib/whatsapp-*`, `lib/whatsapp/`, `lib/groq.ts`, `lib/ruta/`, `components/whatsapp/`, `components/ruta/`, `app/api/whatsapp/`, `app/api/ruta/`
**P0 issues:** P0-RTA-001, P0-RTA-002 (also owned by E3; coordinate)
**P1 issues:** P1-WAS-001, P1-WAS-002, P1-WAS-003, P1-RTA-001, P1-RTA-002
**P2 issues:** P2-SEC-007, P2-PRV-007

### E7 — Auth + Accounts Agent
**Files owned:** `app/(auth)/`, `app/(tourist)/account/`, `app/(tourist)/messages/`, `hooks/use-auth.ts`, `lib/auth/`
**P0 issues:** (none pure-auth P0; see P0-SEC-003, P0-SEC-007 in E5)
**P1 issues:** P1-AUT-001, P1-AUT-002, P1-AUT-003, P1-AUT-004, P1-AUT-005, P1-AUT-006, P1-AUT-007
**P2 issues:** P2-AUT-001, P2-AUT-002, P2-AUT-003, P2-AUT-004, P2-AUT-005, P2-AUT-006
