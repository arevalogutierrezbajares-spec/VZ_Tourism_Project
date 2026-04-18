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

## P1 — Editorial Content CMS

**Migrate `lib/editorial-content.ts` to a structured data source**

- **What:** The 743-line `lib/editorial-content.ts` file holds all category and destination editorial copy (headlines, intros, guides, quick stats) as hardcoded TypeScript. Each content update requires a code deploy.
- **Why:** As Venezuela coverage grows (more regions, more guides, seasonal updates), maintaining this in a TS file becomes a bottleneck and blocks non-developers from updating copy.
- **How:** Options in priority order: (1) Contentlayer + MDX once the Next.js 16 peer dep issue resolves, (2) JSON files in `content/` that TS imports (same deploy requirement, but simpler for non-TS editors), (3) headless CMS (Sanity, Contentful) with ISR revalidation.
- **Depends on:** Contentlayer peer dep fix (tracked separately). JSON option is unblocked now.
- **Priority:** P1 — before onboarding editorial contributors

## P1 — Hero Image LCP Optimization

**Audit and optimize the HeroSection LCP element**

- **What:** The hero crossfades between 2 images every 6s with a Ken Burns effect. Both images sit in the DOM simultaneously (CSS opacity switch). The first image is now using `next/image` with `priority` (shipped 2026-04-18), but the `sizes="100vw"` is a blunt instrument — the browser downloads a full-viewport image even on mobile.
- **Why:** Hero is the single most important LCP element. Proper responsive `sizes` (e.g., `(max-width: 768px) 100vw, 100vw`) combined with correct image dimensions in the Next.js config would reduce mobile payload by 40-60%.
- **How:** (1) Define explicit `width`/`height` or use `fill` with `sizes` calibrated to actual breakpoints, (2) consider serving a single static hero on mobile to avoid dual-image memory pressure.
- **Priority:** P1 — directly affects Lighthouse score and mobile conversion

## WhatsApp Security

**Encrypt WhatsApp access tokens using Supabase Vault**

- **What:** `posada_whatsapp_config.access_token` is stored as plain text. Each token lets you send WhatsApp messages as that provider's number.
- **Why:** If the DB is compromised (service key leak, misconfigured RLS, insider), all provider WhatsApp identities are exposed.
- **How to fix:**
  1. Enable `vault` extension in Supabase: `CREATE EXTENSION IF NOT EXISTS vault;`
  2. For each row: `UPDATE posada_whatsapp_config SET access_token_vault_id = vault.create_secret(access_token, 'wa_token_' || id), access_token = '[encrypted]'`
  3. At query time: `SELECT vault.decrypted_secret(access_token_vault_id) AS access_token`
  4. Migration: add `access_token_vault_id UUID` column, backfill, then drop `access_token`
- **Depends on:** Supabase project with Vault enabled (available on Pro plan)
- **Priority:** P1 — before onboarding real providers

## Completed

- All P0 + P1 UX items shipped — **Completed: v0.3.0.0 (2026-04-18)**
- `@testing-library/dom` installed — **Completed: v0.3.0.0 (2026-04-18)**
- `BookingForm` null-safety fix — **Completed: v0.3.0.0 (2026-04-18)**
