# E2 Execution Report — Booking Funnel
**Date:** 2026-04-20
**Agent:** E2 — Booking Funnel

---

## Summary

All assignable issues addressed. Skipped issues noted below with rationale.

---

## Fixes Applied

### P0-BOK-002 — Discount code UI — DONE
**File:** `components/listing/BookingForm.tsx`, `hooks/use-booking.ts`

- Added `discount_code_id?: string` to `BookingFormData` interface in `use-booking.ts`
- Added discount state (`promoOpen`, `promoCode`, `promoLoading`, `promoSuccess`, `promoError`) and `handleApplyPromo` / `handleRemovePromo` handlers to `BookingForm`
- Added collapsible "Have a promo code?" section in the review step with:
  - Text input (auto-uppercased) + "Apply" button
  - POSTs to `/api/discount-codes/validate` with `{ code, booking_total_usd }`
  - Green success state showing discount amount with "Remove" link
  - Red error state showing message from API
- `PriceSummary` component updated to accept `discountAmount` prop and show a green discount line
- Payment step `PriceSummary` also updated to reflect discount
- "Pay $X" button shows discounted total when promo is applied
- `discount_code_id` passes through to booking POST via `...formData` spread

### P0-BOK-003 — Provider dashboard PII scoping — SKIPPED
**Reason:** `app/(provider)/dashboard/bookings/page.tsx` is in E3's file territory. Noted for E3.

### P0-BOK-004 — Provider PATCH ownership check — DONE
**File:** `app/api/bookings/[id]/route.ts`

- Queries `profiles` table to check if `user.role === 'provider'`
- If user is a provider and `guest_email` check fails, performs a secondary path:
  1. Looks up `providers` row by `user_id`
  2. Looks up `listings` row by `listing_id` from the booking
  3. Checks `listing.provider_id === provider.id`
- If both guest and provider checks fail, returns 401
- JSON file-store fallback unchanged (still guest-only, as providers use Supabase)

### P1-BOK-001 — Sticky mobile booking CTA — DONE
**File:** `components/listing/ListingDetail.tsx`

- Added `scrollToBooking()` helper that scrolls to `#booking-form-anchor`
- Added `id="booking-form-anchor"` to the sidebar booking form wrapper
- Added `fixed bottom-16 left-0 right-0 z-30 lg:hidden` sticky bar showing price per night + "Reserve" button
- Uses `bg-background`, `text-foreground`, `border-border`, `text-primary`, `text-muted-foreground` design tokens

### P1-BOK-002 — Pending/payment_submitted in My Trips — DONE
**File:** `app/(tourist)/trips/page.tsx`

- Changed `upcoming` filter from `status === 'confirmed'` to include `'pending'` and `'payment_submitted'`
- Added `payment_submitted` and `refunded` to `STATUS_COLORS` map

### P1-BOK-003 — "View my trips" CTA on confirmation — DONE
**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx`

- Added `<Button asChild className="w-full"><Link href="/trips">View my trips</Link></Button>` as primary CTA above the calendar/share action buttons

### P1-BOK-004 — Availability check before booking creation — SKIPPED (waiting on E5)
**Reason:** Requires editing `app/api/bookings/route.ts` which E5 is actively modifying for auth guard. Must pull E5's changes first. Noted for follow-up.

### P1-BOK-005 — Stripe refund on provider cancellation — SKIPPED
**Reason:** `components/provider/ProviderBookingActions.tsx` is in E3's territory.

### P1-BOK-006 — Stripe checkout fallback reads file-store only — SKIPPED (waiting on E5)
**Reason:** `app/api/stripe/checkout/route.ts` — E5 is editing this file.

### P1-BOK-007 — $0 checkout crashes Stripe — SKIPPED (waiting on E5)
**Reason:** Same file as P1-BOK-006, waiting on E5 commit.

### P1-BOK-008 — No idempotency key on booking POST — SKIPPED (waiting on E5)
**Reason:** `app/api/bookings/route.ts` — E5 is actively modifying this.

### P2-BOK-001 — Raw status strings in My Trips — DONE
**File:** `app/(tourist)/trips/page.tsx`

- Added `STATUS_LABELS` map: `{ pending: 'Pending', payment_submitted: 'Payment Sent', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', refunded: 'Refunded' }`
- `BookingCard` renders `STATUS_LABELS[booking.status] ?? booking.status`

### P2-BOK-002 — Refund estimate in cancel flow — DONE
**File:** `app/(tourist)/trips/page.tsx`

- `getRefundEstimate` was found in `app/(tourist)/bookings/[id]/page.tsx` (local function, not exported)
- Inlined equivalent logic in `trips/page.tsx`
- Cancel confirmation now shows: "Estimated refund: $X.XX (label)" or "No refund — no refund applies"

### P2-BOK-003 — Confirmation dates as raw ISO strings — DONE
**File:** `app/(tourist)/booking/confirmation/ConfirmationClient.tsx`

- Added `import { format, parseISO } from 'date-fns'`
- `booking.check_in` and `booking.check_out` formatted as `'EEE, MMM d, yyyy'` with try/catch fallback

### P2-BOK-005 — Stripe webhook discount code double-increment — SKIPPED
**Reason:** `app/api/stripe/webhooks/route.ts` is in E5's API territory. Noted for E5.

---

## Files Modified

| File | Issues |
|------|--------|
| `hooks/use-booking.ts` | P0-BOK-002 |
| `components/listing/BookingForm.tsx` | P0-BOK-002 |
| `app/api/bookings/[id]/route.ts` | P0-BOK-004 |
| `components/listing/ListingDetail.tsx` | P1-BOK-001 |
| `app/(tourist)/trips/page.tsx` | P1-BOK-002, P2-BOK-001, P2-BOK-002 |
| `app/(tourist)/booking/confirmation/ConfirmationClient.tsx` | P1-BOK-003, P2-BOK-003 |

---

## Issues Requiring E5 Coordination

- **P1-BOK-004** — Availability overlap check in `app/api/bookings/route.ts` (add after E5's auth guard)
- **P1-BOK-006** — Stripe checkout Supabase fallback in `app/api/stripe/checkout/route.ts`
- **P1-BOK-007** — $0 checkout guard in `app/api/stripe/checkout/route.ts`
- **P1-BOK-008** — Idempotency key in `app/api/bookings/route.ts`
- **P2-BOK-005** — Discount code double-increment in `app/api/stripe/webhooks/route.ts`

---

## Issues Requiring E3 Coordination

- **P0-BOK-003** — Provider dashboard PII scoping (`app/(provider)/dashboard/bookings/page.tsx`)
- **P1-BOK-005** — Stripe refund on provider cancellation (`components/provider/ProviderBookingActions.tsx`)

---

## Typecheck Status

NOTE: `npm run typecheck` could not be run — Bash tool access was not granted during this session. All changes were reviewed manually for type correctness:

- `discount_code_id?: string` added to `BookingFormData` interface — compatible with spread into POST body
- `discountAmount?: number` added to `PriceSummary` props — optional, backwards compatible
- `getRefundEstimate` inlined in trips page — return type is `{ label: string; amount: number }`, used correctly
- `format` and `parseISO` from `date-fns` — already a project dependency (used in same file's `generateICS`)
- Provider ownership check in `[id]/route.ts` — all Supabase calls typed correctly via `Record<string, unknown>` cast pattern consistent with existing file style
- `Tag` and `ChevronDown` icons imported from `lucide-react` — standard library

**Recommendation:** Run `npm run typecheck` after Bash access is available or on next session start.
