# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1.0] - 2026-04-10

### Fixed
- **Critical: Auth system** — moved role checks from client-writable `user_metadata` to server-only `app_metadata`, preventing privilege escalation
- **Critical: Payment confirmation** — Stripe webhook, Zelle expiry cron, and Zelle confirm routes now use service-role Supabase client (payments actually confirm)
- **Critical: Dispatch security** — all 3 dispatch API routes now require dispatcher/admin authentication (closes PII exposure)
- Stripe checkout sessions now expire correctly (`expires_at` instead of invalid `expires_after`)
- Stripe refunds now execute on cancellation (with idempotency key)
- Driver status resets to available when rides are cancelled (no more permanently locked drivers)
- Confirmation page no longer promises email/WhatsApp notifications that don't exist
- Cancel route auth reads `app_metadata` and removes dev bypass

### Added
- Complete booking checkout flow: passenger name/email/phone collection, payment method selection, Stripe redirect or Zelle confirmation
- Server-side quote re-validation at checkout (rejects >5% price manipulation)
- Zod schema validation on all booking inputs (email, phone, coordinates, string lengths)
- SHA-256 hashed access tokens (no more plaintext in database)
- Tracker API key verification with timing-safe comparison
- Database-based rate limiting for tracker pings (works on serverless, replaces broken in-memory Map)
- 61 unit tests: ride-status transitions, refund calculation, access tokens, booking validation, tracker validation

## [0.2.0.0] - 2026-04-07

### Added
- Itineraries marketplace page at `/itineraries` with hero section, filter chips (region, duration, budget), sort tabs, and responsive card grid
- Influencer Itineraries section showing creator-branded cards with follower counts and verified badges
- "Book This Trip" CTA with booking interest modal (email capture for launch notification)
- "Customize" button that clones an itinerary for authenticated users to edit
- Referral tracking system for influencer commission attribution (`?ref=` URL params with IP dedup)
- Admin itineraries management page with influencer pick toggle
- 8 curated seed itineraries across Los Roques, Merida, Canaima, Margarita, and Caracas
- 3 simulated creator profiles (venezolanaviajera, backpackerben, luxelatam) with referral codes
- DESIGN.md design system documenting OKLCH color palette, typography, spacing, motion, and component patterns
- Shaped loading skeletons that mirror card layout during data fetching
- ARIA tablist/tab roles on sort controls and focus-visible rings on all interactive elements
- Full test suite: API integration tests, component unit tests, E2E marketplace flow test

### Changed
- Extended ItineraryFeedCard with `showActions` prop for marketplace CTAs and recommendation badges
- Extended itinerary detail page with referral tracking and Book/Customize actions
- Updated GET /api/itineraries with filter query parameters and influencer picks support
