# TODOS

## Tests

All pre-existing test failures resolved — **Completed: v0.3.1.0 (2026-04-18)**

- 435 tests passing across 34 suites (0 failures)

**Noticed on branch:** feat/itinerary-planning (v0.3.0.0)

## P2 Polish (from UX stack)

- P2-1: Grid ↔ Map view toggle on /explore — **Completed: v0.3.3.0 (2026-04-19)**
- P2-2: Filters on /explore (sort by rating, price, reviews) — **Completed: v0.3.3.0 (2026-04-19)**
- P2-3: Breadcrumbs — **Completed: v0.3.3.0 (2026-04-19)**
- P2-4: 3-column grid on desktop — **Completed: v0.3.3.0 (2026-04-19)**
- P2-7: Smart tag accuracy (wired to real listing attributes) — **Completed: v0.3.3.0 (2026-04-19)**
- P2-10: "My Trip" persistent floating button — **Completed: v0.3.3.0 (2026-04-19)**
- P2-13: Share link on itinerary detail — **Completed: v0.3.3.0 (2026-04-19)**
- P2-17: Cancellation shortcut from /trips — **Completed: v0.3.3.0 (2026-04-19)**

## P0 — Landing Page (from design review v0.3.5) — **Completed: v0.3.5.0 (2026-04-19)**

- Landing page built at / with: Hero (Fraunces serif headline), trust bridge (3 steps), editorial picks (asymmetric magazine layout), category icon strip, stats strip, AI planner teaser, social proof, CTA banner
- No longer redirects to /library

## P0 — Three-Font Typography System (from design review v0.3.5) — **Completed: v0.3.5.0 (2026-04-19)**

- Fraunces (--font-display), Plus Jakarta Sans (--font-body), Inter (--font-sans) all loaded via next/font/google
- CSS variables mapped in globals.css @theme block
- font-heading class uses Fraunces for all section headings

## P0 — Color Audit + Semantic Status Tokens (from design review v0.3.5)

**Replace all hardcoded Tailwind colors with design system tokens**

- **What:** The codebase runs two parallel color systems: OKLCH design tokens in globals.css AND hardcoded Tailwind colors (sky-500, green-100, gray-900, etc.) in 8+ files. Dark mode is defined but breaks because components hardcode light colors.
- **Why:** Blocks dark mode, blocks theme consistency, creates maintenance burden. Every hardcoded color is a dark mode bug.
- **How:** (1) Add status tokens to globals.css: --status-confirmed (green), --status-pending (gold), --status-cancelled (red), --status-info (blue). (2) Systematic replacement: bg-green-100 -> bg-status-confirmed/10, text-gray-900 -> text-foreground, bg-white -> bg-background, bg-sky-500 -> bg-primary, etc. (3) Fix chart hex colors to use CSS variables. (4) Fix ScrapedListingView hardcoded grays.
- **Priority:** P0 — blocks dark mode and theme consistency

## P0 — Interaction State Library (from design review v0.3.5)

**Build ErrorBoundary, SkeletonCard, EmptyState, AuthGuard components**

- **What:** The platform has zero error states. The trips page returns `null` (blank white screen) for unauthenticated users. Loading states are bare pulse boxes. Empty states use emoji icons. No error boundaries exist.
- **Why:** Production-readiness blocker. A blank screen for unauthed users is a critical UX bug. Emoji empty states look amateurish.
- **How:** (1) ErrorBoundary: friendly message + retry + contact support. (2) SkeletonCard/SkeletonList: shimmer animation, content-aware shapes matching actual card layouts. (3) EmptyState: custom SVG illustrations, headline, body, primary CTA. (4) AuthGuard: redirect to /login?next= with "Sign in to see your trips" message. Apply to all pages.
- **Priority:** P0 — trips page blank screen is a critical bug

## P1 — Merge Browse Pages + Unify ListingCard (from design review v0.3.5)

**Consolidate /library, /explore, /discover into single /explore**

- **What:** Three browse pages serve the same purpose with different card components, different filters, and confusing nav labels. The navbar "Explore" link goes to /library. Two competing ListingCard components exist (components/listing/ListingCard.tsx AND inline in ExploreClient.tsx).
- **Why:** User confusion (3 overlapping entry points). Duplicate card components diverge with every feature. Nav label mismatch erodes trust.
- **How:** (1) Merge into single /explore: category icon strip + filter bar + map toggle + listing grid. (2) Unify ListingCard: extract ExploreClient's features (tier badges, smart tags, add-to-trip) into canonical ListingCard.tsx with `variant` prop (bookable vs preview). Delete inline version. (3) Fix nav to 4 items: Explore | Plan | Map | Trips.
- **Priority:** P1 — simplifies navigation and eliminates duplicate code
- **Depends on:** Landing page (P0) must exist first since library hero moves there

## P1 — Responsive + Accessibility Overhaul (from design review v0.3.5)

**Mobile navigation, provider responsive sidebar, WCAG AA compliance**

- **What:** Consumer has no mobile navigation (links hidden, no hamburger/bottom bar). Provider sidebar is fixed 256px with no collapse, breaks on tablet/mobile. Messages page 3-column layout overflows. Touch targets below 44px. No focus indicators. Star ratings not screen-reader accessible. Animations ignore prefers-reduced-motion.
- **Why:** Mobile is unusable for both consumers and providers. WCAG failures are potential legal liability.
- **How:** (1) Consumer: 5-item bottom tab bar (Home | Explore | Plan | Trips | Profile). (2) Provider: grouped collapsible sidebar (desktop 240px, tablet 56px icons, mobile slide drawer). (3) Skip-to-content link. (4) focus-visible: ring-2 ring-primary on all interactive elements. (5) Min h-11 (44px) on all buttons. (6) aria-label on star ratings. (7) Status badges: icon + color (not color alone). (8) @media (prefers-reduced-motion) { animation: none }.
- **Priority:** P1 — blocks mobile usability and WCAG compliance

## P1 — Sticky Booking Card (from design review v0.3.5)

**Airbnb-style sticky price card on listing detail sidebar**

- **What:** The listing detail page buries the booking form below Add to itinerary, map, and cancellation policy. Price appears only as tiny text on browse cards. Users must scroll to find how much something costs and how to book it.
- **Why:** Directly impacts conversion. Price and booking action should be the first thing in the sidebar, visible at all times while scrolling.
- **How:** Right sidebar leads with sticky card: Price (large, prominent), star rating, date picker, guest count, price breakdown, Reserve button, cancellation policy summary. Sticky on desktop scroll (position: sticky, top: 80px).
- **Priority:** P1 — impacts conversion rate
- **Depends on:** Unified ListingCard (P1) should ship first for consistency

## P1 — Brand Mark Refresh (from design review v0.3.5)

**Replace generic map pin SVG with Fraunces wordmark**

- **What:** The Logo component renders a generic map pin SVG in sky-blue. The brand "VZ Explorer" is invisible against dozens of identical travel startup logos.
- **Why:** Brand is unmistakable in first screen? NO (litmus check failed). Without a distinctive mark, the platform has no visual identity.
- **How:** Replace map pin SVG with Fraunces serif wordmark "VZ" or "VZ Explorer" in warm gold accent color. Used in Navbar, Footer, and provider sidebar. Single component update.
- **Priority:** P1 — blocks brand recognition
- **Depends on:** Typography system (P0) must load Fraunces first

## P1 — Scraped Listing UX (from design review v0.3.5)

**Separate tier for non-bookable listings with clear labeling**

- **What:** Scraped (non-onboarded) listings show fabricated prices ($60-$185 via estimateListingPrice()) on browse cards, then land on "Not yet on platform" dead end. This is the most trust-destroying moment in the user journey.
- **Why:** Users click expecting a bookable experience and get disappointed. Fabricated prices set false expectations. The emotional arc breaks at this exact point.
- **How:** (1) Browse card: "Preview" badge (muted), no price, slightly muted opacity (0.85), "View details" button (not "Book"). (2) Detail page: full info + prominent "Coming Soon" banner + "Request this provider join" CTA + related BOOKABLE listings below. (3) Delete estimateListingPrice() function.
- **Priority:** P1 — blocks trust
- **Depends on:** Unified ListingCard (P1) for consistent badge system

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

- SmartStarters in itinerary panel + rich AI message rendering + punchy AI prompt — **Completed: v0.3.4.0 (2026-04-19)**
- All P0 + P1 UX items shipped — **Completed: v0.3.0.0 (2026-04-18)**
- `@testing-library/dom` installed — **Completed: v0.3.0.0 (2026-04-18)**
- `BookingForm` null-safety fix — **Completed: v0.3.0.0 (2026-04-18)**
- QA remediation (10 issues, health 56→production) — **Completed: v0.3.2.0 (2026-04-19)**
- Hero Image LCP — `next/image` + priority + lazy-mount images 1–3 — **Completed: v0.3.2.0 (2026-04-19)**
- Editorial Content CMS — 743-line TS → 16 JSON files in `content/` — **Completed: v0.3.2.0 (2026-04-19)**
- P2 Polish (8 items: map toggle, sort, breadcrumbs, 3-col grid, smart tags, FAB, share, cancel) — **Completed: v0.3.3.0 (2026-04-19)**
