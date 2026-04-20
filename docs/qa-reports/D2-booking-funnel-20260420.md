# D2 — Booking Funnel UX/UI Review
**Date:** 2026-04-20
**Pages Reviewed:** Listing Detail, Booking Flow (BookingForm), Booking Confirmation, Booking Detail, My Trips
**Reviewer:** Senior UX/UI + Frontend Audit
**Design reference:** DESIGN.md (OKLCH color system, Inter typography, warm/editorial aesthetic)

---

## Executive Summary

The funnel is structurally sound and better than most Venezuela travel products. The 4-step booking flow embedded in the sidebar card is intuitive, the availability calendar is custom-built and smart, and the confirmation page has genuinely useful features (QR code, ICS download, WhatsApp share). That said, compared to Airbnb the funnel has five areas of meaningful friction:

1. **All listing images are broken** for scraped properties — 5,394 old-format Google Places API URLs with an exposed API key that is likely rate-limited or key-restricted (P0).
2. **Discount codes are fully built on the backend** (`/api/discount-codes/validate`) but there is **zero UI** in the booking form to enter one — the feature is invisible to users (P0).
3. **Pending/payment_submitted bookings are invisible** in My Trips — the `upcoming` filter only shows `confirmed` status, meaning a user who just requested a booking cannot find it (P1).
4. **No "View my trips" CTA** on the confirmation page — the primary post-booking action is missing, replaced only by "Back to home" and "Explore more" (P1).
5. **Mobile booking widget is not sticky** — on mobile the sidebar collapses below the content; `lg:sticky` only activates at `lg` (1024px+). On phones the booking CTA is buried below the full listing description (P1).

---

## Listing Detail Page

### Photo Gallery
**File:** `components/common/ImageGallery.tsx`, `components/listing/ListingDetail.tsx:45-87`

The `ImageGallery` component is well-built: 2-up grid (large left + 2 right), `+N` overlay for additional photos, full lightbox with keyboard navigation (Escape/arrows), focus trap, `aria-modal`, dot navigation, and a graceful `ImageOff` fallback per broken image. This is production-quality.

**KNOWN ISSUE — P0:** The `cover_image_url` and `photos` arrays in `data/scraped-listings.json` use the **old Google Places API format** (`maps.googleapis.com/maps/api/place/photo?...&photo_reference=...&key=AIzaSy...`). This format has been deprecated by Google, and the API key is hardcoded in the data file. These requests will fail silently (the `GalleryImage` component shows the `ImageOff` fallback). The proxy at `/api/places/photo` supports the **new** Places v1 format (`places/xxx/photos/xxx`) via the SSRF guard regex — it explicitly rejects the old format. Every scraped listing is displaying a broken image experience. Impact: the gallery shows the "Image unavailable" placeholder for every photo on all scraped listings.

### Price Clarity
**File:** `components/listing/BookingForm.tsx:254-257`

Price is shown prominently at the top of the sidebar card via `PriceDisplay` at `size="xl"` (2xl/bold) with "per person / night" label. A running total (nights × guests × price) appears inline in the date step once dates are selected (`BookingForm.tsx:323-328`). Good.

### Description Quality
**File:** `components/listing/ListingDetail.tsx:116-121`

Description renders with `whitespace-pre-line` to preserve line breaks. No character truncation or "Read more" expansion. For long descriptions this will extend the page without a fold mechanism. Minor: no formatting support (bold, lists) beyond raw line breaks.

### Reviews Section
**File:** `components/listing/ReviewSection.tsx`

- Zero-review state: renders "No reviews yet. Be the first to share your experience!" with a centered empty message (`ReviewSection.tsx:181-184`) — appropriate.
- Rating summary shows large number + star row + count when reviews exist.
- Review submission requires `canReview` prop to be true (gated by completed booking). The `canReview` prop is never passed from `ListingDetail` when rendering scraped listings — it always uses the default `undefined` (falsy), so the write-review button never appears. This is correct behavior for unauthenticated users but means post-booking review writing is broken unless the `bookingId` prop is also wired.
- No pagination — all reviews (up to 20 from DB) render in a single scroll.

### Availability Calendar
**File:** `components/listing/AvailabilityCalendar.tsx`

Custom-built, not a library. Good: range selection with hover preview, unavailable day strikethrough, per-day dynamic pricing display (yellow dot, `$X` sub-label), retry on fetch error, loading skeleton, range validation (no selection across blocked dates), ARIA grid roles, labels. Navigation buttons are accessible (44px+ via Button component).

Minor issue: calendar renders as a single month with navigation. Airbnb shows two months side by side for range selection. On desktop there is enough space in the sidebar to show two months, reducing clicks for cross-month ranges. On mobile a single month is appropriate.

### CTA Placement (Mobile)
**File:** `components/listing/ListingDetail.tsx:207`, `components/listing/BookingForm.tsx:252`

The sidebar uses `lg:sticky lg:top-24` — sticky only activates at `lg` (≥1024px). On mobile the grid collapses to 1 column (`grid-cols-1 lg:grid-cols-3`), meaning the `BookingForm` card renders at the **bottom** of the main content — below photos, description, host info, and reviews. The user must scroll past the entire listing to find the booking CTA. This is a significant mobile conversion barrier.

The `BookingForm` card itself also has `sticky top-24` (`BookingForm.tsx:252`) but this has no effect on mobile because it's not inside a scrolling column — it's a block element in the normal flow.

---

## Booking Flow

### Date Selection
**File:** `components/listing/AvailabilityCalendar.tsx`

Good: instruction bar guides the user ("Select check-in date" → "Aug 5 → Select check-out" → "Aug 5 — Aug 8 · 3 nights"). Range hover preview works. Clear button (X) to reset. Per-day pricing shown inline. Legend at bottom (Selected / Unavailable / Special price).

Minor: no visual cue for minimum stay if the listing has one. The calendar will allow selecting a single day (`check_in` only, no `check_out`) and `use-booking.ts:82` treats this as 1 night (`Math.max(1, ...)`). A user who selects only check-in will proceed thinking they booked 1 night without seeing a check-out — this is confusing and is technically a bug if the provider requires multi-night stays.

### Guest Count
**File:** `components/listing/BookingForm.tsx:274-320`

Increment/decrement buttons with min/max enforcement. Min/max guards are correctly bound to `listing.min_guests` / `listing.max_guests`. Count display has `w-10 text-center font-semibold text-lg` — clear. Buttons are `h-8 w-8` (32px) — **below the 44px minimum tap target** for mobile. This is a minor accessibility concern.

### Price Breakdown
**File:** `components/listing/BookingForm.tsx:106-140` (PriceSummary), step 3 (review) and step 4 (payment)

Full breakdown shown at Review step and again at Payment step: base × guests × nights, 12% service fee, and bold total. Currency labeled (USD). No hidden fees. Clean and transparent.

Note: the `PriceSummary` component shows "per person / night" pricing but the calculation in `use-booking.ts:85` multiplies `price_usd × guest_count × nights`. Verify with product whether the nightly rate is per-person (correct for experiences) or per-unit (correct for accommodations). The label says "per person / night" which is consistent with the calculation.

### Payment Form — Stripe
**File:** `hooks/use-booking.ts:142-164`, `app/api/stripe/checkout/route.ts`

Stripe is implemented as a hosted checkout redirect (not an embedded Stripe Elements form). When the user selects "card" and clicks Pay, the client POSTs to `/api/stripe/checkout` which returns a Stripe checkout URL and redirects. This means Stripe's full hosted page replaces the funnel entirely — the user leaves the VZ Explorer domain. This is safe and PCI-compliant but breaks the in-flow experience. There is no Stripe Elements integration.

No error state is shown if the Stripe redirect fails other than a toast (`toast.error`) — the form stays on the payment step with no visual feedback beyond the toast.

### Zelle / USDT Payment
**File:** `components/listing/BookingForm.tsx:574-633`

Well-executed: payment details card shows Zelle email or USDT wallet address with copy-to-clipboard button, amount, and reference code. Instructions paragraph below. The `paymentDetails` state is populated from the `/api/bookings` POST response. Clean implementation.

### Discount Code
**Files:** `app/api/discount-codes/validate/route.ts` — exists and is fully implemented with percentage/fixed discount logic, expiry, usage limits, and minimum booking validation. `components/listing/BookingForm.tsx` — **no discount code input exists anywhere in the form**. The entire backend feature is invisible to users. This is a P0 business gap — especially if influencer/creator codes are part of the marketing strategy.

### Progress Indicators
**File:** `components/listing/BookingForm.tsx:76-104` (StepIndicator)

4-step indicator at top of card: Dates / Your Info / Review / Payment. Completed steps show a checkmark with `bg-status-confirmed`. Current step is `bg-primary`. Future steps are `bg-muted`. Step labels are hidden on mobile (`hidden sm:block`) — only the numbered circles show. This is adequate but the numeric circles are `w-6 h-6` (24px) which is below minimum tap target — fine since they're indicators not interactive.

### Error States
- **Network failure on booking creation:** `use-booking.ts:134` — `toast.error()` fires with the server error message. The form stays on the review step. User can retry. Adequate but no persistent inline error message.
- **Card payment failure:** If `/api/stripe/checkout` fails, `toast.error()` fires and the user stays on the payment step. No inline error.
- **Zelle/USDT PATCH failure:** `handleManualPaymentConfirm` catches the error but redirects to confirmation anyway (`use-booking.ts:176-178`) — this is intentional (booking already created) but the user won't know the status update failed.
- **Missing dates:** `submitBooking` validates and fires `toast.error('Please select a check-in date')`. But the "Continue" button is disabled when `check_in` is empty (`canProceedFromSelect = !!formData.check_in`), so this toast should never fire in normal flow.

---

## Booking Confirmation

**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx`

### What's present and working
- Status card with contextual icon + message per status (confirmed / payment_submitted / pending)
- Confirmation code in large monospaced font with one-click copy
- QR code (`qrcode.react`) with "Show this at check-in" label — nice touch
- Full booking details card: experience name, check-in/out, guests, price breakdown with line items
- Guest info card: name, email, phone, special requests
- Manual payment pending notice for Zelle/USDT with clear next-steps (WhatsApp + code + screenshot)
- "Add to Calendar" (ICS download) and "Share via WhatsApp" actions
- "Build a trip around this" upsell card to `/itineraries`

### Missing
**P1: No "View my bookings" or "My Trips" CTA.** The only navigation links are "Back to home" and "Explore more experiences" (both go to `/`). After completing a booking, the most natural next action is to view all bookings. The confirmation page should have a prominent "View my trips" button pointing to `/trips`. The `/trips` tab bar icon exists but the user has no explicit guidance to go there.

**Minor:** Dates display as raw ISO strings (`booking.check_in` rendered directly, e.g. `2026-08-05`) — not formatted. The booking detail page uses `format(parseISO(...), 'MMM d')` correctly, but the confirmation page skips formatting for the check-in/out rows (`ConfirmationClient.tsx:212-219`).

**Minor:** The `completed` status maps to `bg-status-info` (blue) in `STATUS_CONFIG` — visually this looks the same as `payment_submitted` (also info/blue). A completed stay should use `bg-status-confirmed` (green) to feel positive.

---

## My Trips

**File:** `app/(tourist)/trips/page.tsx`

### Upcoming vs Past
- `upcoming` filter: `status === 'confirmed' && isFuture(parseISO(b.check_in))` — line 249-251
- **P1 Bug:** Bookings with `status === 'pending'` or `status === 'payment_submitted'` are **excluded from the Upcoming tab**. A user who just requested a booking (not yet confirmed) or submitted Zelle payment will see an empty Upcoming tab. They will be confused about whether their booking was received. These statuses should appear in Upcoming (or a dedicated "Pending" section).
- `past` filter: `isPast(parseISO(b.check_out))` — includes cancelled bookings that had past checkout dates. These will appear in the Past tab even if cancelled.

### Status Badges
**P2:** Raw status strings are rendered directly (`{booking.status}` at line 94) — e.g. "payment_submitted" or "confirmed" with no human label mapping. Compare with the booking detail page which maps to "Payment Sent" / "Confirmed". The `STATUS_COLORS` map provides colors but no label translation.

**P2:** Status badge colors use hardcoded Tailwind classes (`bg-green-100 text-green-800`, `bg-yellow-100 text-yellow-800`, `bg-red-100 text-red-800`, `bg-blue-100 text-blue-800`) instead of the `status-*` semantic tokens from DESIGN.md. This breaks dark mode and is flagged in the decisions log as a known issue.

### Cancel Option
Inline cancel in the `BookingCard` component: "Cancel booking" button reveals "Are you sure?" confirmation inline (not a modal). Simple and low-friction. `canCancel` only allows cancellation when `status === 'confirmed' && days >= 1` — correct. The modal-less inline confirm is appropriate for a card-level action.

However, there is no refund estimate shown in the trips list cancel flow — the refund estimate logic exists in `bookings/[id]/page.tsx:40-45` (getRefundEstimate) but is not used in the trips card cancel flow. Users cancelling from the trips page don't see what they'll get back.

### Empty States
All 4 tabs have empty states with icon, descriptive text, and a CTA link. These meet the DESIGN.md spec ("Never just 'No items found'"). The CTAs use `text-sky-500` color — this should use `text-primary` to align with design tokens.

### Saved Places
Renders a 2-column grid of place cards with cover image, name, location, price. Uses a raw `<img>` tag (`trips/page.tsx:385`) instead of `next/image` — this won't be optimized or benefit from the error fallback, and will load full-resolution images on mobile.

### Recently Viewed
Well-implemented using the `useRecentlyViewed` hook — shows viewed_at timestamp, cover image with category overlay badge, price. Uses `next/image` correctly with `fill`. Minor: always shows regardless of tab — it renders at the bottom of the page even when viewing "Past" or "Itineraries" tabs. This is mildly distracting.

---

## Mobile Booking Experience

**Overall: usable but not delightful. Two hard friction points.**

### Booking Widget — Not Sticky on Mobile
**P1:** `ListingDetail.tsx:207` — `lg:sticky lg:top-24`. On mobile (< 1024px), the booking card renders below all main content. The user must read the title, view photos, read description, see includes/excludes, read host bio, scroll through reviews, and scroll past the itinerary button before reaching the booking form. This is the single largest conversion barrier in the funnel. Airbnb solves this with a fixed bottom CTA bar on mobile ("$X / night — Reserve") that opens a bottom sheet.

### Mobile Tab Bar
`app/(tourist)/layout.tsx:10` — `pb-16 md:pb-0`. Main content has 64px bottom padding to account for the tab bar. This is correct.

### Tap Target Sizes
- Guest count +/- buttons in `BookingForm`: `h-8 w-8` (32px) — below 44px minimum.
- Calendar day buttons: `w-10 h-10` (40px) — slightly below 44px. Acceptable given density but borderline.
- Step indicator circles: `w-6 h-6` — not interactive, fine.
- All primary action buttons (Continue, Book Now, Pay) are `w-full py-3` — adequate height.

### Date Picker on Mobile
The single-month calendar with 10px day buttons (40px touch target) works on mobile but is cramped. Scrolling to see subsequent months requires the nav chevrons. No swipe gesture support.

---

## Trust Signals

### Listing Page
- Verified badge: `listing.provider?.is_verified` renders a "Verified" badge next to the host name (`ListingDetail.tsx:172`). Present.
- Review count: shown in the header (`pluralize(listing.total_reviews, 'review')`). Present.
- Safety badge: `SafetyBadge` component shows the `safety_level` field. Present.
- Featured badge: shown for `is_featured` listings. Present.
- Instant booking vs request indicator: shown at the review step with a colored pill ("Instant confirmation — pay now" / "Provider confirms within 24h — no payment now"). Present.

### Scraped Listings
Scraped listings show the full booking flow (`ScrapedListingView` is only for unboarded listings; boarded scraped listings get `ListingDetail`). However, they have `provider: undefined` — the provider section, host name, verified badge, and WhatsApp contact button all silently disappear. This reduces trust for scraped properties. There is no fallback "Awaiting verification" state.

### Pricing Transparency
Full breakdown (subtotal + 12% service fee + total) is shown at the Review step **before** the user commits to Book. No surprise fees at payment. This is Airbnb-level transparency.

### Payment Security
The Stripe redirect goes to stripe.com — browser address bar will show Stripe's domain, which is a trust signal. Zelle and USDT flows stay on-platform with clear instructions.

---

## Priority Issues

### P0 — Broken: Users Can't Complete Core Actions

**P0-1: Listing images broken for all scraped properties**
- **Files:** `data/scraped-listings.json` (5,394 `photo_reference` URLs), `components/common/ImageGallery.tsx` (`GalleryImage` fallback handles it gracefully with `ImageOff` icon)
- **Root cause:** `cover_image_url` and `photos` arrays use the deprecated Places API format (`maps.googleapis.com/maps/api/place/photo?...&photo_reference=...`). The new Places API proxy (`/api/places/photo`) rejects these via SSRF guard. `next.config.ts:29-31` allows `maps.googleapis.com` as a remote pattern so next/image won't block it, but the API returns an error at the Google endpoint.
- **Secondary concern:** The API key (`AIzaSyATTNCc2-dRb6XZI40FvFJVmCIsz1yWeqE`) is hardcoded in `data/scraped-listings.json` — visible in source. This key should be rotated.
- **Fix:** Either migrate photo references to the new Places API format and route through the proxy, or replace with Unsplash/Cloudinary-hosted images for scraped listings.

**P0-2: Discount code UI does not exist**
- **Files:** `app/api/discount-codes/validate/route.ts` (fully functional backend), `components/listing/BookingForm.tsx` (no discount input)
- **Impact:** Influencer referral codes (the platform's core growth mechanic per DESIGN.md) cannot be redeemed by users. Revenue from discount-tracked conversions is uncapturable.
- **Fix:** Add a collapsible "Have a promo code?" input at the Review or Payment step, POST to `/api/discount-codes/validate`, and apply the returned `discount_amount_usd` to the total display and booking submission.

### P1 — High Friction or Confusion

**P1-1: Mobile booking CTA buried below the fold**
- **File:** `components/listing/ListingDetail.tsx:207` — `lg:sticky lg:top-24` (no mobile sticky)
- **Fix:** Add a fixed bottom booking bar on mobile: `<div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t shadow-lg md:hidden">` with price + "Reserve" button that scrolls to / opens the booking form. The `bottom-16` accounts for the MobileTabBar.

**P1-2: Pending/payment_submitted bookings invisible in My Trips**
- **File:** `app/(tourist)/trips/page.tsx:249-251`
- **Fix:** Change `upcoming` filter to `(b.status === 'confirmed' || b.status === 'pending' || b.status === 'payment_submitted') && isFuture(parseISO(b.check_in))`.

**P1-3: No "View my trips" CTA on confirmation page**
- **File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx`
- **Fix:** Add a `<Button asChild variant="default"><Link href="/trips">View my trips</Link></Button>` as the primary CTA alongside or replacing "Back to home".

**P1-4: Single check-in date allowed without check-out**
- **File:** `hooks/use-booking.ts:79-83`, `components/listing/BookingForm.tsx:212`
- `canProceedFromSelect = !!formData.check_in` — check-out is not required to advance. With only a check-in, `getNights()` returns `Math.max(1, ...)` which is 1 night. The Review step shows `check_out` as same as check-in (the `|| formData.check_in` fallback at `BookingForm.tsx:453`).
- **Fix:** Either require check-out selection before enabling Continue, or clearly label it as a day-use / 1-night booking.

### P2 — Medium: Polish

**P2-1: Raw status strings in My Trips booking cards**
- **File:** `app/(tourist)/trips/page.tsx:94` — `{booking.status}` rendered directly
- **Fix:** Map `booking.status` to human labels matching the STATUS_CONFIG in `bookings/[id]/page.tsx`.

**P2-2: Hardcoded status badge colors in trips page**
- **File:** `app/(tourist)/trips/page.tsx:47-52`
- **Fix:** Replace `bg-green-100 text-green-800` etc. with semantic tokens (`bg-status-confirmed/15 text-status-confirmed` etc.) per DESIGN.md v0.3.5.

**P2-3: Confirmation page date formatting**
- **File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx:212-219`
- Dates show as raw ISO strings (`2026-08-05`). Use `format(parseISO(booking.check_in), 'EEE, MMM d, yyyy')`.

**P2-4: No refund estimate in trips-list cancel flow**
- **File:** `app/(tourist)/trips/page.tsx:64-80` (`handleCancel` in `BookingCard`)
- The `getRefundEstimate` function exists in `bookings/[id]/page.tsx` but the inline cancel in the trips list shows no refund info. Users cancel blind.

**P2-5: `completed` status uses blue (info) color on confirmation**
- **File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx:56-59`
- `completed` maps to `text-status-info` / `bg-status-info`. Should use `text-status-confirmed` / `bg-status-confirmed` (green) for a positive completed state.

**P2-6: Guest count buttons below 44px on mobile**
- **File:** `components/listing/BookingForm.tsx:281-313`
- Buttons are `h-8 w-8` (32px). Increase to `h-11 w-11` or add `min-h-[44px] min-w-[44px]`.

**P2-7: Saved places uses raw `<img>` not `next/image`**
- **File:** `app/(tourist)/trips/page.tsx:385`
- Will load unoptimized images. Replace with `<Image fill />` or `<Image width height />`.

**P2-8: Empty state CTAs use `text-sky-500` not `text-primary`**
- **File:** `app/(tourist)/trips/page.tsx:194` and inline in `BookingCard:119`
- Off-token. Replace with `text-primary` / `bg-primary` per DESIGN.md.

### P3 — Low

**P3-1: No two-month calendar view on desktop**
- Single-month view requires extra nav clicks for cross-month date ranges. Consider showing current + next month side by side when viewport ≥ 768px.

**P3-2: Review section has no pagination**
- Up to 20 reviews render in a single long list. Add "Show more" button or virtual scroll for high-review listings.

**P3-3: Recently Viewed renders on all My Trips tabs**
- Shows even when viewing Past/Saved tabs, creating visual noise. Conditionally show only on the Upcoming or Saved tabs, or move to a dedicated section.

**P3-4: `whitespace-pre-line` on description with no "Read more"**
- Long descriptions on `ListingDetail.tsx:118-121` render in full. Add a line-clamp with "Read more" toggle for descriptions over 400 characters.

**P3-5: Stripe hosted checkout leaves the platform**
- The payment redirect sends users to `stripe.com`. For a travel marketplace, embedded Stripe Elements would keep the payment in-flow and improve conversion.

**P3-6: Cancel confirmation in booking detail uses native `alert()`**
- `app/(tourist)/bookings/[id]/page.tsx:126` — `alert('Failed to cancel booking...')`. Replace with a toast or inline error.

---

## Summary Table

| ID | Area | Issue | Severity |
|----|------|-------|----------|
| P0-1 | Images | All scraped listing images broken (old Places API format + exposed key) | P0 |
| P0-2 | Booking | Discount code UI missing despite functional backend | P0 |
| P1-1 | Mobile | Booking CTA buried on mobile, no sticky bottom bar | P1 |
| P1-2 | My Trips | Pending/payment_submitted bookings invisible in Upcoming | P1 |
| P1-3 | Confirmation | No "View my trips" CTA on confirmation page | P1 |
| P1-4 | Booking | Single check-in without check-out advances flow as "1 night" silently | P1 |
| P2-1 | My Trips | Raw status string displayed (not human label) | P2 |
| P2-2 | My Trips | Hardcoded Tailwind status colors instead of semantic tokens | P2 |
| P2-3 | Confirmation | Dates shown as ISO strings, not formatted | P2 |
| P2-4 | My Trips | No refund estimate in trips-list cancel flow | P2 |
| P2-5 | Confirmation | `completed` status uses blue (info) instead of green (confirmed) | P2 |
| P2-6 | Booking | Guest count +/- buttons are 32px, below 44px touch target | P2 |
| P2-7 | My Trips | Saved places uses `<img>` not `next/image` | P2 |
| P2-8 | My Trips | Empty state CTAs use off-token `sky-500` instead of `primary` | P2 |
| P3-1 | Booking | Single-month calendar; no 2-month desktop view | P3 |
| P3-2 | Listing | No review pagination | P3 |
| P3-3 | My Trips | Recently Viewed shows on all tabs | P3 |
| P3-4 | Listing | No description "Read more" collapse | P3 |
| P3-5 | Payment | Stripe hosted checkout leaves platform | P3 |
| P3-6 | Booking Detail | Cancel failure uses native `alert()` | P3 |
