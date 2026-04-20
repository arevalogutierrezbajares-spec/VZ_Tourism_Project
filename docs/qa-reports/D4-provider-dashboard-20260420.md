# D4 — Provider Dashboard UX/UI Review
**Date:** 2026-04-20
**Pages Reviewed:** All /dashboard/* pages
**Reviewer:** Senior UX/UI + Frontend Audit
**Quality Bar:** Airbnb Host Dashboard

---

## Executive Summary

The provider dashboard is a **solid foundation** that punches above its weight for an early-stage platform. Navigation is well-structured, status colors follow design tokens, the AI Brain and WhatsApp messaging are genuinely differentiated features, and the calendar interaction model is more sophisticated than most indie platforms.

However, measured against the Airbnb Host Dashboard bar, there are **four systemic gaps** that create real friction for providers:

1. **No photo management anywhere in the listing workflow.** `photos: []` is a defaultValue in the form — the entire image upload experience is unbuilt. A provider cannot add photos to a listing without going directly to the database.
2. **New Listing is a long-scroll form, not a wizard.** No step indicators, no progress bar, no "Save as Draft and continue later". A provider who abandons halfway loses everything.
3. **No `loading.tsx` per sub-route.** Only the dashboard root `/dashboard` has a `loading.tsx`. Every sub-page (bookings, analytics, revenue, calendar, guests, marketing, settings) shows a blank white screen during data fetch.
4. **Bookings page uses `window.location.reload()`** in `ProviderBookingActions.tsx` (line 49). This is a full-page hard reload on every confirm/cancel action — catastrophic UX, kills scroll position and causes a flash of the loading skeleton.

---

## Dashboard Navigation

**File:** `components/provider/ProviderSidebar.tsx`

**What works:**
- Grouped nav (Operations / Inventory / Growth / AI / System) is clear and logical.
- Active state: `bg-primary text-primary-foreground` on the active link, clearly visible.
- Collapse toggle with tooltip fallback for collapsed state — this is the DESIGN.md-recommended collapsible sidebar pattern.
- Mobile: hamburger → Sheet drawer with full nav. Drawer closes on navigation (`useEffect` on pathname). Logo visible in mobile top bar.
- Unread count badges on Bookings and Messages — wired to `useProviderStore`, live data.
- "Back to app" link at the bottom for easy return to the consumer app.

**Issues:**

- **P1 — AI nav items are confusing.** The sidebar has two AI items in the "AI" group: "AI Brain" (`/dashboard/messages/brain`) and "AI Settings" (`/dashboard/messages/ai`). These are nested under `messages/` but presented as top-level AI items. The routes imply they are sub-pages of Messages, but they're navigated to as standalone destinations. A provider may not intuit that "AI Brain" is the knowledge base editor versus a chatbot. Labels should be "AI Knowledge Base" and "AI Concierge Settings".

- **P2 — No 14th section: Discount Codes.** The scope includes `/dashboard/` + all sub-pages. The `app/api/discount-codes/` directory exists but there is no `/dashboard/discount-codes/` page. A marketing tool that can't be managed from the dashboard is incomplete.

- **P2 — `collapsed` state is not persisted.** On every page navigation the collapsed state resets because `useState` is local to the component and no `localStorage` sync exists. A provider who collapses the sidebar to get more screen space will see it expand again on the next page load.

- **P3 — The PMS link (`/dashboard/pms`) is in a group titled "Property (PMS)"** which differs from the DESIGN.md language around the broader platform. Works, but the single-item group creates visual weight disproportionate to its size. Consider inlining it under Inventory.

- **P3 — `Tooltip` render prop API mismatch.** At `ProviderSidebar.tsx:302`, the collapsed "Back to app" link uses `render={<Link .../>}` on `TooltipTrigger`. This is not the standard shadcn/ui `TooltipTrigger` API; `TooltipTrigger` uses `asChild` for slot rendering. This likely silently fails to render the link, making "Back to app" unreachable when the sidebar is collapsed.

---

## Overview Page

**File:** `app/(provider)/dashboard/page.tsx`

**What works:**
- 4 stat cards (Revenue, Pending, Active, Rating) with semantic colors using design tokens.
- Recent Bookings with status badges using `bg-status-*/10 text-status-*` — design system compliant.
- Status badges include icon + color (WCAG requirement from DESIGN.md line 105) — correct.
- "Create your first listing" empty state in the listings card — actionable, not just "no data".
- Loading skeleton in `loading.tsx` mirrors the page layout accurately.

**Issues:**

- **P1 — No time-period comparison.** Revenue shows total completed revenue all-time, not this month vs last month. A provider has no way to know if they're growing or declining without going to Revenue. Airbnb shows a weekly comparison on the overview.

- **P1 — Listing card uses Eye icon for "Edit" action** (`page.tsx:195`). The icon label says "Edit" but the icon is `Eye`. This is misleading — eye = view, pencil = edit. The correct icon is `Pencil` or `Edit2`.

- **P2 — Quick Actions: "Settings" uses a `Users` icon** (`page.tsx:229`). Settings should use the `Settings` icon. `Users` suggests guest management.

- **P2 — No "Views" or "Profile visits" metric.** The overview has revenue and bookings but nothing about listing discoverability. A new provider with 0 bookings doesn't know if their listing is getting seen at all.

- **P2 — `avgRating` calculation** averages the `rating` field across the first 5 listings (the `.limit(5)` query). A provider with 6+ listings will see a misleading avg because it only samples 5.

- **P3 — Welcome message says "Here's what's happening with your business"** but shows all-time totals, not a "right now" snapshot. Consider "Last 30 days" or "This week" framing.

---

## Listings Management

**Files:** `app/(provider)/dashboard/listings/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`

**What works:**
- Published/Draft badge on each listing row.
- View (opens public listing) + Edit buttons on each row.
- Delete with confirmation dialog in edit flow.
- Form validation with Zod + inline error display.
- "Publish listing" toggle on create/edit.

**Issues:**

- **P0 — No photo upload UI.** `new/page.tsx:31` initializes `photos: []` as a default value. There is no photo management UI — no file picker, no drag-and-drop, no URL input, no image preview. A listing without photos will have a blank cover. This is a critical missing feature: listings are entirely unshowable without photos.

- **P0 — Edit form does not show current category/region values.** `[id]/edit/page.tsx:149–162` uses `Select` with `onValueChange` to set category/region, but `reset(json.data)` from the API does not hydrate the `Select` components (which are uncontrolled). On load, category and region selectors show "Select category" / "Select region" placeholders even though values exist. Saving without touching these fields will clear them.

- **P1 — New Listing is a single long-scroll form, not a multi-step wizard.** DESIGN.md mentions `ListingWizard.tsx` exists in `components/provider/` — it was built but is not wired into `new/page.tsx`. The actual listing creation flow is a raw form with no step indicators, no progress, no save-as-draft, and no preview before publishing. A 6-card form on a single page violates the Airbnb "do one thing per step" wizard pattern.

- **P1 — No photo management in the edit flow either.** `[id]/edit/page.tsx` has the same photos gap — no way to add, remove, or reorder photos.

- **P1 — No listing preview before publish.** There's a "View" button that opens the public listing page, but that only works once the listing is already saved. A provider cannot preview how their listing looks before first save.

- **P2 — Listings page has no search or filter.** A provider with 10+ listings must scroll to find what they need. No search by title, no filter by status (live/draft), no sort controls.

- **P2 — `_count:bookings(count)` is fetched on the listings query** (`page.tsx:22`) but the count is never displayed in the UI. Booking count per listing would be useful data on the listing card.

- **P2 — Empty state is generic.** `"You haven't created any listings yet."` — no icon, minimal copy. Add an illustration or icon and use a more encouraging CTA aligned with the warm editorial tone in DESIGN.md.

---

## Booking Management

**File:** `app/(provider)/dashboard/bookings/page.tsx`, `components/provider/ProviderBookingActions.tsx`

**What works:**
- Section-based layout: Needs Action / Upcoming / Past — correct priority ordering.
- Status chips with icon + color (WCAG compliant per DESIGN.md).
- Confirmation code shown in mono font.
- `net_provider_usd` displayed separately from gross — providers see their actual take-home.
- AlertDialog confirmation before cancel/decline.
- Payment method badge on each booking row.

**Issues:**

- **P0 — `window.location.reload()` in `ProviderBookingActions.tsx:49`** is a full-page hard reload triggered on every confirm, complete, or cancel action. This: (1) causes a flash of the loading skeleton, (2) resets scroll position to the top of the page, (3) is unnecessary — the correct pattern is either `router.refresh()` (Next.js App Router) or optimistic UI update + local state mutation. This is a broken UX on every single booking action.

- **P1 — No inline accept/reject buttons for pending bookings.** The primary use case for a provider on this page is "accept or reject new bookings". Currently, both actions are buried in a `DropdownMenu` behind a `MoreHorizontal` (⋯) trigger. Pending bookings should surface ✓ Confirm and ✗ Decline as visible inline buttons, not a dropdown. This is how Airbnb, Booking.com, and every hospitality tool handles it.

- **P1 — No booking detail view.** Clicking a booking row does nothing. There is no drill-down to a full booking detail page with guest contact, payment proof, message thread link, or ability to add notes. The compact row view is not enough for managing a real booking.

- **P1 — No filter tabs.** The page pre-segments into sections (Needs Action / Upcoming / Past) but there's no way to filter by listing, date range, or guest name. A provider with multiple listings can't isolate bookings for "Cabaña del Rio" vs "Posada Central".

- **P2 — No empty state for the "Needs Action" section.** If there are no pending bookings, the section simply doesn't render. A reassuring "All caught up — no bookings need your attention" state would reduce provider anxiety.

- **P2 — Booking summary cards show color-only numbers** (`text-status-pending`, `text-status-confirmed`, etc.) without icons at `page.tsx:128–136`. DESIGN.md line 105: "All status indicators must use icon + color, never color alone (WCAG)."

---

## Calendar

**File:** `app/(provider)/dashboard/calendar/page.tsx`

**What works:**
- Drag-to-select date range with mouse — sophisticated interaction for a dashboard this size.
- Block / Unblock / Set Price actions on selected range with modals.
- Booking detail modal on click of booked day.
- Occupancy rate and today's check-ins/check-outs in the right sidebar.
- Color legend below the grid.
- Listing selector appears when provider has multiple listings.
- "Loading..." text indicator during availability fetch.
- Proper `aria-modal`, `aria-labelledby`, and `aria-label` on all modals.

**Issues:**

- **P1 — No iCal import/export.** Calendar scope explicitly calls out "iCal import visible". There is no iCal sync, no Google Calendar link, no `.ics` export. For a posada manager syncing across Airbnb and this platform, this is a P1 blocker.

- **P1 — Calendar sidebar is `hidden lg:block`** (line 647). On tablet (md to lg), the sidebar with occupancy stats and today's check-ins is completely hidden. There's no collapsed fallback on tablet — the data simply disappears at that viewport.

- **P1 — Listing selector is `hidden` when provider has only 1 listing** (`listings.length > 1` on line 480). But the listing name is never shown in the header, so a provider doesn't know which listing they're managing. Always show the listing name even with a single listing.

- **P2 — Day cell height is fixed at `h-20` (80px).** On small screens the 7-column grid compresses cells to ~46px wide, making chip labels like "Blocked" truncate and the touch targets fall below 44px (WCAG 2.5.5). On mobile, the calendar is unusable without horizontal scroll.

- **P2 — No touch support for date range selection.** The drag-select uses `onMouseDown`, `onMouseEnter`, `onMouseUp` — these don't fire on touch devices. A provider managing their calendar on a phone cannot select multiple dates.

- **P2 — `dayColor` uses hardcoded Tailwind color classes** (`bg-blue-100`, `bg-gray-100`, `bg-yellow-50`) instead of design system tokens. DESIGN.md specifies OKLCH tokens and semantic status colors.

- **P3 — No multi-month view option.** Airbnb calendar lets hosts see 2 months at once for stay planning. This calendar is single-month only.

---

## AI Message Features

### Messages
**File:** `app/(provider)/dashboard/messages/page.tsx`

**What works:**
- Three-panel layout: conversation list / thread / controls — correct mental model.
- Realtime via Supabase `postgres_changes` subscriptions.
- AI/Human/Escalated/Closed mode switching with instant visual feedback.
- Booking stage pipeline in the right panel.
- Message translation toggle for multilingual conversations.
- Flagged messages get `ring-1 ring-destructive` indicator.
- AI messages marked with Sparkles icon, human with CheckCheck — clear attribution.
- Loading skeletons for conversation list and message thread.
- "Not configured" empty state with Settings CTA.
- Mobile: list/chat toggle with back button.

**Issues:**

- **P1 — AI Settings and AI Brain are listed in the sidebar as separate nav items** but they live under `/dashboard/messages/brain` and `/dashboard/messages/ai`. A provider browsing Messages sees no navigation path to these sub-features within the Messages page itself. The AI Brain and AI Settings should be accessible as tabs or a header link from the Messages page, not only from sidebar nav.

- **P1 — No search/filter by guest name or phone.** The filter tabs (all/ai/human/escalated/closed) are sufficient but a provider who receives 50+ messages cannot find a specific guest without scrolling through the entire list.

- **P2 — Right control panel is `hidden lg:flex`** (line 708). On screens below ~1024px the handling mode and booking stage controls disappear entirely. A provider on a 13" laptop cannot switch AI/Human mode or update booking stage without a wider screen.

- **P2 — No "Send to Bookings" or "Create Booking from Conversation" action** in the right panel. A WhatsApp conversation that reaches "Confirmed" stage has no shortcut to create an actual booking — the provider has to navigate away to Bookings.

- **P2 — `STATUS_CONFIG` colors** at lines 27–31 use hardcoded Tailwind classes (`bg-green-100 text-green-800`, `bg-blue-100 text-blue-800`, etc.) instead of DESIGN.md status tokens. Should use `bg-status-confirmed/10 text-status-confirmed` etc.

### AI Brain
**File:** `app/(provider)/dashboard/messages/brain/page.tsx`

**What works:**
- Progress bar with section count — strong onboarding mechanic.
- Section completeness checks (green checkmark replaces icon when complete).
- Collapsible accordion sections — good information density management.
- Venezuelan seasonal pricing presets (Carnaval, Semana Santa, Navidad) — excellent domain knowledge.
- FAQ suggestion chips when empty — great empty state that seeds the knowledge base.
- Side-by-side "What the AI sees" preview — technically impressive, transparent.
- Per-section Save buttons to avoid losing all work on error.

**Issues:**

- **P1 — Per-section saves do not auto-save on collapse.** If a provider fills in a section and then clicks to collapse it (without clicking Save), all edits for that section are lost silently. There's no unsaved-changes indicator (dirty flag), no "You have unsaved changes" warning, and no auto-save.

- **P1 — Loading state is minimal.** The `loading` state renders 3 plain animate-pulse `Card` blocks without any hint of the section structure. A provider has no sense of how long the load will take or what they're waiting for.

- **P2 — Room type amenities field is a comma-separated text input** (`rooms/[i]/amenities` at line 199) while the top-level Amenities section uses toggle chips. This inconsistency within the same page is confusing.

- **P2 — No "Test the AI" button.** After filling in the Brain, a provider has no way to send a test message to see how the AI responds. They can only view the raw system prompt in the preview panel.

- **P3 — Section title for Brain page (`AI Brain`) matches the sidebar label** but the page header also shows the Brain icon next to the heading. The icon + label pattern on the h1 is non-standard (see `brain/page.tsx:674`).

### AI Settings
**File:** `app/(provider)/dashboard/messages/ai/page.tsx`

**What works:**
- Skeleton loading state mimics the panel layout (sidebar nav + content area).
- Falls back to `DEFAULT_CONFIG` on error — provider never sees a blank form.
- `siteUrl` injected for the webhook URL display.

**Issues:**
- **P2 — Page title is "AI Settings"** in the sidebar but route is `/dashboard/messages/ai`. The breadcrumb or page heading does not reflect this. No `<h1>` visible — the page renders `<AiSettingsPanel>` without a visible page-level heading, which is an a11y issue (missing landmark heading at page level).

---

## Analytics & Revenue

### Analytics
**File:** `app/(provider)/dashboard/analytics/page.tsx`

**What works:**
- 6 KPI cards with appropriate icons and muted complementary colors.
- Charts via Recharts: line, bar, area, pie — delegated to `AnalyticsCharts` client component.
- Conversion funnel with estimated views (labelled "(est.)" — appropriately honest).
- Repeat guest rate calculation with fraction display.
- `export const dynamic = 'force-dynamic'` not present — analytics reads from `getAllBookings()` which is an in-memory store, so this is fine.

**Issues:**
- **P1 — "Views (est.)" is a fabricated number** (`estimatedViews = Math.round(bookings.length * 4.2)` at line 81). This is not real listing view data — it's `total_bookings * 4.2`. Displaying this as a real data point in a business analytics dashboard is misleading. Either wire up real view tracking or remove this from the funnel.
- **P1 — No date range selector.** All analytics are calculated from the beginning of time (filtered to "this month" for some metrics, "last 30 days" for charts). A provider cannot see "last quarter", "last year", or custom date ranges.
- **P2 — No empty state for the charts.** `AnalyticsCharts` receives empty arrays when there are no bookings. Recharts renders blank chart containers, which looks like a rendering error rather than a "no data yet" state.
- **P2 — Metric cards on analytics use arbitrary icon colors** (blue-500, green-500, purple-500, teal-500, orange-500, indigo-500) — not from the design system. Should use OKLCH tokens.

### Revenue
**File:** `app/(provider)/dashboard/revenue/page.tsx`

**What works:**
- Today/Week/Month/Pending breakdown with trend arrows and percentage change vs prior period.
- "Net to you" vs "Gross" shown on every transaction.
- Platform commission disclosed at the bottom.
- CSV export via `RevenueExport`.
- Revenue by listing with progress bars.
- Revenue by payment method breakdown.

**Issues:**
- **P1 — No date range filter.** Same issue as Analytics — "This Month" only, no ability to see a custom range.
- **P1 — `PAYMENT_METHOD_COLORS` uses hardcoded Tailwind color classes** (`bg-blue-100 text-blue-800`, `bg-purple-100 text-purple-800`) at `revenue/page.tsx:32–37`. These are design system violations per DESIGN.md.
- **P2 — "Pending" metric label** (confirmed but unpaid) conflicts with the Payouts page "Pending Balance" concept. The same word means two different things in two places.
- **P3 — Recent Transactions list has no pagination.** It shows 20 items (`.slice(0, 20)`). A provider with 100+ bookings cannot see older transactions without going to the Bookings page.

### Payouts
**File:** `app/(provider)/dashboard/payouts/page.tsx`

**What works:**
- "Next payout: Friday X" displayed prominently.
- Instant payout fee (1.5%) disclosed in the badge.
- `PayoutCard` with pending balance and next date.
- `PayoutMethodForm` for configuring withdrawal method.
- Payout status uses icon + color (correct per WCAG).

**Issues:**
- **P1 — `PROVIDER_ID = 'prov_001'` hardcoded** at line 37. The page has a `// TODO: replace with real provider session` comment. This means ALL providers see the same payout data (belonging to `prov_001`). This is a functional bug that leaks financial data.
- **P1 — No "Request payout" CTA.** The page shows the pending balance and schedule but there's no button to initiate an early or manual payout. "Every Friday automatic" is explained but there's no self-service action a provider can take.
- **P2 — Payout history empty state** is just `<p className="text-sm text-muted-foreground text-center py-8">No payout history yet</p>` — no icon, no explanation of how payouts work for a new provider.

---

## Guests

**File:** `app/(provider)/dashboard/guests/page.tsx`

**What works:**
- Deduplication by tourist ID — visits count and last visit date are correct.
- Avatar with initials fallback.
- Nationality shown when available.
- Proper empty state with `Users` icon.

**Issues:**
- **P1 — No contact or message action.** The guest list is read-only. A provider cannot click a guest to view their booking history, send them a message, or see their WhatsApp conversation. No action affordance on the card.
- **P1 — No search.** Same as most other list pages — can't filter by name, email, or nationality.
- **P2 — "Visits" badge shows raw count** but doesn't show which listing they visited or when. A provider managing multiple properties can't tell which guests are loyal to which property.
- **P2 — Card layout is a single-column full-width list.** On large screens this is a very long, sparse list. A 2-column grid on md+ would make better use of space.

---

## Marketing

**File:** `app/(provider)/dashboard/marketing/page.tsx`

**What works:**
- Shareable link generation per listing with `CopyLinkButton`.
- Tags displayed per listing.
- Instagram/social mentions grid with photos.

**Issues:**
- **P1 — Section title shows "Share2 Mentions"** (line 107, line 109). This is a naming artifact — the variable was renamed from `igMentions` but the UI label was not updated. It should read "Instagram Mentions" or "Social Mentions".
- **P1 — Marketing page has no actionable promotional tools.** "Shareable Links" is a copy-paste URL. No promo codes, no SEO description editor, no "boost this listing" feature, no email blast to past guests. Compared to Airbnb's marketing toolkit (special offers, early bird discounts, similar listing promotions), this is a placeholder.
- **P2 — Tags section is read-only** — a provider can't add or edit tags from this page. Tags are apparently set during listing creation but there's no UI to edit them. This is a broken marketing workflow.
- **P2 — No discount codes UI** despite `/app/api/discount-codes/` existing. There's no `/dashboard/marketing/discount-codes` or equivalent.
- **P3 — Empty state for social mentions** uses `Share2` icon (`opacity-30`) which looks like a broken image.

---

## Settings

**File:** `app/(provider)/dashboard/settings/page.tsx`

**What works:**
- `react-hook-form` + `zodResolver` for form validation.
- Load error state with "Refresh to retry" CTA.
- "Save Settings (unavailable)" disabled state when provider ID is not loaded.
- WhatsApp number field — important for this market.
- `PayoutMethodForm` included in settings — logical placement.

**Issues:**
- **P1 — `providerId` starts as empty string `''`** (line 22). The `providerId` from the API is set asynchronously. The form renders immediately with validation and submit disabled, but there's no loading skeleton for the form fields — they render blank and then populate, causing content flash.
- **P1 — No `region` or `rif` (Venezuelan tax ID) displayed in the form.** `reset()` at line 36 passes `rif: json.data.rif || ''` and `region: json.data.region || ''` but neither field exists in the JSX form. `rif` is the Venezuelan business registration number — it should be an editable field.
- **P2 — No account/security section.** No email change, no password change, no 2FA setup. A provider cannot manage their login credentials from the dashboard.
- **P2 — No "Danger Zone."** No account deletion, no "pause my listings" toggle, no deactivation.
- **P3 — `isLoading ? 'Saving...' : !providerId ? 'Save Settings (unavailable)' : 'Save Settings'` on the submit button** is awkward copy for a disabled button. The parenthetical "(unavailable)" reads as system error copy to the user.

---

## Empty States

Pages with weak or missing empty states:

| Page | Current Empty State | Issue |
|------|---------------------|-------|
| Bookings | "No bookings yet" (text only) | No icon, no guidance on how to get first booking |
| Bookings — Needs Action | Section disappears | Should show "All caught up" reassurance |
| Analytics charts | Recharts renders blank container | Looks like a rendering error |
| Revenue — by listing | "No data" (text only) | No icon, no explanation |
| Payouts history | "No payout history yet" (text only) | No icon, no explanation of when/how payouts happen |
| Guests | Has icon — good | The copy "book your experiences" is vague for posada owners |
| Calendar | No empty state when API returns empty | Shows blank green grid — ambiguous |
| Marketing — Tags | Shows "No tags" per listing | No CTA to add tags |

DESIGN.md states: "Empty states: Search icon + descriptive text + primary action CTA. Never just 'No items found.'"

---

## Loading States

| Page | Has Skeleton? | Quality |
|------|---------------|---------|
| `/dashboard` (overview) | Yes — `loading.tsx` | Excellent — matches layout |
| `/dashboard/bookings` | No | Blank white screen |
| `/dashboard/calendar` | Partial — "Loading…" text in header | Minimal |
| `/dashboard/listings` | No | Blank white screen |
| `/dashboard/listings/new` | No | N/A (static form) |
| `/dashboard/listings/[id]/edit` | Partial — spinner via `animate-spin h-8 w-8` | No aria-label on spinner |
| `/dashboard/messages` | Yes — `ConversationSkeleton` × 4 | Good |
| `/dashboard/messages/brain` | Partial — 3 card skeletons, no section structure | Weak |
| `/dashboard/messages/ai` | Yes — sidebar + content skeletons | Good |
| `/dashboard/analytics` | No | Blank white screen |
| `/dashboard/revenue` | No | Blank white screen |
| `/dashboard/payouts` | No | Blank white screen |
| `/dashboard/guests` | No | Blank white screen |
| `/dashboard/marketing` | No | Blank white screen |
| `/dashboard/settings` | No — form fields flash blank | Causes layout shift |

**Root cause:** Only `/dashboard/loading.tsx` exists. Next.js App Router requires a `loading.tsx` per route segment for automatic Suspense. Adding a shared `loading.tsx` that displays a generic skeleton would address all the blank-screen cases at once.

---

## Mobile/Responsive

**What works:**
- Mobile hamburger → Sheet drawer is clean.
- Messages page has mobile list/chat toggle.
- Bookings summary grid is 2-column on mobile (`grid-cols-2`).
- Calendar has responsive legend.

**Issues:**
- **P1 — Calendar is unusable on mobile.** 7-column fixed-height grid compresses to ~46px cells on 375px viewport. No horizontal scroll wrapper. Touch drag-select is not implemented (mouse events only).
- **P1 — Messages right panel (`hidden lg:flex`)** — AI mode controls and booking stage are inaccessible on tablet and mobile.
- **P1 — Calendar sidebar (`hidden lg:block`)** — occupancy and check-in/out data disappear on tablet.
- **P2 — Main content max-width has no `mx-auto`** in `layout.tsx:22`. The `max-w-7xl` div inside `<main>` is left-aligned. On ultra-wide screens all content sits at the left side with empty right space.
- **P2 — No bottom navigation bar for mobile providers.** DESIGN.md line 133 mentions "Mobile bottom tab bar (consumer)". The provider dashboard uses a Sheet drawer for mobile navigation instead. A bottom tab bar with the 5 most-used sections (Overview, Bookings, Messages, Calendar, Listings) would be more thumb-friendly.
- **P3 — `pt-14 md:pt-0` on main** (`layout.tsx:22`) adds 56px top padding on mobile to clear the fixed header. On pages with their own sticky headers (like Messages), this creates a double-header gap.

---

## Priority Issues

### P0 (Broken — provider cannot do core tasks)

1. **No photo upload UI anywhere in the listing workflow.** (`new/page.tsx:31`, `edit/page.tsx`) A provider cannot add photos to a listing. Every listing will be photo-less.

2. **`window.location.reload()` in `ProviderBookingActions.tsx:49`.** Full-page reload on every booking action (confirm, complete, cancel). Replace with `router.refresh()` or optimistic state update.

3. **Edit listing — `Select` components do not show existing values.** (`[id]/edit/page.tsx:149–162`) Category and region fields appear blank on load, causing providers to unknowingly clear these fields on save.

4. **`PROVIDER_ID = 'prov_001'` hardcoded in `payouts/page.tsx:37`.** All providers see payout data belonging to `prov_001`. Financial data leakage.

### P1 (High — significant UX friction)

5. **New Listing is a single-scroll form, not a wizard.** No step indicators, no save-as-draft, no preview. `ListingWizard.tsx` exists but is not used.

6. **No iCal import/export on the calendar.**

7. **Bookings page — Accept/Reject actions are buried in a dropdown.** Pending bookings need visible inline CTA buttons.

8. **No booking detail view / drill-down page.**

9. **`estimated views = bookings * 4.2` shown as real data in Analytics funnel.** Misleading business metric.

10. **No per-route `loading.tsx`.** 9 sub-pages show a blank white screen during data fetch.

11. **AI Brain — no unsaved-changes warning.** Collapsing an edited section silently discards changes.

12. **Messages right panel `hidden lg:flex` — mode controls inaccessible on tablet/mobile.**

13. **Calendar touch support missing.** Date range drag-select uses mouse events only.

14. **Payouts — hardcoded `prov_001`** (see P0 #4 above — also a financial data integrity issue).

15. **Guests page — no action on guest card.** Read-only list with no contact, message, or booking history affordance.

### P2 (Medium — polish)

16. **Overview listing card uses `Eye` icon for "Edit" action.** Should be `Pencil`.
17. **Quick Actions "Settings" uses `Users` icon.** Should be `Settings`.
18. **Bookings summary cards — color-only status numbers** (no icon, WCAG violation).
19. **Calendar sidebar hidden on tablet.**
20. **Calendar — listing name not shown when provider has single listing.**
21. **Marketing "Share2 Mentions"** label should be "Instagram Mentions".
22. **Marketing Tags section is read-only** — no way to add/edit tags.
23. **No discount codes management page.**
24. **Settings — `rif` and `region` fields missing from the form.**
25. **Settings — no account/security section.**
26. **Sidebar `collapsed` state not persisted** to `localStorage`.
27. **Hardcoded Tailwind color classes** in Calendar, Messages, Revenue, and Payouts (should use DESIGN.md OKLCH tokens).
28. **Main content container lacks `mx-auto`** in layout — left-aligns content on wide screens.
29. **`TooltipTrigger render={...}` API mismatch** in collapsed sidebar "Back to app" link.
30. **`avgRating` on Overview samples only 5 listings** — misleading for providers with many.

### P3 (Low)

31. **Brain page `<h1>` includes inline icon** — non-standard pattern.
32. **Sidebar PMS group** could be merged into Inventory.
33. **Calendar has no multi-month view.**
34. **Revenue transaction list has no pagination** (limited to 20 with no "load more").
35. **Marketing empty-state social icon** appears faint/broken (`Share2` at 30% opacity).
36. **Calendar day cells compress below 44px touch target** on mobile.
