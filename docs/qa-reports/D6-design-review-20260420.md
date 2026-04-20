# D6 — Design System Audit
**Date:** 2026-04-20
**Design System:** DESIGN.md (OKLCH tokens, Fraunces + Plus Jakarta Sans + Inter typography, 4px spacing)
**Auditor:** Design Review Agent

---

## Executive Summary

The design system is well-defined in `DESIGN.md` and `app/globals.css`, with OKLCH semantic tokens, a three-font stack, and a clear spacing/radius specification. However, **compliance across the codebase is critically low**. Over 100 individual files use hardcoded Tailwind color classes instead of the OKLCH semantic tokens, with the admin section (`app/(admin)/`) being the most severe offender — it uses raw hex values in `style={}` props and has no dark-mode support at all. The tourist-facing pages (`app/(tourist)/`) use `bg-white` / `bg-gray-*` / `bg-sky-*` extensively, which will break under dark mode. Typography tokens (`font-heading`, `font-body`) are used only on the landing page and a handful of UI components; the entire tourist and admin route trees never apply them. Spacing compliance is good (no arbitrary `p-[13px]` values in production code), but arbitrary `text-[10px]` / `text-[11px]` sizes appear in 40+ files, bypassing the documented scale minimum of `xs: 12px`.

---

## Color Token Violations

Tokens defined: `primary`, `secondary`, `accent`, `muted`, `muted-foreground`, `foreground`, `background`, `card`, `border`, `destructive`, `status-confirmed`, `status-pending`, `status-cancelled`, `status-info`.

### TOURIST SECTION — `app/(tourist)/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `app/(tourist)/trips/page.tsx` | `bg-green-100 text-green-800`, `bg-yellow-100 text-yellow-800`, `bg-red-100 text-red-800`, `bg-blue-100 text-blue-800` (status map) | `bg-status-confirmed/20 text-status-confirmed`, `bg-status-pending/20 text-status-pending`, `bg-status-cancelled/20 text-status-cancelled`, `bg-status-info/20 text-status-info` |
| `app/(tourist)/trips/page.tsx` | `bg-sky-500`, `hover:bg-sky-600`, `text-sky-600`, `text-sky-300`, `bg-sky-100 text-sky-700`, `bg-gradient-to-br from-sky-100 to-amber-100` | `bg-primary`, `text-primary`, `bg-primary/10 text-primary`, `from-primary/10 to-accent/10` |
| `app/(tourist)/trips/page.tsx` | `border-red-200 text-red-500 hover:bg-red-50`, `bg-red-500 text-white hover:bg-red-600` | `border-destructive/40 text-destructive hover:bg-destructive/10`, `bg-destructive text-primary-foreground` |
| `app/(tourist)/trips/page.tsx` | `text-amber-600`, `text-amber-300`, `text-red-300` (icon colors in empty states) | `text-accent`, `text-muted-foreground` |
| `app/(tourist)/explore/category/[slug]/page.tsx` | `text-amber-400`, `bg-white/90 text-gray-800` | `text-accent`, `bg-card/90 text-card-foreground` |

### LISTING COMPONENTS — `components/listing/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/listing/ScrapedListingView.tsx` | `bg-orange-50 text-orange-700 border-orange-200` | `bg-status-pending/10 text-status-pending border-status-pending/30` |
| `components/listing/ScrapedListingView.tsx` | `bg-blue-50 border-blue-100`, `text-blue-600`, `text-blue-900`, `text-blue-700`, `bg-blue-600 hover:bg-blue-700` | `bg-primary/10 border-primary/20`, `text-primary`, `bg-primary hover:bg-primary/90` |
| `components/listing/ListingDetail.tsx` | `border-green-500 text-green-600 hover:bg-green-50` (WhatsApp button) | `border-secondary text-secondary hover:bg-secondary/10` |
| `components/listing/FavoriteButton.tsx` | `fill-red-500 text-red-500` | `fill-destructive text-destructive` |
| `components/listing/BrowseListingCard.tsx` | `from-blue-400 to-blue-600`, `from-orange-400 to-orange-600`, `from-emerald-400 to-emerald-600`, `from-purple-400 to-purple-600` (category gradients) | `from-primary to-primary/80`, define per-category via design system accent variants |
| `components/listing/BrowseListingCard.tsx` | `bg-cyan-50 text-cyan-700`, `bg-emerald-50 text-emerald-700`, `bg-blue-50 text-blue-700`, `bg-slate-50 text-slate-700`, `bg-teal-50 text-teal-700`, `bg-green-50 text-green-700`, `bg-lime-50 text-lime-700`, `bg-orange-50 text-orange-700`, `bg-violet-50 text-violet-700`, `bg-pink-50 text-pink-700`, `bg-purple-50 text-purple-700`, `bg-amber-50 text-amber-700`, `bg-rose-50 text-rose-700`, `bg-amber-100 text-amber-800 border-amber-200`, `bg-emerald-100 text-emerald-800 border-emerald-200` (all tag variants) | Consolidate into `bg-primary/10 text-primary`, `bg-secondary/10 text-secondary`, `bg-accent/10 text-accent` by category |
| `components/listing/BrowseListingCard.tsx` | `fill-rose-500 text-rose-500` (heart) | `fill-destructive text-destructive` |
| `components/listing/AvailabilityCalendar.tsx` | `text-yellow-600 dark:text-yellow-400`, `bg-amber-50 dark:bg-amber-950/30`, `bg-yellow-400` (legend dot) | `text-status-pending`, `bg-status-pending/10`, `bg-status-pending` |
| `components/listing/BookingForm.tsx` | `bg-blue-50`, `text-blue-800`, `text-blue-700`, `border-blue-200` (payment instructions) | `bg-primary/10`, `text-primary`, `border-primary/30` |

### PROVIDER DASHBOARD — `app/(provider)/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `app/(provider)/dashboard/analytics/page.tsx` | `text-blue-500`, `text-green-500`, `text-purple-500`, `text-teal-500`, `text-orange-500`, `text-indigo-500` (stat card icons) | `text-primary`, `text-secondary`, `text-accent`, and semantic variants |
| `app/(provider)/dashboard/payouts/page.tsx` | `bg-yellow-100 text-yellow-800`, `bg-blue-100 text-blue-800`, `bg-green-100 text-green-800`, `bg-red-100 text-red-800` (status map) | `bg-status-pending/20 text-status-pending`, `bg-status-info/20 text-status-info`, `bg-status-confirmed/20 text-status-confirmed`, `bg-status-cancelled/20 text-status-cancelled` |
| `app/(provider)/dashboard/payouts/page.tsx` | `text-blue-600`, `text-green-700`, `text-green-600` | `text-primary`, `text-status-confirmed` |
| `app/(provider)/dashboard/page.tsx` | `bg-green-100`, `text-green-600`, `bg-yellow-100`, `text-yellow-600`, `bg-blue-100`, `text-blue-600`, `bg-purple-100`, `text-purple-600` (stat icon containers) | `bg-secondary/20 text-secondary`, `bg-status-pending/20 text-status-pending`, `bg-primary/20 text-primary`, `bg-accent/20 text-accent` |
| `app/(provider)/dashboard/revenue/page.tsx` | `bg-blue-100 text-blue-800`, `bg-purple-100 text-purple-800`, `bg-yellow-100 text-yellow-800`, `bg-green-100 text-green-800` (payment method badges) | Status tokens or `bg-primary/20`, `bg-accent/20`, `bg-muted` |
| `app/(provider)/dashboard/revenue/page.tsx` | `text-green-600`, `text-red-500`, `bg-blue-500`, `bg-purple-500` (trend indicators, bar charts) | `text-status-confirmed`, `text-destructive`, `bg-primary`, `bg-accent` |
| `app/(provider)/dashboard/calendar/page.tsx` | `bg-blue-100 dark:bg-blue-900/30`, `bg-gray-100 dark:bg-gray-800/60`, `bg-yellow-50 dark:bg-yellow-900/20`, `bg-green-50 dark:bg-green-900/10`, `bg-blue-500`, `bg-orange-400`, `bg-gray-400` (calendar event colors) | `bg-status-info/20`, `bg-muted`, `bg-status-pending/10`, `bg-secondary/10`, `bg-primary`, `bg-accent`, `bg-muted-foreground` |
| `app/(provider)/dashboard/messages/page.tsx` | `bg-green-100 text-green-800 border-green-200`, `bg-blue-100 text-blue-800 border-blue-200`, `bg-red-100 text-red-800 border-red-200`, `bg-gray-100 text-gray-500 border-gray-200`, `bg-green-500`, `bg-blue-500`, `bg-red-500`, `bg-gray-400` (conversation status badges + dots) | Status tokens: `bg-status-confirmed/20`, `bg-status-info/20`, `bg-status-cancelled/20`, `bg-muted` |
| `app/(provider)/dashboard/messages/page.tsx` | `text-green-600`, `text-blue-600`, `text-red-600`, `text-yellow-700`, `text-green-700`, `text-blue-700` (count colors, booking status) | Status tokens |
| `app/(provider)/dashboard/pms/page.tsx` | `bg-yellow-500`, `bg-green-500`, `bg-blue-500`, `bg-slate-400`, `bg-red-400`, `bg-orange-400` (reservation status dots) | Status tokens: `bg-status-pending`, `bg-status-confirmed`, `bg-status-info`, `bg-muted-foreground`, `bg-status-cancelled`, `bg-destructive` |
| `app/(provider)/dashboard/pms/payments/page.tsx` | `text-yellow-700 bg-yellow-100`, `text-green-700 bg-green-100`, `text-red-700 bg-red-100`, `text-slate-700 bg-slate-100`, `bg-green-100 text-green-700`, `bg-yellow-100 text-yellow-700`, `bg-slate-100 text-slate-700` | Status tokens |
| `app/(provider)/dashboard/pms/guests/page.tsx` | `bg-blue-100 text-blue-700`, `bg-green-100 text-green-700`, `bg-purple-100 text-purple-700`, `bg-orange-100 text-orange-700`, `bg-pink-100 text-pink-700`, `bg-cyan-100 text-cyan-700` (avatar fallback colors) | Use a CSS-based hue rotation from `--primary` or use named avatar variants |
| `app/(provider)/dashboard/pms/settings/page.tsx` | `bg-blue-100 text-blue-700`, `bg-green-100 text-green-700`, `bg-orange-100 text-orange-700` (staff role badges) | `bg-primary/20 text-primary`, `bg-secondary/20 text-secondary`, `bg-accent/20 text-accent` |
| `app/(provider)/dashboard/messages/brain/page.tsx` | `bg-green-100 text-green-700` (completion badge) | `bg-status-confirmed/20 text-status-confirmed` |
| `app/(provider)/dashboard/pms/reservations/[id]/page.tsx` | `text-green-600` (balance display) | `text-status-confirmed` |

### ADMIN SECTION — `app/(admin)/` (MOST SEVERE)

The entire admin section was built outside the design system. Key violations:

| File | Hardcoded Classes | Notes |
|------|-----------------|-------|
| `app/(admin)/admin/page.tsx` | `text-gray-900`, `text-gray-500`, `text-gray-400`, `text-gray-700`, `text-gray-300`, `text-gray-600`, `bg-white`, `border-gray-100`, `border-gray-200`, `text-blue-500`, `bg-blue-50 border-blue-100`, `bg-amber-50 border-amber-100`, `text-amber-900`, `text-amber-600`, `text-amber-700`, `bg-amber-100`, `text-green-600` | 40+ individual hardcoded classes; `bg-white` will break dark mode |
| `app/(admin)/admin/listings/page.tsx` | `text-gray-*` (gray-900/700/600/500/400/300), `bg-gray-*`, `bg-white`, `border-gray-*`, `text-blue-*`, `bg-blue-*`, `text-green-*`, `bg-green-*`, `text-red-*`, `bg-red-*`, `text-amber-*`, `bg-amber-*`, `text-purple-*`, `bg-purple-*`, `text-cyan-*`, `bg-cyan-*`, `text-emerald-*`, `bg-emerald-*`, `text-[11px]` sub-scale sizes | Worst file in codebase — uses `style={{ background: '#fff', borderLeft: '1px solid #E5E7EB' }}`, `style={{ background: '#EFF6FF', color: '#3B82F6' }}`, `style={{ background: '#10B981' }}`, `style={{ background: '#3B82F6' }}` — raw hex with no token fallback |
| `app/(admin)/admin/bookings/page.tsx` | `text-gray-*`, `bg-white`, `border-gray-*`, `text-blue-*`, `text-green-*`, `text-red-*`, `style={{ background: '#F3F4F6' }}`, `style={{ background: '#F9FAFB' }}`, `style={{ background: '#FAFAFA' }}` | Raw hex backgrounds |
| `app/(admin)/admin/outreach/page.tsx` | `text-gray-*`, `bg-gray-*`, `bg-white`, `border-gray-*`, `bg-purple-*`, `text-purple-*`, `bg-green-*`, `text-green-*`, `bg-red-500`, `bg-blue-50`, `text-blue-*`, `bg-amber-50 border-amber-100`, `text-amber-*`, `style={{ color: '#25D366' }}` (WhatsApp), `style={{ color: '#E1306C' }}` (Instagram), `style={{ color: '#3B82F6' }}` (email) | Brand colors in style props acceptable for social channels but should use CSS variables |
| `app/(admin)/admin/outreach/sequences/page.tsx` | `text-gray-*`, `bg-white`, `border-gray-*`, `bg-blue-50 border-blue-100`, `text-blue-*`, `bg-amber-50 border-amber-100`, `text-amber-*` | — |
| `app/(admin)/admin/providers/page.tsx` | `text-gray-*`, `bg-white`, `border-gray-*`, `bg-gray-*`, `text-green-*`, `border-green-*`, `bg-green-*`, `text-cyan-*`, `border-cyan-*`, `bg-cyan-*`, `text-red-*`, `bg-amber-*`, `text-amber-*`, `border-blue-*`, `text-blue-*`, `bg-blue-*` | — |
| `app/(admin)/admin/layout.tsx` | `text-gray-*`, `bg-white`, `border-gray-*`, `bg-gray-800`, `bg-gray-900`, `text-red-600 bg-red-50`, `ring-blue-500`, `ring-blue-400` | Auth gate uses hardcoded blue focus rings — should be `ring-primary` |
| `app/(admin)/admin/loading.tsx` | `bg-gray-*`, `bg-white`, `border-gray-*` | Skeleton uses gray tokens directly |
| `app/(admin)/admin/error.tsx` | `text-gray-900`, `text-gray-500`, `text-gray-400`, `ring-blue-500` | — |
| `app/(admin)/admin/itineraries/page.tsx` | `bg-gray-100`, `text-gray-500`, `hover:bg-gray-50`, `bg-amber-500` | — |
| `app/(admin)/admin/payouts/page.tsx` | `text-green-600`, `text-orange-600` | — |
| `app/(admin)/admin/analytics/page.tsx` | `text-green-600` | — |
| `app/(admin)/admin/discover/collections/page.tsx` | `from-primary to-blue-600`, `bg-green-100 text-green-700`, `border-red-200`, `ring-blue-400` | `to-blue-600` breaks the OKLCH primary — should be `to-primary/60` |

### WHATSAPP COMPONENTS — `components/whatsapp/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/whatsapp/ConversationList.tsx` | `bg-green-100 text-green-800 border-green-200`, `bg-blue-100 text-blue-800 border-blue-200`, `bg-red-100 text-red-800 border-red-200`, `bg-gray-100 text-gray-500 border-gray-200`, `bg-green-500`, `bg-blue-500`, `bg-red-500`, `bg-gray-400` | Status tokens |
| `components/whatsapp/MessageThread.tsx` | Same status badge pattern as ConversationList (duplicated) | Status tokens (DRY violation — same config defined in 3 files) |
| `components/whatsapp/BookingPipeline.tsx` | `text-yellow-700`, `text-green-700`, `text-blue-700` | `text-status-pending`, `text-status-confirmed`, `text-status-info` |
| `components/whatsapp/AiSettingsPanel.tsx` | `bg-amber-50 border-amber-200`, `text-amber-*`, `bg-green-100`, `text-green-*`, `bg-green-500`, `text-blue-600`, `bg-green-50`, `border-green-300` | `bg-status-pending/10 border-status-pending/30`, `bg-status-confirmed/10`, `text-primary` |
| `components/whatsapp/DemoSidebar.tsx` | `bg-red-500` (notification badge), `bg-amber-50 border-amber-200`, `text-amber-700` | `bg-destructive`, `bg-status-pending/10 border-status-pending/30`, `text-status-pending` |

### ITINERARY COMPONENTS — `components/itinerary/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/itinerary/SpotReviewCard.tsx` | `text-green-600 bg-green-50 dark:bg-green-950/30`, `text-amber-600 bg-amber-50 dark:bg-amber-950/30`, `text-red-600 bg-red-50 dark:bg-red-950/30` (confidence levels) | `text-status-confirmed bg-status-confirmed/10`, `text-status-pending bg-status-pending/10`, `text-status-cancelled bg-status-cancelled/10` |
| `components/itinerary/BuildItineraryModal.tsx` | `from-amber-400 to-yellow-300`, `text-amber-900`, `text-amber-950`, `border-amber-400`, `bg-amber-50`, `bg-amber-400`, `text-amber-700`, `bg-amber-100`, `text-amber-400`, `ring-amber-400` | `bg-accent`, `text-accent-foreground`, `border-accent`, `bg-accent/10` — this component has fully custom amber theming that bypasses the accent token |
| `components/itinerary/ShareButton.tsx` | `text-green-600` (success state) | `text-status-confirmed` |
| `components/itinerary/ItineraryPanel.tsx` | `text-amber-500` (unsaved indicator) | `text-status-pending` |

### MAP COMPONENTS — `components/map/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/map/LocationRadius.tsx` | `bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-700` | `bg-card/90 border-border` |
| `components/map/MapControls.tsx` | `bg-white dark:bg-gray-800 hover:bg-gray-50` | `bg-card hover:bg-accent` |
| `components/map/MapLegend.tsx` | `bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-700`, `text-gray-500 dark:text-gray-400`, `text-gray-400`, `hover:bg-gray-100 dark:hover:bg-gray-800`, `text-gray-700 dark:text-gray-300` | `bg-card/90 border-border`, `text-muted-foreground`, `hover:bg-muted` |
| `components/map/MapContainer.tsx` | `bg-gray-100 dark:bg-gray-900`, `bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900`, `bg-white/50 dark:bg-gray-800/50` | `bg-muted`, `from-primary/10 to-primary/20`, `bg-card/50` |
| `components/map/SafetyZoneOverlay.tsx` | `bg-white/95 dark:bg-gray-900/95`, `border-gray-200 dark:border-gray-700` | `bg-card/95 border-border` |
| `components/map/RouteLayer.tsx` | `bg-white/90 dark:bg-gray-900/90` | `bg-card/90` |
| `components/map/PinPreviewCard.tsx` | `fill-amber-400 text-amber-400` (star rating) | `fill-accent text-accent` |

### PROVIDER COMPONENTS — `components/provider/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/provider/StatsCard.tsx` | `text-green-500`, `text-red-500`, `text-green-600`, `text-red-600` | `text-status-confirmed`, `text-destructive` |
| `components/provider/PayoutCard.tsx` | `text-green-600`, `border-amber-200 bg-amber-50`, `text-amber-600`, `text-amber-800`, `text-amber-700`, `text-red-600`, `text-green-700` | `text-status-confirmed`, status tokens |
| `components/provider/PricingSuggestion.tsx` | `text-amber-500`, `border-amber-200 bg-amber-50`, `text-amber-600`, `text-amber-900`, `bg-amber-100`, `text-amber-700`, `text-amber-900` | `text-accent`, `bg-accent/10 border-accent/30`, `text-accent-foreground` |
| `components/provider/PayoutMethodForm.tsx` | `border-blue-500 bg-blue-50 ring-1 ring-blue-500`, `hover:border-blue-300` | `border-primary bg-primary/10 ring-1 ring-primary`, `hover:border-primary/50` |
| `components/provider/CalendarView.tsx` | `bg-blue-100 text-blue-800` (status fallback) | `bg-status-info/20 text-status-info` |
| `components/provider/BookingInboxItem.tsx` | `bg-gray-100 text-gray-800` (status fallback), `text-red-600 border-red-200 hover:bg-red-50` | `bg-muted text-muted-foreground`, `text-destructive border-destructive/30 hover:bg-destructive/10` |

### SOCIAL & COMMON — `components/social/`, `components/common/`

| File | Hardcoded Classes | Design Token Should Be |
|------|-----------------|----------------------|
| `components/social/ReactionBar.tsx` | `text-red-500`, `fill-red-500` (liked heart) | `text-destructive`, `fill-destructive` |
| `components/social/ItineraryFeedCard.tsx` | `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800` (Creator badge) | `bg-accent/10 text-accent border-accent/30` |
| `components/map/MapContainer.tsx` | `from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900` (map placeholder) | `from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30` |

### RUTA SECTION — `app/(ruta)/`, `components/ruta/` (DIFFERENT DESIGN SYSTEM — INTENTIONAL)

These files use `style={{ color: '#c9a96e' }}`, `style={{ color: '#999' }}`, etc. This is the RUTA security site's own dark-theme design system (from `/Users/tomas/CLAUDE.md`). These are **intentional** and should **not** be migrated to VZ Explorer tokens. However:

- `app/(ruta)/ruta/page.tsx` — 10 inline hex color style props (intentional for RUTA theme)
- `components/ruta/SecuritySection.tsx`, `ServiceCards.tsx`, `ContactSection.tsx`, `BookingForm.tsx` — same (intentional)

**Total distinct files with non-intentional hardcoded color violations: ~75**

---

## Typography Issues

### Font Loading — PASS
All three fonts are correctly loaded in `app/layout.tsx`:
- `Inter` → `--font-sans` (data/UI)
- `Fraunces` → `--font-display` (headings)
- `Plus_Jakarta_Sans` → `--font-body` (body copy)

### Font Token Usage — FAIL (Tourist and Admin routes)

`font-heading` / `font-display` / `font-body` are used in:
- `app/page.tsx` (landing page) — `font-heading` on all headings ✓
- `components/ui/card.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx` — `font-heading` on titles ✓
- `components/common/Logo.tsx` — `font-heading`, `font-body` ✓

**NOT used in:**
- All 37 files under `app/(tourist)/` — zero `font-heading` or `font-body` usage; all headings default to `font-sans` (Inter), defeating the editorial Fraunces upgrade
- All 12 files under `app/(admin)/` — same; admin pages use system defaults
- All 9 files under `app/(provider)/` — same
- `components/listing/` — all 9 components; ListingCard, BrowseListingCard headings use plain text classes

**Impact:** The visual distinction between editorial Fraunces headlines and Plus Jakarta Sans body copy — the core of the design system's "curated travel magazine" identity — is completely absent from all product pages.

### Arbitrary Font Sizes — FAIL (bypasses 12px minimum)

The design scale minimum is `xs: 12px`. The following use `text-[10px]`, `text-[11px]`, or `text-[9px]`, all below the documented scale:

**40+ occurrences across 15 files:**
- `app/(admin)/admin/outreach/page.tsx` — `text-[10px]` (×8), `text-[11px]` (×3), `text-[9px]` (×1)
- `app/(admin)/admin/listings/page.tsx` — `text-[10px]` (×8), `text-[11px]` (×3)
- `app/(admin)/admin/providers/page.tsx` — `text-[10px]`, `text-[11px]`
- `app/(admin)/admin/outreach/sequences/page.tsx` — `text-[10px]` (×6)
- `app/(admin)/admin/layout.tsx` — `text-[10px]`
- `app/(admin)/admin/itineraries/page.tsx` — `text-[10px]`
- `app/onboard/[slug]/OnboardingWizard.tsx` — `text-[10px]`, `text-[11px]`
- `components/whatsapp/AiSettingsPanel.tsx` — `text-[10px]` (×5), `text-[11px]` (×8)
- `components/whatsapp/BookingPipeline.tsx` — `text-[10px]` (×5)
- `components/whatsapp/ConversationList.tsx` — `text-[10px]`
- `components/whatsapp/MessageThread.tsx` — `text-[10px]` (×4), `text-[11px]`
- `components/whatsapp/DemoSidebar.tsx` — `text-[9px]`, `text-[10px]`
- `components/listing/AvailabilityCalendar.tsx` — `text-[9px]`, `text-[11px]`
- `components/listing/BookingForm.tsx` — `text-[10px]` (×2)
- `components/itinerary/SpotReviewCard.tsx` — `text-[10px]`
- `components/common/MobileTabBar.tsx` — `text-[10px]`
- `app/demo/_components/CreatorProgram.tsx`, `PlatformDemo.tsx` — `text-[10px]`

**Note:** Some uses of `text-[10px]` in the admin and WhatsApp demo may be acceptable as a micro-label size below `xs`. However, they should be added as a named token (`text-2xs`) in globals.css rather than as arbitrary values scattered across 15 files.

### Inline Hex Color Styles (Typography-related) — FAIL
`app/(admin)/admin/listings/page.tsx` line 719: `style={{ background: '#EFF6FF', color: '#3B82F6' }}` — raw hex. This is a tag badge rendered in a loop.

---

## Spacing Issues

### 4px Grid Compliance — MOSTLY PASS
No arbitrary `p-[13px]`, `m-[37px]` off-grid values found in production code. The `p-[3px]` in `components/ui/tabs.tsx` is from the shadcn base component (acceptable).

### Notable Issues
- `components/ruta/BookingForm.tsx` line 422: `style={{ color: '#777' }}` on a `text-[10px]` div — raw inline style + off-scale size
- `app/page.tsx` lines 151/164: `transition: 'all 1000ms ease-out 300ms'` and `'all 1000ms ease-out 600ms'` inline style — uses raw CSS transition, not Tailwind classes; bypasses `motion-reduce` handling
- `components/common/HeroSection.tsx`: `duration-700`, `duration-12000ms` (arbitrary) — 12000ms exceeds the defined Long duration of 500ms by 24×

---

## Border Radius Issues

### Scale Definition (from DESIGN.md + globals.css)
- Cards: `rounded-2xl` (16px via `--radius-2xl`)
- Modals: `rounded-xl` (14px)
- Buttons: `rounded-lg` (12px)
- Inputs: `rounded-md` (10px)
- Badges/chips: `rounded-md` (8px) or `rounded-full`

### Issues Found

**`rounded-xl` overuse — 54 occurrences in `app/(tourist)/` alone:**
The tourist section applies `rounded-xl` to almost everything — cards, containers, table rows, form fields — where the design system differentiates by component type. Cards should be `rounded-2xl`; inputs `rounded-md`; modals `rounded-xl` is correct.

Specific violations:
- `components/listing/ListingDetail.tsx` (7 uses of `rounded-xl` including an input field and a stat container — should be `rounded-md` for inputs)
- `app/(tourist)/trips/page.tsx` — applies `rounded-lg` to buttons (`rounded-lg` = 12px is correct) and `rounded-xl` to containers (14px — correct for modal-like panels; check intent)
- `app/(admin)/admin/page.tsx` — `rounded-xl` on stat cards (should be `rounded-2xl` per DESIGN.md card spec)
- `app/(admin)/admin/` — extensive `rounded-xl` on cards that should be `rounded-2xl`

**`rounded-[3rem]`:**
- `app/demo/_components/MobileTeaser.tsx` line 30: `rounded-[3rem]` for phone bezel — intentional device mockup, acceptable

**Inconsistent modal radius:**
- `components/map/MapLegend.tsx`: `rounded-xl` — correct
- `components/listing/BookingForm.tsx`: `rounded-lg` on what appears to be a modal step container — should be `rounded-xl`

---

## Motion Issues

### `prefers-reduced-motion` — PASS (globally handled)
`app/globals.css` has a global `@media (prefers-reduced-motion: reduce)` rule that disables all animations/transitions platform-wide. `components/common/MotionProvider.tsx` wraps Framer Motion with `reducedMotion="user"`. `MotionDiv.tsx` uses `useReducedMotion()` hook. Coverage is thorough.

### Duration Values — PARTIAL VIOLATION
DESIGN.md defines Long duration as 500ms. Found durations that exceed this:
- `app/page.tsx`: `duration-1000` (1000ms), inline `transition: 'all 1000ms ...'` — 2× the Long maximum
- `app/page.tsx`: inline `transition: 'opacity 2000ms ease-in-out, transform 12000ms ease-out'` — 24× the Long maximum for the hero background Ken Burns effect
- `components/common/HeroSection.tsx`: `duration-700` (700ms > 500ms Long), `duration-12000ms` on image zoom
- `app/demo/_components/DemoHero.tsx`: `duration-[2000ms]` on crossfade

The 2000ms+ image crossfades and 12000ms Ken Burns effects are deliberate hero photo transitions and likely intentional design decisions rather than violations — they create cinematic effect. However, they are not documented in DESIGN.md's motion section. Should be added as an exception or new `cinematic` duration tier.

### Easing — PASS
All identified transitions use `ease-out` (enter), `ease-in-out` (move), which matches the DESIGN.md spec.

### Arbitrary CSS Transitions (bypassing motion-reduce) — MINOR ISSUE
`app/page.tsx` lines 151 and 164 use inline `style={{ transition: 'all 1000ms ...' }}` rather than Tailwind classes. These will NOT be caught by the global `@media (prefers-reduced-motion)` CSS rule (which targets `*`), but WILL be caught since the global rule applies to `*::before` / `*::after` and `*`. However, using inline styles for transitions is inconsistent with the rest of the system.

---

## Component Library Gaps

### Status Badge Pattern — Duplicated in 3 Files
The same `STATUS_CONFIG` object mapping conversation status to badge colors is defined identically in:
1. `app/(provider)/dashboard/messages/page.tsx` (lines 27–30)
2. `components/whatsapp/ConversationList.tsx` (lines 16–19)
3. `components/whatsapp/MessageThread.tsx` (lines 21–24)

This should be a single exported constant in a shared module (e.g., `lib/whatsapp-status-config.ts`). Currently if you update one, the others drift.

### Admin Pages — Zero shadcn/ui Usage
`app/(admin)/admin/listings/page.tsx` and `app/(admin)/admin/page.tsx` import **no** `@/components/ui/*` components. They hand-roll all buttons, badges, inputs, and modals with raw HTML `<button>`, `<input>`, and `<div>` elements. This creates ~200 lines of duplicated styling for actions that `Button`, `Badge`, and `Input` from shadcn/ui would handle correctly.

Compare:
- `app/(admin)/admin/itineraries/page.tsx` — uses `Badge`, `Button`, `Card` ✓
- `app/(admin)/admin/listings/page.tsx` — uses none ✗

### Inline Button Variants — Widespread
Throughout the codebase, button-like elements are built as `<button className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">` instead of `<Button variant="outline" size="sm">`. The admin and provider dashboard pages have 50+ such instances.

### No Unified ListingCard
Two competing card components exist:
- `components/listing/ListingCard.tsx`
- `components/listing/BrowseListingCard.tsx`

The DESIGN.md decision log (2026-04-19) notes this: "Unified ListingCard with variant prop — two competing card components causes divergence." This has not been implemented.

### Missing Empty States Component
`components/common/EmptyState.tsx` exists and is imported in some pages, but several pages still use ad-hoc empty states:
- `app/(tourist)/trips/page.tsx` defines 4 bespoke empty state objects inline with their own icons and CTAs
- `app/(admin)/admin/listings/page.tsx` uses `<td>...text-gray-400</td>` for empty table states

---

## Dark Mode Readiness

### Status: BLOCKED for Admin and Provider sections

**`app/(admin)/`** — Zero dark mode readiness. Every file uses `bg-white`, `text-gray-*`, `border-gray-*` without `dark:` variants. The entire admin section would become unreadable in dark mode: white backgrounds stay white, gray text becomes invisible on a dark background.

**`app/(tourist)/`** — Partial. Only 2 of 37 files (`itinerary/[id]/page.tsx`, `itineraries/InfluencerCard.tsx`) use `dark:` variants. Files using `bg-white` (9 files) and `bg-gray-*` would break.

**`app/(provider)/`** — Mixed. Provider dashboard uses semantic tokens (good) but also raw `bg-gray-*` in several places. `app/(provider)/dashboard/calendar/page.tsx` is the best example — it explicitly pairs `dark:` variants with every color, though it still uses hardcoded gray values.

**`components/listing/`** — Several components use `bg-white` without `dark:bg-card` fallback (e.g., `BrowseListingCard.tsx`, `FavoriteButton.tsx`).

**`components/map/`** — Good partial dark mode support. Most map components explicitly use `dark:bg-gray-*` variants, though these should be `dark:bg-card` / `dark:bg-muted` instead.

**What works correctly:**
- `components/whatsapp/AiSettingsPanel.tsx` — uses semantic tokens + `dark:` variants consistently
- `components/itinerary/SpotReviewCard.tsx` — uses `dark:` correctly
- `components/social/ItineraryFeedCard.tsx` — uses `dark:` on creator badge
- `components/listing/AvailabilityCalendar.tsx` — uses `dark:` variants throughout

**Components that would show invisible text in dark mode:**
- All of `app/(admin)/` (white backgrounds, dark gray text)
- `components/listing/ScrapedListingView.tsx` — `bg-blue-50 text-blue-900` has no dark variant
- `components/listing/BookingForm.tsx` — `bg-blue-50 text-blue-800` payment section
- `app/(tourist)/trips/page.tsx` — `bg-gradient-to-br from-sky-100 to-amber-100` placeholder would be invisible

---

## Priority Issues

### P0 — Design system breaks functionality / invisible text in dark mode

1. **`app/(admin)/` — all 10 files** use `bg-white` without dark fallback. If dark mode is ever toggled, the entire admin panel becomes white-on-white or dark-text-on-dark-background. *Dark mode is defined in globals.css — it can be triggered.* (Files: `page.tsx`, `listings/page.tsx`, `bookings/page.tsx`, `outreach/page.tsx`, `providers/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `itineraries/page.tsx`, `discover/collections/page.tsx`)

2. **`components/listing/ScrapedListingView.tsx`** — The "notify me" panel uses `bg-blue-50 text-blue-900` with a hardcoded `bg-blue-600` button. In dark mode this becomes a dark-blue-on-dark-blue box. This is a consumer-facing page shown to all users.

### P1 — High: widespread design token violations

3. **Status color tokens unused** — `bg-status-confirmed`, `bg-status-pending`, `bg-status-cancelled`, `bg-status-info` were defined in globals.css (design review v0.3.5) but are used in only 2 files (`components/listing/BookingForm.tsx` line 555, `components/provider/dashboard/messages/brain/page.tsx`). At least 25 files use the raw green/yellow/red/blue hardcoded equivalents.

4. **`font-heading` / `font-body` not applied in tourist routes** — The editorial Fraunces + Plus Jakarta Sans font system is completely absent from all product pages. The three-font stack was the signature design decision of the 2026-04-19 design review. Zero `font-heading` usage across `app/(tourist)/`, `components/listing/`, `components/social/`.

5. **`components/listing/BrowseListingCard.tsx`** — 15 distinct hardcoded Tailwind color families for category and activity tags. This single file uses: blue, orange, emerald, purple, cyan, teal, green, lime, violet, pink, rose, amber, slate. Every tag is a different color. This is visually chaotic and prevents any dark mode support.

6. **`components/itinerary/BuildItineraryModal.tsx`** — Completely bypasses the `accent` token with its own `amber-400/amber-950` palette for the AI itinerary builder. As the primary conversion CTA, it should use `bg-accent text-accent-foreground`.

7. **`app/(admin)/admin/listings/page.tsx`** — The largest admin file (1800+ lines) uses zero shadcn/ui UI components, has 10+ raw hex `style={{}}` props, and 60+ hardcoded Tailwind color classes. Requires a full rewrite pass.

### P2 — Medium: inconsistencies

8. **`rounded-xl` over `rounded-2xl` on cards** — Design system specifies `rounded-2xl` for cards. The majority of card-like components use `rounded-xl`. ~50 occurrences across tourist and admin sections.

9. **Duplicate STATUS_CONFIG** — The conversation status badge configuration is defined identically in 3 files (`messages/page.tsx`, `ConversationList.tsx`, `MessageThread.tsx`). Should be a single shared module.

10. **Hero transition durations exceed DESIGN.md Long (500ms)** — `app/page.tsx` and `components/common/HeroSection.tsx` use 700ms, 1000ms, 2000ms, and 12000ms transitions. Need to document the `cinematic` exception or align with spec.

11. **`text-[10px]` / `text-[9px]` sub-scale sizes** — 40+ occurrences across 15 files use sizes below the documented `xs: 12px` minimum. Should define a `2xs` token or enforce 12px minimum.

12. **Two competing ListingCard components** — `ListingCard.tsx` vs `BrowseListingCard.tsx` (noted as a known issue since 2026-04-19 design review; still not resolved).

### P3 — Low: minor polish

13. **`app/(provider)/dashboard/analytics/page.tsx`** — Uses 6 different hardcoded icon colors (blue, green, purple, teal, orange, indigo) for stat cards. No semantic meaning. Should use `text-primary`, `text-secondary`, `text-accent`.

14. **`components/social/ReactionBar.tsx`** — `text-red-500 fill-red-500` for liked heart. Should be `text-destructive fill-destructive` (red = destructive in the token system, semantically consistent for a "like"/heart interaction).

15. **`app/(admin)/admin/discover/collections/page.tsx`** — `from-primary to-blue-600` gradient mixes a semantic token with a hardcoded value, which breaks the gradient in dark mode where `--primary` changes value.

---

## Summary Table

| Category | Files Affected | Severity | Status |
|----------|--------------|---------|--------|
| Color token violations (tourist) | 5 | P1 | Not compliant |
| Color token violations (listing components) | 7 | P1 | Not compliant |
| Color token violations (provider dashboard) | 12 | P1 | Not compliant |
| Color token violations (admin — all files) | 10 | P0/P1 | Not compliant |
| Color token violations (whatsapp) | 5 | P1 | Partial |
| Color token violations (itinerary components) | 4 | P1 | Partial |
| Color token violations (map components) | 6 | P1 | Partial |
| Inline hex style props (admin, ruta) | 6 | P0 (admin) / Intentional (ruta) | Not compliant |
| Font token usage (tourist/admin/provider) | 60+ | P1 | Not compliant |
| Arbitrary sub-scale font sizes | 15 | P2 | Not compliant |
| Border radius inconsistency | 20+ | P2 | Partially compliant |
| Dark mode readiness (admin) | 10 | P0 | Blocked |
| Dark mode readiness (tourist) | 9 | P1 | Partial |
| Duplicate STATUS_CONFIG | 3 | P2 | Not compliant |
| shadcn/ui gaps in admin | 2 | P2 | Not compliant |
| Motion duration violations | 3 | P2 | Partial |
