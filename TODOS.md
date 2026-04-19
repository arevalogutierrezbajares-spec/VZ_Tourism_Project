# TODOS

## Tests

All pre-existing test failures resolved — **Completed: v0.3.1.0 (2026-04-18)**

- 435 tests passing across 34 suites (0 failures)

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

## P1 — PMS DESIGN.md (from design review)

**Create PMS DESIGN.md from plan tokens when PMS repo is initialized**

- **What:** The Posada PMS design tokens (colors, typography, spacing, radii, shadows, buttons, motion) are currently specified in the plan file (`tomas-deploy-whatsapp-ai-design-20260419-041500.md`, Section "UX Architecture > Design System"). When the PMS monorepo is created in Week 1, these tokens need to live in the PMS repo's own DESIGN.md file and Tailwind config.
- **Why:** The VZ Tourism Platform's DESIGN.md covers the marketplace (oklch teal-blue, Fraunces, editorial). The PMS is a separate product with different tokens (#0F766E teal, Inter, dense/functional). Without a PMS-specific DESIGN.md, implementer agents will either guess or pull from the wrong design system.
- **How:** Architect Agent extracts the token tables from the plan file into `DESIGN.md` at the PMS repo root + generates `tailwind.config.ts` with the CSS variables. One-time setup task.
- **Depends on:** PMS monorepo initialization (Week 1, Architect Agent)
- **Priority:** P1 — Week 1, blocks all UI work

## P2 — Creator Suite: Listing Match Quality

**Improve `matchSpotsBatch` with trigram similarity scoring**

- **What:** `lib/match-spots.ts` uses `ilike.%term%` title matching against the listings DB. Scores matches client-side by exact/partial string overlap. Works with the current listing count.
- **Why:** As the listings table grows beyond ~500 entries, false positives increase and match quality degrades. The 70% match confidence target for the creator TikTok import flow depends on accurate matches. If that target is missed, this is the first place to investigate.
- **How:** Replace the current scoring with Postgres `similarity()` function (pg_trgm extension, already enabled via `gin_trgm_ops` indexes). A single `SELECT *, similarity(title, $query) AS score FROM listings WHERE similarity(title, $query) > 0.3 ORDER BY score DESC` returns ranked candidates without the client-side scoring loop.
- **Depends on:** Creator Suite Phase 1 shipped and 70% match rate validated.
- **Priority:** P2 — monitor first, fix if target is missed

## P2 — Run Photo URL Migration

**Rewrite any stale Google Places URLs in the database**

- **What:** `scripts/migrate-photo-urls.mjs` scans `listing_photos.url` and `listings.photos_json` for raw `places.googleapis.com` URLs (which leak the API key) and rewrites them to use the `/api/places/photo` proxy.
- **How:** `SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-photo-urls.mjs --dry-run` (preview), then without `--dry-run` to apply.
- **Priority:** P2 — run once after deploying the photo proxy route

## Completed

- All P0 + P1 UX items shipped — **Completed: v0.3.0.0 (2026-04-18)**
- `@testing-library/dom` installed — **Completed: v0.3.0.0 (2026-04-18)**
- `BookingForm` null-safety fix — **Completed: v0.3.0.0 (2026-04-18)**
- QA remediation (10 issues, health 56→production) — **Completed: v0.3.2.0 (2026-04-19)**
