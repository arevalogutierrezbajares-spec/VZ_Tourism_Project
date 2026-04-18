# TODOS

## Tests

**Pre-existing test failures — fix before next ship**

| Test | Error | Priority |
|------|-------|----------|
| `__tests__/integration/api/bookings.test.ts` | API returns 200/400 instead of expected 401 for unauthenticated requests | **P0** |
| `__tests__/integration/api/listings.test.ts` | Integration test failures (auth/mock mismatch) | **P0** |
| `__tests__/integration/api/stripe.test.ts` | Stripe integration test failures | **P0** |
| `__tests__/integration/api/track-referral.test.ts` | `Response` not available in test environment | **P0** |
| `__tests__/unit/components/ReferralTracker.test.tsx` | `Response` not available in jsdom environment | **P0** |
| `__tests__/unit/components/ItineraryFeedCard.test.tsx` | Multiple elements match "7 days" text (ambiguous query) | **P1** |
| `__tests__/unit/components/ListingWizard.test.tsx` | UI text mismatch (step labels changed) | **P1** |

**Noticed on branch:** feat/itinerary-planning (v0.3.0.0)

## P2 Polish (from UX stack)

- P2-1: Grid ↔ Map view toggle on /explore
- P2-2: Filters on /explore (price, dates, sort)
- P2-3: Breadcrumbs
- P2-4: 3-column grid on desktop
- P2-7: Smart tag accuracy (wire to real listing attributes)
- P2-10: "My Trip" persistent floating button
- P2-13: Share link on itinerary detail
- P2-17: Cancellation shortcut from /trips

## Completed

- All P0 + P1 UX items shipped — **Completed: v0.3.0.0 (2026-04-18)**
- `@testing-library/dom` installed — **Completed: v0.3.0.0 (2026-04-18)**
- `BookingForm` null-safety fix — **Completed: v0.3.0.0 (2026-04-18)**
