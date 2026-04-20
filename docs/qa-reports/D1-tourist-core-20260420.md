# D1 — Tourist Core UX/UI Review
**Date:** 2026-04-20
**Pages Reviewed:** Explore, Category, Region, Discover, Map, Safety
**Reviewer:** Senior UX/UI Design Review Agent

---

## Executive Summary

The tourist-facing core is structurally sound and has several genuinely well-executed pieces — the category/region hero pages are editorial-quality, the map UX is functionally complete, and the skeleton loader pattern is correctly applied in ExploreClient. However, the platform falls materially below the Airbnb bar in four systemic areas: (1) a split-taxonomy between ExploreClient (hotel/restaurant/experience) and the `/explore/category/` routes (beaches/mountains/etc.) creates cognitive dissonance for users navigating between them; (2) `BrowseListingCard` — the card used on the highest-traffic page — uses raw `<img>` tags instead of `next/image`, hardcodes 12 Tailwind palette colors instead of design tokens, and has a `rounded-xl` container when DESIGN.md specifies `rounded-2xl` for cards; (3) the Discover hero section uses hardcoded hex gradients and decorative gradient "orbs" which are explicitly listed as anti-patterns in DESIGN.md; (4) no page in scope uses the Fraunces display font that DESIGN.md mandates for editorial headlines, so the platform reads as SaaS rather than travel magazine. The two `ListingCard` implementations have meaningfully diverged in data shape, feature set, and visual design.

---

## 1. Information Hierarchy

**Explore (`/explore`):**
- The `h1` "Browse Venezuela" is `text-3xl font-bold` with no font-display treatment — it reads like a SaaS dashboard header, not a destination brand. DESIGN.md recommends Fraunces for display/editorial headings. No font-display or font-heading class is applied anywhere in the reviewed pages.
- The three category hero cards (160px tall, `rounded-2xl`) are well-proportioned and immediately scannable. The gradient overlay (`from-black/70 via-black/20`) ensures legibility. This section is the visual highlight of the page.
- Below the hero cards, the `ExploreClient` filter row appears before any listings — users see controls before content. On mobile this means the first viewport is entirely controls, no listings visible. Consider reordering so the first listing row is visible immediately below the fold.
- Result count ("X places found") renders in `text-sm text-muted-foreground` — adequate but not prominent.

**Category pages (`/explore/category/[slug]/`):**
- Hero section (380px/440px) is strong: breadcrumb at top-left, large editorial headline (`text-3xl sm:text-4xl md:text-5xl font-bold text-white`) bottom-left. Good hierarchy.
- "At a glance" sidebar card (`rounded-2xl border bg-muted/30 p-6 sticky top-24`) is well done — the `sticky` positioning keeps key facts visible while scrolling.
- **Bug:** When `content?.heroImage` is falsy (any category not in `CATEGORY_CONTENT`), the hero renders as a near-black gradient over an empty `<section>`. The image tag is inside a conditional `{content?.heroImage && ...}`. A category with no editorial image gets an entirely black hero with no fallback. `LISTING_CATEGORIES` has 8 entries (`beaches`, `mountains`, `cities`, `eco-tours`, `gastronomy`, `adventure`, `wellness`, `cultural`) and `CATEGORY_CONTENT` covers all 8 — but if a new category slug is added, this breaks silently.
- Guide article cards (`<article>`) at line 186 show "Read guide" with an ArrowRight icon but are wrapped in a plain `<article>` tag with no `<Link>` or `href`. Clicking "Read guide" does nothing. This is a dead-end UX flow that erodes trust.

**Region pages (`/explore/region/[slug]/`):**
- Hero section (420px/500px) is the strongest visual in the product: hero image + large headline + SafetyBadge inline with the region name. Very Airbnb-like.
- Quick facts bar (2/4 column grid) below hero is clean.
- Region breadcrumb: `Explore / Destinations / {Region}`. The "Destinations" link points to `/explore` (line 128), not a `/explore/destinations` page. This is a broken breadcrumb — "Destinations" navigates back to the same place as "Explore". The breadcrumb also omits "Home" as the first item, inconsistent with the Explore page which uses the `Breadcrumb` component with a Home link.
- Tab filtering (All / Hotels & Stays / Dining / Activities) is URL-based (no JS required) — good pattern.

**Discover (`/discover`):**
- Masonry grid is visually compelling. Category/region captions visible on each card.
- Hero section has poor information hierarchy: title reads "Discover Venezuela" with no subnavigation to Explore, no path forward once you find inspiration. There's no CTA that connects Discover → Explore listing grid.
- "Add to Trip" button on cards is hidden (opacity-0) until hover — invisible to mobile users who cannot hover. Mobile users have no affordance to add items to their trip from the Discover page.

**Safety Hub (`/safety`):**
- Clean card-based layout. Emergency contacts as `tel:` links is good.
- No cross-link to the map for visual zone visualization. A "View on Map" link from each region row (pointing to `/map`) would significantly increase utility and session depth.
- No breadcrumb.

---

## 2. Photo Grid & Visual Design

**Explore grid:**
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` in `ExploreClient.tsx` (line 308, 321). Matches DESIGN.md spec (1/2/3 col).
- Skeleton loader: 6 divs `rounded-xl bg-muted animate-pulse style={{ height: '360px' }}` — works but the `rounded-xl` does not match the `rounded-2xl` of `BrowseListingCard.compact` (which is `rounded-2xl`). Minor visual flash when content loads.
- `BrowseListingCard` (default variant, line 269): card container uses `rounded-xl` not `rounded-2xl`. DESIGN.md specifies `rounded-2xl` for cards (16px). `ListingCard.tsx` uses `rounded-2xl` correctly. This is a divergence between the two card implementations.
- Photo aspect ratio: `paddingBottom: '62.5%'` (16:10) — reasonable. Images use raw `<img>` with `loading="lazy"`, not `next/image`. Missing: LCP optimization, `sizes` attribute, blur placeholder, WebP serving, responsive srcset.
- No image fallback when `cover_image_url` is null at the primary explore surface. The `BrowseListingCard` fallback (colored gradient + emoji icon) is acceptable but feels low-fidelity vs. Airbnb.
- The category header cards in `page.tsx` (line 62-84) correctly use `next/image` with `fill` and `sizes` — good.

**Category page listing grid:**
- Line 240 uses `xl:grid-cols-4` — 4-column layout at XL breaks the 3-col spec in DESIGN.md. The DESIGN.md section on Layout explicitly states "3 col desktop for card grids". 4-column makes `ListingCard` (fixed aspect-ratio photo) narrower than optimal on large screens.
- Region page (line 292) has the same issue: `xl:grid-cols-4`.

**Discover masonry grid:**
- CSS columns (`columns: '4 280px', columnGap: '16px'`) produces a natural masonry. However at narrow mobile (320-360px), 280px column min-width will force 1 column but the gap calculation may produce a horizontal scroll on very narrow devices.
- The "Featured" badge (line 237) renders at `absolute top-3 left-1/2 -translate-x-1/2` — this overlaps with the category badge also at `top-3 left-3`. On short-caption cards, the Featured badge renders on top of the category badge. Two overlapping badges at the same vertical position.

---

## 3. Filters & Search

**ExploreClient filters:**
- Category tabs (All/Hotels/Restaurants/Experiences) and the `/explore/category/` routes use completely different taxonomies. ExploreClient uses `hotel | restaurant | experience` as category IDs (line 36-41). The category page routes use `beaches | mountains | cities | eco-tours | gastronomy | adventure | wellness | cultural`. A user who clicks "Beaches" in the category hero cards is routed to `/explore/category/beaches`, but the ExploreClient category filter has no "Beaches" tab. Navigation between the two surfaces is jarring.
- Sort dropdown: "Price: low to high" and "Price: high to low" options exist in the UI (lines 73-74) but the sort handler explicitly returns `0` for both (line 180) with comment "Price sorting removed — no reliable price data". These are non-functional UI elements that create a false expectation. Should be removed from the select options.
- Region select and search bar are well-labelled (`sr-only` labels) and debounced (300ms).
- View toggle (Grid/Map) uses `aria-pressed` correctly (lines 229, 244).

**Map filters (FilterOverlay):**
- The filter overlay is a bottom-sheet on mobile (`items-end`) and centered on desktop. Good pattern.
- Price range slider present but price data is unreliable for scraped listings — same issue as sort. Shows `$0 - $1000+` but this filter likely has no effect on scraped listings.
- Safety level filter pills use inline `style` with `level.color` for active state (line 131) — color alone signals state without an icon, which violates WCAG 1.4.1 (Use of Color). DESIGN.md v0.3.5 explicitly notes: "All status indicators must use icon + color, never color alone."
- Region filter uses `Badge` component (line 83) with `onClick`. `Badge` is not a button — missing keyboard activation on Enter/Space. Should use `button` element or add `role="button"` with keyboard handler.

**Map category chips:**
- `role="radiogroup"` with `role="radio"` on each button (line 218) — correct semantic pattern.
- Chips have `min-h-[36px]` (line 223) — slightly below the 44px minimum touch target specified in DESIGN.md. Should be `min-h-[44px]`.

---

## 4. Empty States

| Page | State | Quality | File:Line |
|------|-------|---------|-----------|
| ExploreClient | No results | Good — Search icon + "No results found" + hint to adjust filters | `ExploreClient.tsx:313` |
| ExploreClient → Following tab | Good — contextual "Follow creators" message | `ExploreTabs.tsx:65` |
| ExploreClient → No public itineraries | Adequate | `ExploreTabs.tsx:73` |
| Category listing section | Good — icon + "No listings yet" + AI CTA | `category/[slug]/page.tsx:246` |
| Region → filtered tab empty | Weak — Mountain icon + text only, no CTA to remove filter or try another tab | `region/[slug]/page.tsx:298` |
| Discover → no photos in category | Adequate — Compass icon + "No photos found" + hint | `DiscoverGrid.tsx:390` |
| Safety → no Supabase zones | Silent — the "Specific Zone Advisories" card simply doesn't render. No message to user | `safety/page.tsx:147` |
| Map → loading | Good — spinner + "Loading map..." | `MapContainer.tsx:450` |
| Map → token missing | Adequate placeholder | `MapContainer.tsx:484` |
| Map → error | Good — retry CTA | `MapContainer.tsx:464` |

**Missing empty states:**
1. **Region page filtered tab (P1):** Empty filtered tab (e.g., "No Dining listed yet in Los Roques") has no CTA to clear the filter or view "All" tab — user is stuck. File: `region/[slug]/page.tsx:298`.
2. **Safety zones (P2):** When DB is unavailable, the "Specific Zone Advisories" section silently disappears. Should show a "Zone data currently unavailable" message.
3. **Discover → unauthenticated "Add to Trip" (P1):** When `current` is null (no active itinerary), `handleAddToTrip` in `PhotoCard` shows `toast('Start planning a trip first!', { icon: '🗺️' })` but no CTA to create one. Toast disappears in 3s with no follow-up action. File: `DiscoverGrid.tsx:203`.

---

## 5. Loading States

- **ExploreClient:** Has correct `animate-pulse` skeleton grid (6 cards, 360px height) while `loading === true`. Good.
- **Category page:** Server-rendered (ISR). No client-side loading state needed.
- **Region page:** Server-rendered (ISR). No client-side loading state needed.
- **Map:** Spinner + "Loading map..." overlay while Mapbox initializes. Good. 10s timeout with error message.
- **Discover:** No loading state. `DiscoverGrid` receives pre-fetched items from server. If `getAllContent()` is slow, page blocks server-side — acceptable for ISR but worth noting.
- **PinPreviewCard:** Image loads without skeleton — can cause layout shift in the 32px height image container. Low severity.
- **AIResponsePanel:** Shows `Loader2 animate-spin` next to "VZ Explorer AI" label while streaming. Streaming cursor `animate-pulse` inline block. Good pattern.

---

## 6. Mobile Responsiveness

**Critical issues:**

1. **Map AI panel overflows on small screens (P1):** `AIResponsePanel` is positioned `absolute top-24 left-4 w-80` (line 280). On 375px iPhone SE: `16px (left-4) + 320px (w-80) = 336px`. With the auth button at `top-4 right-4`, there is 16px of overlap at 375px width. On 320px screens (Galaxy A series), the panel is `304px` wide with `16px` inset — it won't overflow but will be very tight. Should use `w-[calc(100vw-2rem)] max-w-80` to clamp properly on small screens. File: `map/page.tsx:280`.

2. **Map page has no mobile nav bar (P1):** `/map` is outside the `(tourist)` layout group (`app/map/page.tsx`). The MobileTabBar (`md:hidden`) and the Navbar are only rendered by the tourist layout. On mobile, the map page has no navigation — no way back to Explore, Trips, or Profile without the browser back button. This is a dead end for mobile users. The map page adds its own floating buttons ("Browse all" → `/library` and "Build my itinerary") but no structured navigation. Should either move `/map` into the tourist layout or duplicate the bottom tab bar.

3. **Discover "Add to Trip" inaccessible on mobile (P1):** The "Add to Trip" button on `PhotoCard` has `opacity: hovered ? 1 : 0` and `transform: hovered ? 'translateY(0)' : 'translateY(4px)'` (lines 193-197). On touch devices there is no hover — the button is permanently invisible. Mobile users cannot add Discover items to a trip from the grid. File: `DiscoverGrid.tsx:193`.

4. **Category filter chips may wrap awkwardly (P2):** In `ExploreClient`, the category tabs row uses `flex gap-1 bg-muted/50 rounded-xl p-1 w-fit` with 4 items. At 375px, 4 items at ~90px each (including padding) = ~370px which barely fits but the sort select on the same flex row (`flex items-center justify-between`) will push the tabs to wrap. Test on 375px width. File: `ExploreClient.tsx:252`.

5. **Map filter chips touch target (P2):** Category radio buttons in the map overlay have `min-h-[36px]` (line 223) — 8px below the 44px DESIGN.md minimum.

6. **Region hero count hidden on mobile (P2):** `<div className="hidden sm:block text-right flex-shrink-0">` (line 147) — the listing count stat is hidden below `sm` breakpoint. Not critical but removes a useful data point.

---

## 7. Accessibility

**Violations:**

1. **FilterOverlay safety level filter — color only (WCAG 1.4.1, P1):** Active state communicated by colored border and text only. No icon added. Violates DESIGN.md v0.3.5 rule and WCAG 1.4.1. File: `FilterOverlay.tsx:131`.

2. **FilterOverlay region badges — not keyboard-activatable (P1):** Region filter uses `<Badge>` component with `onClick`. `Badge` renders as a `<span>` — it is not focusable and cannot be activated with Enter/Space by keyboard users. File: `FilterOverlay.tsx:83`. Should use `<button>` or `<Badge asChild><button>`.

3. **PhotoModal — no focus trap (P2):** The modal (`role="dialog" aria-modal="true"`) has no focus trap implementation. Keyboard users can Tab past the modal into the background content. A `useEffect`-based focus trap or a library like `@radix-ui/react-focus-scope` is needed. File: `PhotoModal.tsx:129`.

4. **DiscoverGrid PhotoCard — hover-only interactive elements invisible to keyboard/mobile (P1):** The "Save" button (lines 148-168) and "Add to Trip" button (lines 192-230) have `opacity: hovered ? 1 : 0`. For keyboard focus (`focus-within:ring-2 focus-within:ring-primary` at line 106) the card ring shows but the buttons remain invisible. The save button has `opacity: hovered || saved ? 1 : 0` which partially addresses this for saved state, but keyboard focus alone does not make the buttons visible. File: `DiscoverGrid.tsx:148, 193`.

5. **BrowseListingCard tier badge uses emoji as content (P3):** `TierBadge` at line 127 renders "🏆 Founding Partner" and "✅ Verified Partner" where the emoji is part of the text content, not `aria-hidden`. Screen readers will read "trophy Founding Partner" and "checkmark emoji Verified Partner". Should use `<span aria-hidden="true">🏆</span>`. File: `BrowseListingCard.tsx:127,134`.

6. **Category page hero breadcrumb omits Home link (P3):** The explore page uses `<Breadcrumb items={[{ label: 'Home', href: '/' }, ...]} />`. The category page hero breadcrumb only shows `Explore / {category}` with no Home link. The region page shows `Explore / Destinations / {region}` with no Home. Inconsistent and incomplete for screen readers navigating landmarks. Files: `category/[slug]/page.tsx:103`, `region/[slug]/page.tsx:125`.

7. **Map canvas `aria-label` on div (P2):** MapContainer renders `<div ref={mapRef} aria-label="Map display" tabIndex={...} />` (line 446). The Mapbox canvas itself handles accessibility internally; the outer wrapper has `role="region" aria-label="Interactive map"` (line 441). The inner `mapRef` div with `aria-label` is redundant and can create double-announcement. File: `MapContainer.tsx:441-447`.

8. **Discover PhotoCard `role="button"` div (P3):** The card div at line 106 uses `role="button" tabIndex={0}` and manual `onKeyDown` with Enter/Space handler. This is acceptable but a `<button>` element would be better — native button semantics include activation on Space without manual handling. File: `DiscoverGrid.tsx:106`.

---

## 8. Map UX

**Strengths:**
- Full-screen immersive layout with floating overlays — correct pattern for a primary map experience.
- Clustering with `clusterMaxZoom: 10, clusterRadius: 50` — prevents overcrowding.
- Verified ring layer (double-circle for verified pins) — elegant differentiation.
- Hover tooltip with title + city/region — good discoverability.
- Dark mode + 3D terrain toggles — well-implemented controls.
- `prefers-reduced-motion` respected for `flyTo` and cluster zoom animations (lines 258, 433).
- PinPreviewCard with "Add to Itinerary" and "View details" — correct two-action pattern.

**Issues:**

1. **Individual pin touch target (P1):** `POINT_LAYER` uses `circle-radius: 8` (16px visual diameter). On mobile, a 16px touch target fails the 44px minimum. Mapbox GL doesn't support separate visual vs. hit-area radii for circle layers. The `MapPin.tsx` component (which renders DOM buttons) is not used by `MapContainer.tsx` — `MapContainer` renders pins via WebGL layers, not DOM elements. Fix: add a transparent hit-area circle layer with `circle-radius: 22` (44px) rendered on top with `circle-opacity: 0`. File: `MapContainer.tsx:177`.

2. **Map page outside tourist layout = no mobile nav (P1):** See Mobile Responsiveness section item 2.

3. **"Browse all" button links to `/library` not `/explore` (P2):** The bottom bar `Browse all` button at line 299 goes to `href="/library"`. From recent memory notes, `/library` was merged into `/explore` in the design review decision log (2026-04-19: "Merge browse into single /explore"). This appears to be a stale link. File: `map/page.tsx:299`.

4. **AI panel on mobile overlaps greeting (P2):** When `isAuthenticated && !hasSearched`, the greeting div appears at `top-24 left-4`. When `hasSearched`, the AI panel appears at the same position. The greeting and the panel use the same top/left position — transition between them is an abrupt replace rather than a cross-fade.

5. **Map page category filter chips hidden after search (P2):** The chips are only shown when `!hasSearched` (line 217). After a search, both the chips and the suggestions disappear. This prevents users from refining their category while a search result is active.

6. **No list-view fallback when map fails (P2):** If Mapbox token is missing or the map errors, the page shows the error state but provides no alternative way to browse listings. The "Browse all" link is visible but the map context (showing where listings are) is completely lost.

---

## 9. Navigation Flow

**Explore → Listing Detail:** `BrowseListingCard` wraps its content in `<Link href="/listing/${listing.slug}">` — flow works. `ListingCard` also links correctly.

**Explore → Category page:** The three hero cards in `explore/page.tsx` link to `/explore?category=hotel` (URL param) not `/explore/category/hotel` (category page route). The `ExploreClient` reads the `initialCategory` prop from the search param and sets a client-side filter. The category landing pages at `/explore/category/beaches` are only reachable via direct URL or from the `LISTING_CATEGORIES` list — there are no links to them from the Explore index page.

**Category page guides → article detail:** Guide cards in category and region pages show "Read guide" with no `href`. Dead links — P1 issue.

**Region tabs → filtered URL:** Tab navigation uses `<Link href={base}?tab=X` — URL-based, browser-back works correctly. Good.

**Discover → Explore:** No navigation path from Discover to the Explore listing grid. Discover is a visual inspiration surface but has no "Browse in this region" CTA that points to the appropriate region page.

**Safety Hub → Map:** Safety Hub (`/safety`) lists regions with safety levels but has no link to `/map` to visualize zones. No breadcrumb.

**Map → listing detail:** Click on pin → PinPreviewCard → "View details" → `/listing/{id}`. Correct flow. If `pin.listingId` is null (scrapped listings without IDs), the "View details" button doesn't render — user can only add to itinerary. Acceptable but worth noting.

---

## 10. Design System Compliance

### Hardcoded colors (not using OKLCH semantic tokens)

| File | Line(s) | Violation |
|------|---------|-----------|
| `BrowseListingCard.tsx` | 84–119 | 12 hardcoded Tailwind palette colors for tag `color` strings: `bg-cyan-50 text-cyan-700`, `bg-emerald-50 text-emerald-700`, `bg-blue-50 text-blue-700`, `bg-slate-50 text-slate-700`, `bg-teal-50 text-teal-700`, `bg-lime-50 text-lime-700`, `bg-orange-50 text-orange-700`, `bg-violet-50 text-violet-700`, `bg-amber-50 text-amber-700`, `bg-rose-50 text-rose-700`, `bg-purple-50 text-purple-700` |
| `BrowseListingCard.tsx` | 127, 134 | `bg-amber-100 text-amber-800 border-amber-200` (Founding Partner) and `bg-emerald-100 text-emerald-800 border-emerald-200` (Verified Partner) — should use `bg-accent/10 text-accent` and `bg-secondary/10 text-secondary` |
| `map/page.tsx` | 155, 179, 187, 207, 225–226, 240, 271, 291, 300 | `bg-sky-500`, `text-red-600`, `bg-white`, `bg-gray-900`, `border-gray-200`, `text-gray-700`, `hover:bg-gray-50` — all floating map overlays hardcode gray/white palette instead of `bg-background border-border text-foreground hover:bg-muted` |
| `MapControls.tsx` | ~36, ~50 | `bg-white dark:bg-gray-800 hover:bg-gray-50` — should be `bg-background hover:bg-muted` |
| `MapContainer.tsx` | 452, 493–495 | `bg-gray-100 dark:bg-gray-900` (loading overlay), `bg-white/50 dark:bg-gray-800/50` (placeholder tiles) |
| `DiscoverGrid.tsx` | 86, 151, 167, 194, 301, 316, 320, 325, 331 | Multiple hex values: `#8b5cf6`, `#ec4899`, `#ef4444`, `rgba(29,78,216,0.88)` (hardcoded primary blue — should be `bg-primary`), `#0f172a`, `#1e3a5f`, `#3b82f6`, `#f59e0b`, `#60a5fa` |
| `PhotoModal.tsx` | 143, 312 | `bg-gray-900` (modal image panel), `linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)` (Instagram gradient button) |
| `category/[slug]/page.tsx` | 112 | `text-amber-400` for category label chip — should be `text-accent` |
| `constants.ts` | 132–135 | `BOOKING_STATUSES` colors hardcoded: `bg-yellow-100 text-yellow-800`, `bg-green-100 text-green-800`, `bg-red-100 text-red-800`, `bg-blue-100 text-blue-800`, `bg-purple-100 text-purple-800` — should use `bg-status-pending text-status-pending` etc. |

### Typography violations

- No reviewed page applies `font-display` (Fraunces) or `font-body` (Plus Jakarta Sans) to any heading or body text. All text defaults to `font-sans` (Inter). DESIGN.md decision log (2026-04-19): "Fraunces for editorial headlines, PJS for body, Inter for data." The fonts ARE loaded in `layout.tsx` (line 2: `import { Inter, Fraunces, Plus_Jakarta_Sans }`) and exposed as CSS variables (`--font-display`, `--font-body`). They are simply never applied.
  - Target: `h1`, `h2` elements on category/region/discover pages should use `font-display`.
  - Body copy paragraphs in editorial sections should use `font-body`.

### Border radius violations

- `BrowseListingCard` default variant (line 269): `rounded-xl` instead of `rounded-2xl` for card container. DESIGN.md: "Cards: rounded-2xl (16px)".
- `ExploreClient` skeleton divs (line 309): `rounded-xl` — should be `rounded-2xl` to match the card it represents.
- `PhotoModal` rounded-2xl is correct (line 139).
- `ListingCard` (line 62): correctly uses `rounded-2xl`.

### Anti-pattern: Decorative gradient orbs in Discover hero

`DiscoverGrid.tsx` lines 313–320: Two large radial gradient `div`s (96×96, 80×80) labeled with a comment `{/* Gradient orbs */}`. DESIGN.md Aesthetic Direction explicitly states "no decorative blobs/waves". These should be removed or replaced with a photography-based hero.

### Anti-pattern: Dark gradient hero without photography in Discover

The Discover hero uses `background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'` with no hero image. DESIGN.md states the platform should feel "photography-forward". The Discover page, which is entirely about photography, has a photography-free hero.

---

## 11. Dual ListingCard Analysis

### Card A: `components/listing/ListingCard.tsx`

- **Data shape:** Accepts `Listing` type from `@/types/database` — a full DB row with `price_usd`, `duration_hours`, `max_guests`, `safety_level`, `is_featured`, `total_reviews`, `short_description`.
- **Image:** Uses `next/image` with `fill` + `sizes` — correct and LCP-optimized.
- **Features:** SafetyBadge, FavoriteButton, category badge, duration/capacity metadata, price display, "Contact for pricing" fallback, featured badge.
- **Radius:** `rounded-2xl` — DESIGN.md compliant.
- **Border:** Yes (via shadcn `Card` component).
- **Used in:** Category page listing grid, Region page listing grid, AIResponsePanel results.
- **Variant:** `compact` (horizontal layout, 64×64 thumbnail) supported via prop.

### Card B: `components/listing/BrowseListingCard.tsx`

- **Data shape:** Accepts `BrowseApiListing` — a leaner API response with `review_count` (not `total_reviews`), no `price_usd`, no `safety_level`, no `is_featured`, no `duration_hours`.
- **Image:** Uses raw `<img loading="lazy">` — not LCP-optimized, no `sizes` hint, no blur placeholder, no WebP serving.
- **Features:** StarRating (custom visual), generated tag system (12 inferred tags from region/type/name heuristics), TierBadge (Founding Partner/Verified), "Add to Trip" button (requires active itinerary), "Book Now" / "View Details" CTA pill.
- **Radius:** `rounded-xl` (default variant) — violates DESIGN.md which specifies `rounded-2xl` for cards.
- **Border:** Missing in default variant (no `border` class at line 269).
- **Used in:** ExploreClient grid (main listing discovery), `compact` variant used in book page search results.
- **Additional logic:** `borderAccent` adds `border-l-4 border-l-amber-400` (Founding Partner) or `border-l-4 border-l-emerald-400` (Verified) — hardcoded Tailwind colors, should use `border-l-accent` / `border-l-secondary`.

### Differences table

| Feature | ListingCard | BrowseListingCard |
|---------|-------------|-------------------|
| Image | `next/image` (optimized) | `<img>` (unoptimized) |
| Price display | Yes (`price_usd`) | No |
| Safety badge | Yes | No |
| Duration/capacity | Yes | No |
| Tag system | No | Yes (12 inferred tags) |
| Add to Trip | No | Yes |
| Radius | `rounded-2xl` ✓ | `rounded-xl` ✗ |
| Border | Yes (Card) | Missing in default |
| Star display | `Star` icon (simple) | Custom visual (full/half/empty) |
| Verified status | Via `is_featured` | TierBadge (founding/verified) |
| Compact variant | Yes (horizontal) | Yes (compact variant) |

### Recommendation

The DESIGN.md decision log (2026-04-19) explicitly calls for a "Unified ListingCard with variant prop — Single source of truth." The two cards have diverged significantly and now cannot be trivially merged without a data contract alignment. The recommended path:

1. Create a unified `ListingCard` that accepts an optional `data` union type (full `Listing` | `BrowseApiListing`) and renders the correct fields based on what is present.
2. Migrate `BrowseListingCard` to use `next/image` — this is a P1 performance fix regardless of unification.
3. Fix `BrowseListingCard` radius to `rounded-2xl` and add `border` class as an immediate patch.
4. The tag heuristics in `BrowseListingCard` (`generateTags`) are clever but introduce 12 hardcoded palette colors — consolidate to 3-4 semantic tag types using design tokens.

---

## Priority Issues

### P0 (broken — feature doesn't work)

None identified (no complete feature failures).

### P1 (high — hurts user experience significantly)

1. **`BrowseListingCard` uses `<img>` not `next/image`** — No LCP optimization on the highest-traffic page. File: `BrowseListingCard.tsx:226, 277`.
2. **Map AI panel can overflow on narrow mobile screens** — Hardcoded `w-80` with `left-4` absolute position. File: `map/page.tsx:280`.
3. **Map page has no mobile navigation** — Outside tourist layout, no MobileTabBar or Navbar rendered on mobile. File: `app/map/page.tsx` (no layout).
4. **Discover "Add to Trip" button invisible on touch/mobile** — `opacity: hovered ? 1 : 0` — permanently hidden on mobile. File: `DiscoverGrid.tsx:193`.
5. **Guide article cards are non-clickable dead ends** — "Read guide" with ArrowRight but no `href`/Link. File: `category/[slug]/page.tsx:186–220`.
6. **Price sort options show in UI but perform no sort** — "Price: low to high" and "Price: high to low" return no-op. File: `ExploreClient.tsx:73-74, 180`.
7. **Region breadcrumb "Destinations" links incorrectly to `/explore`** — Not a destinations index. File: `region/[slug]/page.tsx:128`.
8. **FilterOverlay region badges not keyboard-activatable** — `Badge` renders as non-interactive `span`. File: `FilterOverlay.tsx:83`.
9. **FilterOverlay safety level: color-only active state (WCAG 1.4.1)** — No icon. File: `FilterOverlay.tsx:131`.
10. **Map pin touch target 16px** — Fails 44px minimum. File: `MapContainer.tsx:177`.
11. **Region page filtered tab empty state has no CTA** — User stranded with no way to clear filter. File: `region/[slug]/page.tsx:298`.
12. **Discover empty "Add to Trip" toast has no follow-up CTA** — Toast disappears with no action path. File: `DiscoverGrid.tsx:203`.

### P2 (medium — polish)

13. **No `font-display` (Fraunces) applied to any editorial headline** — Fonts loaded but never used. All h1/h2 default to Inter. Files: all reviewed pages.
14. **`BrowseListingCard` default variant: `rounded-xl` not `rounded-2xl`** — DESIGN.md violation. File: `BrowseListingCard.tsx:269`.
15. **`BrowseListingCard` default variant: missing `border` class** — Cards in explore grid have no border. File: `BrowseListingCard.tsx:269`.
16. **Category and region listing grids use `xl:grid-cols-4`** — Violates DESIGN.md 3-col max spec. Files: `category/[slug]/page.tsx:240`, `region/[slug]/page.tsx:292`.
17. **Map category chips `min-h-[36px]`** — 8px below DESIGN.md 44px minimum. File: `map/page.tsx:223`.
18. **Split taxonomy between ExploreClient and category page routes** — hotel/restaurant/experience vs. beaches/mountains/cities/etc. Creates confusing navigation.
19. **Discover hero: no photography, hardcoded dark hex gradients, decorative orbs** — Violates DESIGN.md "photography-forward" + "no decorative blobs". File: `DiscoverGrid.tsx:299–320`.
20. **`BrowseListingCard` TierBadge hardcoded amber/emerald colors** — Should use `bg-accent` and `bg-secondary` tokens. File: `BrowseListingCard.tsx:127, 134`.
21. **Map floating buttons hardcode gray/white** — 9 instances of `bg-gray-*`, `border-gray-*`, `text-gray-*` in map page. File: `map/page.tsx:187–300`.
22. **"Browse all" link on map page points to `/library`** — Stale link post-redesign. File: `map/page.tsx:299`.
23. **PhotoModal: no focus trap** — Keyboard users can tab outside modal. File: `PhotoModal.tsx:129`.
24. **Discover Featured badge overlaps category badge** — Both at `top-3`, overlapping. File: `DiscoverGrid.tsx:237`.
25. **Safety Hub: no link to map for zone visualization.** File: `safety/page.tsx`.
26. **Discover has no CTA to Explore listing grid** — Inspiration surface with no conversion path.
27. **`DiscoverGrid.tsx` inline hex colors** — 9 instances of hardcoded `#hex` and `rgba()` values. File: `DiscoverGrid.tsx:86, 151, 167, 194, 301, 316, 320, 325, 331`.

### P3 (low — nice to have)

28. **TierBadge emojis not `aria-hidden`** — Screen reader reads "trophy Founding Partner". File: `BrowseListingCard.tsx:127, 134`.
29. **Category page hero omits Home in breadcrumb** — Inconsistent with Explore page. File: `category/[slug]/page.tsx:103`.
30. **Safety Hub: no breadcrumb at all.** File: `safety/page.tsx`.
31. **Redundant `aria-label` on MapContainer inner div** — Double-announced by screen readers. File: `MapContainer.tsx:446`.
32. **Skeleton cards use `rounded-xl` not `rounded-2xl`** — Minor flash on load. File: `ExploreClient.tsx:309`.
33. **`BOOKING_STATUSES` in constants.ts use hardcoded Tailwind color classes** — Should use status tokens. File: `constants.ts:132-135`.
34. **Region hero listing count hidden below `sm`** — Minor data loss. File: `region/[slug]/page.tsx:147`.
35. **Discover PhotoCard `div[role=button]`** — Should be a semantic `<button>`. File: `DiscoverGrid.tsx:106`.
