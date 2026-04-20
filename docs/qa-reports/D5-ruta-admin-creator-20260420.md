# D5 — RUTA + Admin + Creator UX/UI Review
**Date:** 2026-04-20
**Reviewer:** Claude Sonnet 4.6 (automated review)
**Design System reference:** `/Users/tomas/VZ_Tourism_Project/DESIGN.md`

---

## RUTA Secure Transport

### Landing Page

The landing page (`app/(ruta)/ruta/page.tsx`) is a self-contained dark-theme site with a 2-column hero layout: headline + trust badges on the left, booking form on the right. The design is internally consistent and appropriate for the high-stakes security transport context. It does not use the VAV design system (Inter, OKLCH tokens, teal/green/gold primary palette) at all — this is by design since RUTA has its own `RutaLayout` with `#0a0a0a` background and `#c9a96e` gold accent. RUTA is correctly isolated from the main platform aesthetic.

**Good:**
- Hero communicates value proposition clearly: "Secure Executive Transport in Venezuela"
- 3 trust badges (24/7, GPS, 100% Vetted) are scannable at a glance
- Inline "Talk to a human" WhatsApp fallback is a strong trust signal
- "Trusted By" section with 5 named clients provides credibility
- 4-step "How It Works" section in a clear horizontal grid
- Footer 3-column layout with compliance text, nav links, and contact

**Issues:**
- The 3 service tiers (Airport Transfer, Inter-City, Intra-City) are present in `ServiceCards` but there is no visual differentiation or featured tier. All 3 cards share identical visual weight and styling — there is no hierarchy indicating which tier is most popular or recommended.
- `ServiceCards` uses simple emoji icons (✈, ↔, ◉) — these render inconsistently across platforms and are not accessible as icon-only affordances. No `aria-label` on the icon elements.
- The price display for Inter-City ("From $12/km") is not immediately intuitive — the "Plus base fare, distance calculated" subtext is easy to miss in the small `text-xs` sizing.
- The `max-w-7xl` container is wider than the DESIGN.md recommended `max-w-6xl` (1100px), but since RUTA has its own layout context this is acceptable.
- The hero `h1` is `text-4xl/5xl/6xl` with `font-light` — looks premium, but the font stack falls back to system-ui. The `RutaLayout` inline font-family never loads a custom typeface, relying on system fonts rather than any declared web font.

### Booking Flow & Instant Quote

The `BookingForm.tsx` is the most sophisticated component in RUTA. It handles:
1. Service type switching (tabs)
2. Context-aware location inputs (AirportSelect for airport, LocationInput for city/address)
3. Date + time with min lead-time enforcement
4. Passengers + vehicle class
5. Instant quote via GET `/api/ruta/quote`
6. Checkout step (name, email, phone, payment method)
7. Stripe redirect or Zelle instructions

**Good:**
- Lead time validation per service type is correctly enforced via `RUTA_MIN_LEAD_TIMES`
- Quote breakdown shows base fare, distance charge, time charge, and multiplier — operationally transparent
- Quote valid-for-15-min timer label is shown
- Checkout step appears inline below the quote — no modal, no navigation, clean progressive disclosure
- Error states have WhatsApp fallback links
- `aria-live="polite"` on the quote result area is correct
- All buttons and inputs have `focus:ring` states

**Issues — P0:**
- **Date picker hidden text:** When `date` is empty, `color: 'transparent'` is applied to the `<input type="date">`. A custom `div` overlay shows placeholder text. However, on browsers where the native date picker shows month/day/year placeholders inside the input, the overlay `div` will visually overlap the native controls creating confusing double-rendering. This is a fragile hack. Standard approach: use `opacity` or a separate `<label>` element.
- **Passenger count capped at 4:** The `select` only offers 1–4 passengers. Executive van capacity is 8+, and corporate clients may need more. No "more passengers?" escape hatch.
- **`alert()` in `assignDriver`:** The dispatch page uses `alert()` for failure messaging — this is a P0 for a professional ops dashboard.

**Issues — P1:**
- The selected location is shown as raw lat/lng coordinates after selection (`From: 10.6035, -66.9736`). This is developer output, not useful UX. Should show address strings.
- No way to edit/clear a previously selected location without switching service tabs (which resets both locations).
- No "add to calendar" or reference number display on the quote — users cannot easily share or reference their quote.
- Date input uses `type="date"` with Venezuela timezone offset hardcoded as `-04:00` in the ISO string construction — `new Date(\`\${date}T\${time}:00-04:00\`)`. This will produce incorrect times for users in other timezones who are booking for Venezuela travel (e.g., a Miami user booking for a Caracas pickup). Should indicate clearly "Time shown in VET (UTC-4)" adjacent to the time input — label does say "(VET, UTC-4)" but the computed local time is not confirmed to the user.

**Issues — P2:**
- The "Get Quote" button is disabled when `!pickupLocation || !dropoffLocation` but gives no visual explanation to the user about why it's disabled. Should show a tooltip or inline note.
- Payment options offer only Stripe (credit card) and Zelle. No USDT/crypto option — inconsistent with what the join/onboard pages promise providers.

### 7-Language i18n

The i18n system in `lib/ruta/i18n.tsx` is a full client-side context provider. All 7 languages (EN, ES, FR, DE, PT, ZH, IT) are embedded in a single 1,215-line file as static objects.

**Good:**
- All 7 languages are fully translated — every key in `RutaTranslations` is populated across all locales.
- Chinese (ZH) uses proper Simplified Chinese with appropriate localization (e.g., airport names localized to Chinese equivalents like "加拉加斯" for Caracas).
- Locale persists across page loads via `localStorage('ruta_locale')`.
- The language selector dropdown on desktop shows full language names. Mobile menu shows 2-letter flag codes (EN, ES, etc.) in a pill grid.
- `aria-label="Select language"` on the globe button.
- Close on outside click is implemented.

**Issues — P1:**
- **No `lang` attribute update:** When the locale changes, `document.documentElement.lang` is never updated. Screen readers and browser translation features use this attribute to determine the page language. When a user switches to Chinese, `<html lang="en">` remains, causing incorrect pronunciation by screen readers.
- **Translation strings are functions in some locales:** `passengerCount: (n: number) => string` — this is correctly typed but means the translation object cannot be serialized to JSON (e.g., for future server-side rendering or remote translation loading).
- **Mobile language selector shows only 2-letter codes** (EN, ES, FR, DE, PT, ZH, IT) with no language name — not accessible for users who don't recognize ISO 639-1 codes, particularly for ZH vs ZT or PT-BR vs PT-PT disambiguation.
- **No RTL support** — though none of the 7 languages are RTL, it's worth noting the system has no `dir` attribute handling if Arabic or Hebrew were to be added.

**Issues — P2:**
- The `LOCALE_FLAGS` record is misleadingly named — it contains 2-letter codes, not flag emoji. This is actually the correct accessible choice (flag emoji are region-specific and politically fraught for Venezuela's context), but the variable name is confusing for future maintainers.

### Dispatch Dashboard

The dispatch dashboard (`app/(ruta)/ruta/dispatch/`) has a dedicated layout with auth gate checking `ruta_role` via Supabase `app_metadata`.

**Good:**
- Auth gate correctly checks `ruta_dispatcher` or `ruta_admin` role.
- Ride queue is filterable by `active` vs `all`.
- Master-detail layout: ride list left (384px), detail panel right — correct ops dashboard pattern.
- Status colors are well-differentiated (8 distinct states with unique colors).
- Zelle payment confirmation panel appears in-context for pending Zelle rides.
- Driver assignment only shows `available` drivers in the filter check.

**Issues — P0:**
- **`alert()` used for error states:** `assignDriver` and `confirmZelle` both call `window.alert()` for API errors. This is a jarring, inaccessible pattern in a professional ops dashboard.
- **No auto-refresh:** The dispatch dashboard only loads data on mount and on filter change. In an operations context, rides are time-sensitive. There is no polling, WebSocket subscription, or manual refresh button. A dispatcher could be looking at stale data for hours.
- **Dispatch nav has no mobile response:** The dispatch sub-nav (`Rides | Drivers | Vehicles`) is `hidden md:flex` on mobile with no hamburger fallback. On a tablet used in the field, the sub-navigation is inaccessible.

**Issues — P1:**
- The ride queue is sorted by insertion order (no sorting). For ops use, it should default to `scheduled_at` ascending (soonest pickup first).
- The dispatch layout height is `h-[calc(100vh-60px)]` but the `60px` assumes the nav is exactly 60px tall. The nav uses `py-4` (16px top + 16px bottom) + content ≈ 52px. If the nav wraps, the layout overflows.
- Ride list item shows raw ISO date formatted as `Apr 20, 04:00 PM` — correct — but has no visual urgency indicator (e.g., red highlight for pickups in the next 2 hours).
- `InfoBlock` for `Phone` and `Email` are truncated with `truncate` but there is no `title` attribute on the outer `div`, only on the inner element — email addresses may be cut off with no expansion affordance.
- No way to update ride status from the dispatch page (other than Zelle confirmation and driver assignment). There is no "Mark as Picked Up", "In Progress", or "Completed" button.

**Issues — P2:**
- Driver assignment dropdowns list all drivers, including `on_ride` and `suspended` ones, with their status shown in parentheses. The filtering note in the code says "filter available" but the actual `<option>` list renders all drivers. Only the `No available drivers` message is conditionally added — it doesn't prevent selecting unavailable drivers.
- Ride ID is shown at the bottom as a raw UUID with no copy button.

### Driver and Vehicle Management

**Drivers page (`dispatch/drivers/page.tsx`):**
- Functional CRUD: list, add, toggle available/offline.
- Status shown as colored dot + text. All 4 statuses have distinct colors.
- Status toggle only flips between `available` and `offline` — no way to set `on_ride` or `suspended` from the UI. The suspended state is rendered but unachievable from this screen.
- Add driver form uses `sr-only` labels (inputs rely on placeholder text for visual labeling — a WCAG 2.1 fail when focused; placeholder disappears on input, removing the label from view).
- No delete functionality.
- No edit/update functionality beyond status toggle.
- No validation feedback in the UI when `createDriver` silently fails due to missing fields (the function just returns without showing an error).

**Vehicles page (`dispatch/vehicles/page.tsx`):**
- Same pattern as drivers — functional but minimal.
- Good: armor rating and tracker device ID fields are present.
- Missing: no vehicle status (available/in_use/maintenance). No edit functionality. No delete.
- Capacity field is present in the form but there is no max/min validation on the input.
- The `createVehicle` function silently returns if `!form.make || !form.model || !form.plate_number || !form.color` — no user feedback.

---

## Admin Dashboard

### Access Control & Security

The admin is protected by a password gate in `AdminLayout` (`app/(admin)/admin/layout.tsx`). The hash `ADMIN_HASH` is hardcoded in the client bundle:

```
const ADMIN_HASH = '1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792';
```

**Issues — P0:**
- **Hash exposed in client bundle.** The SHA-256 hash of the admin password ships to every browser that loads any admin page (even unauthenticated). An attacker with the hash can run an offline dictionary/rainbow table attack without rate limiting. This is a well-known anti-pattern — the comment in the code correctly notes "This constant is ONLY used for the initial client-side gate UX — it is NOT a secret" but the hash is the secret. The server-side `ADMIN_PASSWORD` env var comparison is the correct path; the client hash gate is redundant and risky.
- **No rate limiting on the client-side password gate.** An attacker can attempt thousands of passwords per second in the browser — there is no lockout or CAPTCHA.
- **Cookie is set with `SameSite=Lax`** and no `HttpOnly` — making it accessible to JavaScript and vulnerable to XSS. Should be `HttpOnly; SameSite=Strict`.

**Issues — P1:**
- The cookie name `admin_token` with the SHA-256 hash as value means anyone who intercepts the cookie can use it indefinitely — there is no expiry-based invalidation tied to a server secret rotation.
- The "Checking…" spinner state (`authed === null`) returns `null` — the entire page is blank during this check. Should show a skeleton or loading state.

### Listings Management

The listings manager (`admin/listings/page.tsx`) is the most feature-complete page in the entire codebase. It handles 1,170+ listings with client-side pagination (50/page), multi-column sort, 5 filter dimensions, bulk operations, AI row actions, command palette (Cmd+K), and per-row outreach modal.

**Good:**
- Command palette with natural language query (AI-powered) is a standout feature.
- Bulk preview modal shows before/after diff — prevents accidents.
- AI bulk progress shows live processing with per-listing results.
- Outreach modal has 3-tab channel switching (WhatsApp/Instagram/Email) with editable AI-generated copy.
- Platform status funnel is shown inline in the header (scraped → outreach sent → interested → onboarding → verified → founding partner).
- Missing data warnings shown inline per row with one-click AI fix buttons.
- Edit panel (480px slide-in) has AI description improvement with diff view (before/after accept/reject).

**Issues — P1:**
- **"Add Listing" button has no action:** Line 1381-1387 renders a `<button>` with no `onClick` handler. The button is non-functional.
- **Outreach modal is in Spanish** (`Enviar Outreach ⚡`, `Negocio`, `Enviado y registrado en el CRM`, `Generando mensajes personalizados con IA...`). The rest of the admin dashboard is English. Inconsistent language in a mixed-language interface is confusing.
- The `AIRowPopover` has no `role="menu"` / `role="menuitem"` ARIA semantics — it's a custom popover with no keyboard trap or focus management.
- The edit panel `EditPanel` has `role` on the `contact` fields but no `for` attribute on the Contact section labels (lines 443-463 use generic `<label>` with no `htmlFor`).

**Issues — P2:**
- Loading `allListings` with `?limit=9999` fetches the entire dataset on page load. With 1,170+ listings and growing, this could be a significant initial payload. Consider cursor-based pagination or virtual scroll.
- The `Archive` action uses `confirm()` — same native dialog anti-pattern as `alert()`.
- Pagination renders up to 7 page buttons using manual index math that could show page numbers less than 1 if `totalPages < 7`.

### Platform Operations

**Admin Dashboard Overview** (`admin/page.tsx`):
- Clean stat grid (6 cards) with category breakdown and recent listings.
- "AI Opportunities" card highlights missing descriptions and tags with one-click fix links — well integrated.
- Quick Actions panel with 4 common tasks.
- Uses shadcn `Card` components and Tailwind semantic colors correctly aligned with DESIGN.md.

**Outreach CRM** (`admin/outreach/page.tsx`):
- Kanban + inbox dual-view is a mature CRM pattern.
- 8 pipeline stats across the top.
- "Simulate Response" AI feature (sends to `/api/admin/outreach/classify`) allows testing without real messages.
- The entire outreach page is in Spanish (labels, buttons, section headers). This is inconsistent with the English admin dashboard.

**Analytics** (`admin/analytics/page.tsx`):
- Uses `createClient()` from supabase server — returns graceful fallback when DB is not configured.
- 4 KPI cards + monthly booking trend table.
- **No charts** — monthly data is rendered as raw table data, not visualized. The sidebar nav item is "Analytics" suggesting charts are expected, but none exist. No recharts, no chart.js, nothing visual.

**Providers** (`admin/providers/page.tsx`), **Bookings** (`admin/bookings/page.tsx`), **Safety Zones** (`admin/safety-zones/page.tsx`), **Payouts** (`admin/payouts/page.tsx`): Not reviewed in detail — beyond scope.

---

## Creator Portal & Onboarding

### Itinerary Builder

The creator portal has a 2-step flow: **New** (`/creator/itineraries/new/`) → **Review** (`/creator/itineraries/review/[draftId]/`).

**New Itinerary page** (`app/creator/(portal)/itineraries/new/page.tsx`):

**Good:**
- "Vibe → Link" framing is compelling and creator-native.
- Multi-link textarea (one per line) with up to 20 links supported.
- "Your voice" optional context textarea with 1,000 char counter.
- Loading state has a 3-step visual pipeline (Fetching → Extracting → Matching) with animated dots showing current step.
- Error state shows specific error message from API.
- "How it works" step list at the bottom provides trust for new creators.

**Issues — P1:**
- The loading pipeline visual (3 dots) does not update dynamically — all three steps display simultaneously in static states. The second and third steps have `bg-primary/50` and `bg-muted` styling suggesting they're "pending", but there's no actual state update while extraction runs. This makes it look like a static illustration, not a real status indicator.
- The link extraction only accepts URLs starting with `http` — pasted `tiktok.com/...` without the protocol silently drops links. Should auto-prepend `https://`.
- No link count indicator showing how many valid URLs were detected from the textarea.
- The `draftId` is generated client-side with `crypto.randomUUID()` and stored in `sessionStorage`. If the user closes the tab or navigates away before reaching `/review`, the draft is lost with no warning.

**Review page** (`app/creator/(portal)/itineraries/review/[draftId]/page.tsx`):

**Good:**
- Spot-by-spot review with toggle include/exclude is the right pattern.
- Google Places resolve fallback for unmatched spots.
- Discount code attachment section with inline loading/empty states.
- Public/Private visibility toggle.
- Publish CTA shows stop count dynamically: "Publish 5 stops".
- Auto-generated title from first 3 spot names.
- Cleans up sessionStorage after publish.

**Issues — P1:**
- **Day assignment is not editable in the review UI.** Spots have `day: s.day_hint ?? 1` set on load but there is no UI to change which day a spot belongs to. The `Plus`/`Minus` icons are imported but never rendered in the final JSX. The user cannot control the day structure of their itinerary.
- **Order is not editable.** Spots render in extraction order with no drag-to-reorder. `order` is passed to the API but the user has no control over it.
- The description field is pre-filled from `creator_text` (the "Your voice" text) rather than a generated itinerary description. This means the itinerary description will say something like "This is my 4-day trip through the Andes..." which is a prompt, not a description. Should generate a polished description or leave blank.
- If the user has no active discount codes, the empty state shows a link to `/creator/codes` — but this route is in the sidebar nav as "Discount Codes". That page is not in the reviewed file tree, so its existence is unverified.

### Creator Profile

The creator public profile (`app/creator/[username]/page.tsx`) is a server component that queries Supabase.

**Good:**
- Avatar with `ring-2 ring-primary ring-offset-2` — matches DESIGN.md `ring-2 ring-primary` for verified creator avatars.
- Gold "Creator" badge using `bg-amber-50 text-amber-700` — matches DESIGN.md warm gold accent for creator content.
- Stats strip: Followers, Itineraries, Total Likes.
- Niche tags rendered as `Badge variant="outline"`.
- Itinerary cards: `rounded-2xl border bg-card` — matches DESIGN.md card pattern.
- Featured Experiences grid uses `ListingCard` — consistent with platform.
- `notFound()` if creator doesn't exist.

**Issues — P1:**
- The `followers_count` comes from `creator_profiles.followers_count` — this is a static integer, not a live count from a social platform. There is no sync mechanism mentioned.
- The featured listings query `contains('tags', creator.niche_tags || [])` with an empty array will return all published listings sorted by... nothing (no `order` clause). This could show random listings unrelated to the creator's niche.
- There is no "Follow" button or any social action — the profile is entirely read-only with no engagement affordance.
- Share button is missing — no "Copy link to profile" or platform share CTA.
- The `itineraries` grid links to `/itinerary/${itinerary.id}` — should link to `/itinerary/${itinerary.slug}` for SEO (though the fallback to ID exists in the publish flow).

**Issues — P2:**
- `creator.user?.avatar_url` may be `null`, in which case `AvatarFallback` renders initials — this is handled correctly.
- The referral tracking the task specifies is reviewing ("Is referral tracking visible to creators?") is entirely absent from the public profile. There's no indication of commissions earned, bookings attributed, or discount code performance on the profile page.

### Provider Onboarding Wizard

**Join page** (`app/join/[slug]/page.tsx`):
- Landing page for providers receiving an outreach link.
- Strong hero with listing photo, "Founding Partner Invitation" badge, and stats row (viewer estimate, rating, region count).
- 6-step "What you'll do in 10 minutes" timeline is clear.
- Founding Partner CTA box with 0% commission messaging.
- Payment methods listed (Zelle, USDT, Binance Pay, Cash) — consistent with VZ-specific needs.
- The CTA "Get Started →" links to `/onboard/${slug}`.

**Issues — P1:**
- The `viewerEstimate` is computed as `Math.max(Math.round(listing.review_count * 1.8), 240)` — this presents a fabricated number ("2,304 travelers viewed your area this month") as a real stat to providers. This is deceptive dark-pattern territory. Should either use real analytics data or label it clearly as an estimate.
- "Limited spots available for your region" (in the Founding Partner box) uses false scarcity framing with no actual limiting mechanism.

**Onboarding Wizard** (`app/onboard/[slug]/OnboardingWizard.tsx`):
- 5-step wizard structure: Verify Ownership → Review Listing → Rooms → Availability → Payment + Launch.
- Step 1 data includes `verification_method` ('phone' | 'instagram' | 'photo') — a real verification flow that checks ownership.
- Pre-fills listing data from scraped `ScrapedListing`.
- `priceSuggestion` from regional pricing data is passed in — good contextual pricing guidance.

**Issues — P1:**
- No step labels or progress bar are visible from the constructor stub reviewed (lines 1-80). A 5-step wizard without visible progress is a significant UX gap — users don't know how far they are.
- The wizard is a single `OnboardingWizard.tsx` client component. Session state is stored in `onboarding-store` (server-side `getSession`). The mismatch between server-read and client-write could create stale session issues.

---

## Priority Issues

### P0 (Broken)

1. **Admin: Hash exposed in client bundle** (`app/(admin)/admin/layout.tsx:29`) — SHA-256 of admin password is hardcoded in JavaScript served to all visitors. Enables offline brute-force attack with no rate limiting.

2. **Dispatch: `alert()` for error handling** (`app/(ruta)/ruta/dispatch/page.tsx:85,99`) — Native `alert()` blocks the UI thread, is inaccessible to screen readers, and breaks the professional ops dashboard experience. Also in drivers page (silent failures).

3. **Booking form: Date input transparency hack** (`components/ruta/BookingForm.tsx:303-307`) — Setting `color: transparent` on a native `<input type="date">` to show a custom overlay creates cross-browser rendering artifacts. Native date picker controls render invisibly against the overlay.

4. **Dispatch: No real-time updates** — Operations dashboard shows static data from initial load with no auto-refresh, polling, or WebSocket. A dispatcher using this in production will act on stale ride data.

5. **Listings: "Add Listing" button is non-functional** (`app/(admin)/admin/listings/page.tsx:1381`) — Primary CTA in the header has no `onClick` handler.

### P1 (High)

6. **RUTA: `lang` attribute not updated on locale change** — Screen readers use `<html lang>` for pronunciation. When switching to Chinese, `lang="en"` remains.

7. **Booking form: Lat/lng shown as location confirmation** — Selected pickup/dropoff shows raw coordinates (`From: 10.6035, -66.9736`) instead of the resolved address.

8. **Driver form: sr-only labels with placeholder-only UX** — `dispatch/drivers/page.tsx` uses `<label className="sr-only">` with visible placeholder text only. When the input is focused, the label disappears.

9. **Creator review: Day/order editing is absent** — The review page accepts day hints from AI extraction but provides no UI to reassign days or reorder stops.

10. **Outreach: Language inconsistency** — Admin outreach page is entirely in Spanish while the rest of the admin dashboard is in English. No language toggle or i18n system.

11. **Creator profile: Featured listings query has no order clause** — `contains('tags', [])` returns all published listings in undefined order.

12. **Join page: Fabricated viewer statistics presented as fact** — `Math.max(round(review_count * 1.8), 240)` is displayed without qualification as "travelers viewed your area this month."

13. **Dispatch: Driver dropdown lists unavailable drivers** — Despite a comment suggesting filtering, all drivers (including `on_ride`, `suspended`) appear as selectable options.

14. **Admin cookie: Not HttpOnly** — `admin_token` cookie is set via `document.cookie` without `HttpOnly`, making it accessible to JavaScript and XSS-vulnerable.

### P2 (Medium)

15. **RUTA service cards: No featured/recommended tier** — All 3 service tiers have equal visual weight. No "Most Popular" or recommended badge. Users have no guidance on which to choose.

16. **RUTA booking: Passenger cap at 4** — Select maxes at 4 passengers; van class supports more. No "larger group?" escape hatch.

17. **Dispatch: No ride urgency indicators** — Rides in the queue have no visual highlight for pickups within the next 1–2 hours.

18. **Analytics: No charts** — The analytics page has 4 KPI cards and a raw data table but no visual charts despite the sidebar label implying chart content.

19. **Admin: `confirm()` for archive action** — Native `confirm()` dialog is inaccessible and looks out of place in the polished admin UI. Should use an in-page confirmation modal like the one used for bulk operations.

20. **Creator builder: Pasted links without protocol silently dropped** — URLs like `tiktok.com/...` (no `https://`) are filtered out by `.filter((u) => u.startsWith('http'))` with no error shown.

21. **Creator loading state: Static progress dots** — The 3-step extraction progress indicator does not update dynamically during API call. Looks like a decorative illustration.

22. **Creator review: Description pre-filled with voice prompt** — `setDescription(data.creator_text)` on load puts the user's raw voice prompt (e.g., "4-day Andes trip, budget-friendly") into the itinerary description field without transformation.

### P3 (Low)

23. **RUTA: System font fallback only** — `RutaLayout` sets `fontFamily: '-apple-system, ...'` inline, never loading a declared web font. The design relies entirely on OS default sans-serif.

24. **RUTA: `LOCALE_FLAGS` variable misleadingly named** — Contains 2-letter codes, not flag emoji. Not a bug but confusing for maintainers.

25. **Vehicles page: Capacity field has no min/max validation** — `<input type="number">` for vehicle capacity accepts 0 or negative values.

26. **Admin listings: 9999-row fetch on page load** — `fetch('/api/admin/listings?limit=9999')` loads entire dataset on mount. Should implement server-side filtering/pagination as dataset grows.

27. **Creator profile: No share/copy link button** — Public profile has no mechanism for the creator to share their own profile URL.

28. **Onboarding wizard: No visible step progress bar** — 5-step wizard without progress indicator leaves providers uncertain how much remains.
