# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4.0] - 2026-04-19

### Added
- **SmartStarters in itinerary panel** — vibe selector (6 icons: beaches, mountains, culture, adventure, wildlife, cities) and duration chips (3 / 5 / 7 / 10 days) live in the right-panel trip preview. Selecting both auto-sends a structured prompt to the AI — zero typing required
- **Rich AI message rendering** — destination suggestion lines (`**Name** — desc`) become mini cards with a map-pin icon; bullets get styled dots; numbered lists get bold numbers; `**bold**` renders inline. Replaces flat whitespace-pre-wrap text

### Changed
- **AI concierge prompt rewrite** — system prompt is now punchy: ONE question per reply, max 3 sentences, bold for destinations. Eliminates walls of text and multi-question replies
- **onReady ref pattern** — PlanningChatPanel exposes `sendMessage` via a stable ref (fires once on mount, ref updated every render). Enables SmartStarters in parent to inject messages
- **PlanningChatPanel tests** — 7 tests revised for new API (welcome text, no built-in starters, onReady callback, external send, renderMarkdown matchers, Itinerary Ready card)

## [0.3.0.0] - 2026-04-18

### Added
- **WhatsApp AI Concierge** — posadas get a full AI-powered guest messaging system. Incoming WhatsApp messages are handled by an AI agent that can answer questions, quote pricing, and book stays, all wired to your Supabase listings
- **Multilingual conversation trail** — every WhatsApp conversation is stored with an English audit log alongside the original language, so operators can review AI responses even when guests message in Spanish or Portuguese
- **Dynamic pricing engine** — AI concierge applies posada-specific pricing rules per season and room type. Human-in-the-loop escalation kicks in when the AI is uncertain, routing to the provider dashboard for manual reply
- **Posada knowledge base** — providers can upload FAQs, policies, and property details that the AI uses as context when answering guests
- **Provider messaging dashboard** — new brain panel at `/provider/dashboard/messages/brain` for managing AI knowledge, reviewing conversation history, and handling escalated conversations
- **Itinerary planning — full AI stack** — tourists can now build multi-day itineraries via conversational AI. Supports natural-language input, link extraction, text paste, and AI-suggested stops
- **Itinerary planning UI** — day sections, stop cards, add-stop modal, fill-by-AI modal, import-from-links modal, extract-from-text modal, and an inline planning chat panel
- **Google Places integration** — stop cards autocomplete using Places API with photo resolution
- **Supabase migrations 009–014** — itinerary planning schema, WhatsApp messaging tables, posada knowledge base, pricing rules, and multilingual trail columns
- **UX polish** — two-tier booking (instant vs. request-to-book), QR codes on confirmation, "Build a trip" CTA, itinerary-aware explore grid, booking status callouts, cancellation refund estimates, WhatsApp contact on listing detail, Mapbox map on listing detail, AI search overlay, category/region ISR landing pages

### Fixed
- `BookingForm` null-safety on `guest_name` and `guest_email` fields (prevented crash when form initializes with empty state)
- Pending and payment-submitted bookings now appear in the /trips "Upcoming" tab (were silently filtered out)
- `@testing-library/dom` peer dependency installed, unblocking 18 previously-skipped test suites

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
