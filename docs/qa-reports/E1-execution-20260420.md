# E1 Tourist Core — Execution Report
**Date:** 2026-04-20  
**Agent:** E1 (Tourist Core)

---

## Files Changed

### `data/scraped-listings.json`
- **FIX 1A (P0-TRS-001):** Replaced all occurrences of `key=AIzaSyATTNCc2-dRb6XZI40FvFJVmCIsz1yWeqE` with `key=REDACTED` across all Google Places Photo API URLs. This key was hardcoded in every `cover_image_url` and `photos` array entry for all scraped listings.

### `components/listing/BrowseListingCard.tsx`
- **FIX 1B + FIX 6 (P0-TRS-001 / P2-TRS-002):** Replaced all `<img>` tags with `next/image` `<Image>` components (both compact and default variants). Added `fill`, `sizes`, and `onError` fallback to `https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80` when images fail to load. Changed `paddingBottom: '62.5%'` pattern to `aspect-[16/10]` with `overflow-hidden`. Added `import Image from 'next/image'`.
- **FIX 7 (P2-TRS-001):** Changed `rounded-xl` to `rounded-2xl` on the default variant card container. Added `border border-border` to the card container.

### `app/(tourist)/listing/[slug]/page.tsx`
- **FIX 2 (P0-TRS-002):** Added completed-booking check after fetching Supabase listing: queries `guest_bookings` for a row matching `guest_email`, `listing_id`, and `status = 'completed'`. Passes `canReview={canReview}` and `bookingId={reviewBookingId}` to `<ListingDetail>`. This unblocks the review form which was permanently hidden.
- **FIX 11 (P1-TRS-008):** Added `<script type="application/ld+json">` JSON-LD block before `<ListingDetail>` in both the Supabase path and the scraped-data path (wrapped each return in a Fragment). Schema: `LodgingBusiness` with `name`, `description` (truncated to 200 chars), and `image`.

### `app/(tourist)/map/page.tsx` *(new file)*
- **FIX 3 (P1-TRS-003):** Created `app/(tourist)/map/page.tsx` that re-exports the default export from `@/app/map/page`. Moving the map route under the `(tourist)` layout group means `<Navbar>` and `<MobileTabBar>` are now rendered by the shared layout, fixing the missing mobile navigation bar.

### `app/(tourist)/discover/DiscoverGrid.tsx`
- **FIX 4 (P1-TRS-002):** Changed "Add to Trip" button to always be visible on mobile/touch screens. Replaced inline `opacity: hovered ? 1 : 0` with Tailwind classes `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`. The `transform` slide-in still works on desktop hover via `hovered` state.
- **FIX 12 (P2-TRS-004):** Removed two decorative gradient orb `<div>` elements (blue and amber radial gradients) from the Discover hero section.

### `app/(tourist)/explore/ExploreClient.tsx`
- **FIX 5 (P1-TRS-004):** Added `price_usd?: number | null` to the `ApiListing` interface. Replaced the no-op price sort branches with real sort logic: `price_asc` sorts ascending using `Infinity` as fallback for null prices; `price_desc` sorts descending using `-Infinity` as fallback.

### `components/search/FilterOverlay.tsx`
- **FIX 8 (P1-TRS-005):** Added `role="button"`, `tabIndex={0}`, and `onKeyDown` handler to each region `<Badge>` in the FilterOverlay. The keyboard handler fires `handleRegionToggle` on `Enter` or `Space`, making region badges fully keyboard-activatable.

### `app/page.tsx`
- **FIX 10 (P2-TRS-005):** Updated all deprecated `/library/` hrefs to `/explore/`: 3 editorial pick region links (`/library/region/los-roques`, `/library/region/merida`, `/library/region/canaima`) and 8 category strip links (`/library/category/beaches`, etc.).

### `app/map/page.tsx`
- **FIX 10 (bonus):** Updated the "Browse all" anchor from `href="/library"` to `href="/explore"` as part of the library link deprecation sweep.

---

## Fixes NOT Required / Already Correct

- **FIX 9 (P1-TRS-009):** `app/(tourist)/layout.tsx` already has `id="main"` on the `<main>` element. No change needed.

---

## Notes

- `components/listing/ListingDetail.tsx` already accepts `canReview?: boolean` and `bookingId?: string` props (confirmed at line 22-23). No changes needed there.
- The scraped listing images will still return 403/broken since the key is now redacted — the `onError` fallback added in Fix 1B/6 ensures a placeholder image is shown instead of a broken img element.
- The `(tourist)/map/page.tsx` re-export approach means the map's internal floating auth UI coexists with the layout's Navbar. On desktop both are visible; on mobile the MobileTabBar is now present. If the duplicate auth button becomes a visual issue, the `app/map/page.tsx` auth section should be conditionally hidden when rendered under the tourist layout.
