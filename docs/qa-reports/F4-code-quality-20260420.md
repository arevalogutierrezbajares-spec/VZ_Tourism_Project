# F4 — Code Quality Review
**Date:** 2026-04-20
**Branch:** main
**Reviewer:** Blind first-pass audit (475 TS/TSX files)

---

## Executive Summary

The codebase is architecturally coherent and shows deliberate patterns — Zustand for stores, React Hook Form + Zod for forms, Next.js App Router, and a Supabase-with-file-fallback dual-persistence strategy. The most systematic quality problem is the **dual-persistence pattern** (Supabase primary + file-based JSON stores) which has accumulated significant type-safety debt: `as any`, `as unknown as`, and repeated cast chains are concentrated in the API layer that bridges the two systems. Fourteen god-class files exceed 400 lines (two exceed 1,600 lines), and 30 of 81 API routes have no top-level `try/catch`. Three critical auth TODOs — hardcoded `prov_001` provider IDs in live API routes — represent real production bugs.

---

## TypeScript Quality

### `: any` usages — 10 occurrences in production code

All production `: any` is in API routes and test mocks.

| File | Line | Context |
|------|------|---------|
| `app/api/bookings/route.ts` | 188 | `let booking: any = null` — typed fallback variable |
| `app/api/stripe/webhooks/route.ts` | 7 | `supabase: any` parameter in helper functions (×3) |
| `app/api/stripe/webhooks/route.ts` | 33 | `{ type: string; data: { object: any } }` Stripe event type |
| `__tests__/unit/components/BookingForm.test.tsx` | 61, 71 | mock component props |
| `__tests__/unit/components/ItineraryPanel.test.tsx` | 62, 65, 78, 84 | mock component props |

**Worst offender:** `app/api/stripe/webhooks/route.ts` — 3 occurrences of `supabase: any` that could be replaced with the actual `SupabaseClient` type from `@supabase/supabase-js`.

### `as any` usages — 17 occurrences in production code (excluding tests)

Pattern is concentrated in the zodResolver workaround and the Mapbox dynamic import:

| File | Count | Pattern |
|------|-------|---------|
| `app/(auth)/login/page.tsx` | 1 | `resolver: zodResolver(loginSchema) as any` |
| `app/(auth)/register/page.tsx` | 1 | same pattern |
| `app/(auth)/provider-register/page.tsx` | 1 | same pattern |
| `app/(provider)/dashboard/listings/[id]/edit/page.tsx` | 1 | same pattern |
| `app/(provider)/dashboard/listings/new/page.tsx` | 1 | same pattern |
| `app/(provider)/dashboard/settings/page.tsx` | 1 | same pattern |
| `components/provider/ListingWizard.tsx` | 1 | same pattern |
| `components/admin/AdminSafetyZoneForm.tsx` | 1 | same pattern |
| `components/listing/ReviewSection.tsx` | 1 | same pattern |
| `components/listing/ListingMap.tsx` | 4 | `(mapboxgl as any).accessToken`, `new (mapboxgl as any).Map`, etc. |
| `app/api/stripe/webhooks/route.ts` | 3 | `(supabase as any).from(...)` |
| `components/provider/ListingWizard.tsx` | 1 | `setValue('cancellation_policy', value as any)` |

**Systematic issue:** Every `zodResolver(schema) as any` is the same cast. Root cause is a version skew between `@hookform/resolvers` 5.x and `react-hook-form` 7.x. `AuthModal.tsx` uses `as never` instead (inconsistent workaround). The correct fix is adding proper generic typing to the `useForm` call — e.g., `useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })` with matching schema inference.

### `as unknown as` — 29 occurrences project-wide

Heavy use in `app/api/listings/route.ts` (lines 79, 86, 140, 202, 223, 292, 299) where `ScrapedListing` from the file store has different shape than the Supabase row type. This is a symptom of the dual-persistence design, not a standalone bug, but it means TypeScript provides no type safety on those transform paths.

Notable instance in `app/api/whatsapp/webhook/route.ts` lines 333–338: `supabase.from(...).limit(20) as unknown as Promise<{ data: WaMessage[] | null }>` — a forced Promise cast that bypasses the actual Supabase query return type.

---

## React Pattern Issues

### Index keys in lists — ~45 instances in production components

Using array index as `key` prop is widespread. All instances are in skeleton/placeholder arrays or static data arrays (not sorted/filtered), so the practical impact is limited — no dynamic reordering occurs. However the pattern is inconsistent with stable-ID usage elsewhere.

Selected examples (in components, not loading placeholders):
- `components/itinerary/PlanningChatPanel.tsx:35,62,75,87,99,387,498` — chat message parts rendered with index keys
- `components/listing/ListingDetail.tsx:133,146` — features and excludes lists
- `components/listing/BookingForm.tsx:80` — star rating dots
- `components/provider/ListingWizard.tsx:250` — step indicator
- `components/listing/ReviewSection.tsx:164` — photo thumbnails

### `useEffect` with suppressed dependency warnings — 8 production suppressions

Every `eslint-disable-next-line react-hooks/exhaustive-deps` suppression is a potential stale-closure bug.

| File | Line | Risk Assessment |
|------|------|-----------------|
| `app/(admin)/admin/listings/page.tsx` | 778 | `// eslint-disable-next-line react-hooks/exhaustive-deps` on `generateMessages()` — missing `listing.id` and `tab` in deps |
| `components/itinerary/PlanningChatPanel.tsx` | 284 | `onReady` intentionally called once (ref-forwarding pattern) — documented, acceptable |
| `components/listing/ListingDetail.tsx` | 41 | `track()` called once on `listing.id` — documented with `[listing.id]`, acceptable |
| `components/listing/ListingMap.tsx` | 96 | Map init effect — explicit empty deps with stable refs, acceptable |
| `components/map/MapContainer.tsx` | 312, 403 | Two separate map init effects — both use stable refs, acceptable |
| `app/map/page.tsx` | 77 | Suppressed dep array |

### Data fetching in `useEffect` instead of Next.js data fetching

28 page components (`app/**/page.tsx`) and 26 component files use `fetch()` inside `useEffect` or callbacks. This is expected for client components that need authenticated requests (Supabase RLS) or user-specific data, but several pages that fetch public data could use server-side `fetch()` in Server Components:

- `app/(tourist)/explore/ExploreClient.tsx` — fetches `/api/listings` publicly, could be an RSC
- `components/library/TrendingSection.tsx` — fetches public trending data in `useEffect`

### Missing abort/cleanup in several async effects

`app/(tourist)/trips/page.tsx` lines 208–230: Three separate `fetch()` calls in `useEffect` with no abort controller. If the component unmounts mid-fetch, the `setState` calls will log React state-update-on-unmounted-component warnings. The pattern is safe in React 18 (no crash), but noisy.

---

## Error Handling & Boundaries

### Error boundary coverage

**Present:**
- `app/global-error.tsx` — root level (good)
- `app/(tourist)/error.tsx` — tourist route group
- `app/(tourist)/listing/[slug]/error.tsx` — listing detail
- `app/(tourist)/bookings/[id]/error.tsx` — booking detail
- `app/(tourist)/booking/confirmation/error.tsx` — confirmation
- `app/(provider)/dashboard/error.tsx` — provider dashboard
- `app/(admin)/admin/error.tsx` — admin

**Missing error.tsx:**
- `app/(auth)/` — login and register pages have no error boundary
- `app/(ruta)/` — the RUTA dispatch system has no error boundary
- `app/creator/` — creator portal has no error boundary
- `app/map/` — map page has no error boundary
- `app/plan/` — plan page has no error boundary
- `app/onboard/[slug]/` — onboarding flow has no error boundary (1,687-line wizard)

**Missing not-found.tsx:** None exist anywhere in the app. A 404 at `/listing/nonexistent` will surface the global error or a blank page.

### API routes without top-level `try/catch` — 30 of 81 routes

Routes that perform async Supabase operations with no exception handling. An unhandled Supabase client error will crash the route handler and return a 500 with no structured error body.

Most critical (handle writes or user data):
- `app/api/itineraries/route.ts` — POST creates itineraries
- `app/api/itineraries/[id]/clone/route.ts`
- `app/api/itineraries/[id]/track-referral/route.ts`
- `app/api/profile/route.ts`
- `app/api/upload/route.ts`
- `app/api/notifications/route.ts`
- `app/api/whatsapp/conversations/route.ts`
- `app/api/providers/route.ts`, `app/api/providers/[id]/route.ts`, `app/api/providers/me/route.ts`
- `app/api/listings/[id]/route.ts`, `app/api/listings/[id]/reviews/route.ts`
- `app/api/admin/bookings/route.ts`, `app/api/admin/listings/route.ts`
- `app/api/ruta/dispatch/route.ts`, `app/api/ruta/dispatch/assign/route.ts`

Note: Several of these (e.g., `providers/route.ts`) handle errors by checking `if (error) return 400/500` — this is adequate for Supabase query errors but will not catch network-level exceptions.

### `return null` on unauthenticated state — one confirmed UX bug

`app/(tourist)/trips/page.tsx:208`: when `!isAuthenticated || !user`, the effect simply returns early without setting any visual state. The page renders its skeleton briefly, then the loading state resolves and the empty-state or error message appears. This is the "blank white screen for unauthenticated users" flagged in TODOS.md (P0).

---

## Consistency Issues

### Dual `BookingStatus` type definition — P1 bug

`types/database.ts:3`:
```
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
```

`lib/bookings-store.ts:4`:
```
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'payment_submitted';
```

These two types diverge: `types/database.ts` has `'refunded'`, `lib/bookings-store.ts` has `'payment_submitted'`. Files importing from `lib/bookings-store` use the file-store type; files importing from `types/database` use the Supabase type. `app/api/stripe/checkout/route.ts` imports `BookingStatus` from `types/api.ts` (a third source). This creates silent correctness bugs: a booking status of `'payment_submitted'` is valid on the file store but not recognized by Supabase-typed components.

### Dual `ListingCard` components

`components/listing/ListingCard.tsx` — takes `Listing` from `types/database.ts` (verified bookable listings).
`components/listing/BrowseListingCard.tsx` — takes `BrowseApiListing` (scraped/admin listings with optional fields).

`ExploreClient.tsx` uses `BrowseListingCard`, while `AddStopModal.tsx`, `AIResponsePanel.tsx`, and the explore category/region pages use `ListingCard`. These are parallel implementations that diverge on features (BrowseListingCard has no rating display, no duration, no availability).

TODOS.md acknowledges this as a P1 task ("Unify ListingCard").

### Inconsistent date formatting — 3 parallel approaches

1. `date-fns` format functions (used in `components/listing/BookingForm.tsx`, `lib/utils.ts`, and ~14 other files)
2. `toLocaleDateString('en-US', {...})` (used in 30+ files across all route groups)
3. `toLocaleDateString('es-VE', {...})` (used in `app/(admin)/admin/outreach/page.tsx:240`)

No utility function exists that wraps locale-aware formatting consistently. The `lib/utils.ts` `formatDate()` function exists but is not used by most components.

### `zodResolver(schema) as any` cast — 9 identical workarounds

Every form in the codebase (9 files) casts the resolver with `as any`. One file (`AuthModal.tsx`) uses `as never`. This is a single fix: update the `useForm` generic to `useForm<z.infer<typeof schema>>()` which resolves the type mismatch without a cast.

### `require()` in ES module API routes — 4 occurrences

`app/api/bookings/route.ts:22`, `app/api/bookings/mine/route.ts:10`, `app/api/bookings/[id]/route.ts:11`, `lib/admin-store.ts:75` all use `require()` for lazy-loading JSON or CommonJS modules inside async functions. This bypasses bundler tree-shaking and uses a deprecated pattern in Next.js App Router. Should use `import()` dynamic imports or direct `fs.readFileSync`.

### Hardcoded `prov_001` provider IDs in live routes — **P0 security/auth bug**

`app/api/payouts/route.ts:21`, `app/api/provider-settings/route.ts:43,60` fall back to `'prov_001'` when no session is present. Any unauthenticated request to these endpoints gets data for provider `prov_001`. The routes have `requireAdminAuth()` guards that would block non-admin callers, but this is structural fragility: the TODO comments confirm real session derivation is not implemented.

---

## Dead Code & TODOs

### TODO/FIXME comments — 7 items

| File | Line | Issue |
|------|------|-------|
| `lib/admin-auth.ts` | 10 | `TODO: Replace with real session/JWT auth` |
| `app/api/ruta/cron/expire-zelle/route.ts` | 48 | `TODO: Send expiration notification emails` |
| `app/api/ruta/webhooks/route.ts` | 71 | `TODO: Trigger booking_confirmed notification` |
| `app/api/payouts/route.ts` | 21 | `TODO: derive from real session` |
| `app/(provider)/dashboard/payouts/page.tsx` | 37 | `TODO: replace with real provider session` |
| `app/api/provider-settings/route.ts` | 43 | `TODO: derive from real session` |
| `app/api/provider-settings/route.ts` | 60 | `TODO: derive provider_id from real session` |

All TODOs are auth-related, clustered around payouts and provider settings. They represent unfished auth wiring that is live in production routes.

### `uuid` package — partially redundant

`lib/utils.ts:4` imports `uuidv4` from `uuid`. However, `lib/bookings-store.ts:75` and `lib/payouts-store.ts` already use `crypto.randomUUID()`. The `uuid` package is still required for `jest.config.ts` moduleNameMapper to mock it in tests. This is fine but the `generateId()` function in `lib/utils.ts` could use `crypto.randomUUID()` to match the rest of the codebase.

### No commented-out code blocks found (positive finding)

Grep found no large blocks of commented-out code across components or API routes.

---

## Dependency Issues

### `shadcn` as a runtime dependency

`package.json:41`: `"shadcn": "^4.1.1"` is listed as a production dependency. `shadcn` is a CLI tool — it should be in `devDependencies`. This inflates the production bundle unnecessarily.

### `uuid` vs `crypto.randomUUID()`

`uuid` package (`^13.0.0`) is a dependency when Node.js 20+ and all modern browsers provide `crypto.randomUUID()` natively. The package is used in one place (`lib/utils.ts generateId()`). The test mock at `__tests__/mocks/uuid.ts` also points to it. Migrating `generateId()` to `crypto.randomUUID()` would allow removing the package, but given the test mock complexity, this is low priority.

### `@types/uuid` version mismatch

`devDependencies` has `"@types/uuid": "^10.0.0"` but the runtime package is `"uuid": "^13.0.0"`. Version 13 has breaking changes from v10. This can cause TypeScript errors on v4/v5/v7-specific APIs.

### `@base-ui/react` alongside Radix UI

Both `@base-ui/react` (`^1.3.0`) and Radix UI components (via `shadcn`) are present. `@base-ui` is Base UI (the successor to Radix UI primitives), while shadcn components depend on Radix primitives directly. This means two overlapping headless UI systems are bundled. Only a few components use `@base-ui` directly — this should be audited and consolidated.

### `isomorphic-dompurify` — single-use package

`isomorphic-dompurify` appears to be used only for one sanitization pass. `DOMPurify` (browser-only) + a server-side check could replace it with less overhead.

### No duplicate HTTP clients (positive finding)

No `axios` is present; all fetch calls use the native `fetch()` API consistently.

---

## Form & Validation

### `zodResolver(schema) as any` — 9 files, all forms

All `useForm()` calls in the codebase cast `zodResolver` with `as any` or `as never`. This means TypeScript does not check that the form field names match the schema keys. A field name typo in `register('email_typo')` would be silently accepted.

Affected files:
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/provider-register/page.tsx`
- `app/(provider)/dashboard/listings/[id]/edit/page.tsx`
- `app/(provider)/dashboard/listings/new/page.tsx`
- `app/(provider)/dashboard/settings/page.tsx`
- `components/provider/ListingWizard.tsx`
- `components/admin/AdminSafetyZoneForm.tsx`
- `components/listing/ReviewSection.tsx`
- `components/common/AuthModal.tsx` (uses `as never`)

### Missing validation on server-side API routes

`app/api/provider-settings/route.ts` POST handler: `body as unknown as Record<string, unknown>` with no Zod parse. Any field can be injected. Compare to `app/api/payouts/route.ts` which correctly uses `createPayoutSchema.safeParse(body)`.

`app/api/onboard/[slug]/route.ts:41`: `const body = await req.json() as unknown as Record<string, unknown>` — no Zod validation on onboarding session creation.

### Error message consistency

Zod validation errors are surfaced through React Hook Form's `errors` object and rendered in custom form components. No systematic global error formatting was found — error messages come directly from Zod schema `.message()` strings, which are written in English throughout.

---

## Large/Complex Components

Files over 300 lines. All are "client" pages with embedded sub-components, no server-side splits.

| File | Lines | Issues |
|------|-------|--------|
| `app/(admin)/admin/listings/page.tsx` | **1,871** | God component: search, pagination, bulk edit, AI outreach, inline editing, CSV export all in one file. Contains 3+ sub-components (OutreachModal, BulkPreviewModal, etc.) defined locally. |
| `app/onboard/[slug]/OnboardingWizard.tsx` | **1,687** | 5-step wizard with validation, image upload, AI description generation, step state. No error boundary on this route. |
| `lib/ruta/i18n.tsx` | **1,214** | 743 lines of i18n strings + JSX component. Should be split into a JSON file + thin component. |
| `components/whatsapp/AiSettingsPanel.tsx` | **1,146** | AI brain settings with 6 sections (amenities, FAQ, pricing rules, policies, room types, languages). |
| `components/admin/DiscoverManager.tsx` | **1,075** | Full CMS for Discover collections — draggable reorder, AI content generation, photo import. |
| `app/(provider)/dashboard/messages/brain/page.tsx` | **1,008** | Brain settings page duplicates the AiSettingsPanel functionality inline. |
| `components/provider/ListingWizard.tsx` | **882** | Multi-step listing wizard. Acceptable for a wizard pattern. |
| `app/(provider)/dashboard/messages/page.tsx` | **809** | Real-time chat UI — conversation list, message thread, AI toggle, booking stage tracker all in one file. |
| `app/(admin)/admin/providers/page.tsx` | **802** | Provider pipeline manager — kanban columns, modals, notes, bulk ops. |
| `app/(provider)/dashboard/calendar/page.tsx` | **749** | Availability calendar with block/unblock, room type filtering, iCal import. |
| `components/listing/BookingForm.tsx` | **685** | Booking form — date selection, pricing, payment methods, discount codes. |
| `components/ruta/BookingForm.tsx` | **641** | Separate BookingForm for RUTA (transport) — near-duplicate of the listing version. |
| `app/(admin)/admin/outreach/page.tsx` | **569** | Outreach manager — record table, filtering, tagging, bulk messaging. |
| `app/(tourist)/discover/DiscoverGrid.tsx` | **436** | Discover grid — photo modal integration, instagram-style feed. |
| `app/creator/(portal)/itineraries/review/[draftId]/page.tsx` | **448** | Creator review workflow. |
| `app/(provider)/dashboard/pms/reservations/new/page.tsx` | **451** | PMS reservation creation form. |
| `components/itinerary/PlanningChatPanel.tsx` | **571** | SSE streaming chat. Well-structured but handles too many concerns (abort, streaming, day-plan extraction, itinerary acceptance). |
| `components/map/MapContainer.tsx` | **524** | Mapbox init, dark mode, pins, layers, clustering. |
| `components/listing/AvailabilityCalendar.tsx` | **477** | Calendar UI with availability fetching. |
| `app/api/listings/route.ts` | **352** | API route with dual-store logic — Supabase path + file-store fallback with separate mapping functions. |
| `app/api/whatsapp/webhook/route.ts` | **430** | Webhook handler — signature verification, conversation routing, AI generation, database writes. |

---

## Priority Issues

### P0 — Bugs that will cause runtime failures or security issues

**P0-1: Hardcoded `prov_001` fallback in live API routes**
- `app/api/payouts/route.ts:21` — GET returns prov_001's payouts for any request without a provider_id query param
- `app/api/provider-settings/route.ts:43,60` — GET and POST default to prov_001 provider if param missing
- `app/(provider)/dashboard/payouts/page.tsx:38` — UI hardcodes `PROVIDER_ID = 'prov_001'`
- Impact: Any provider can read/write another provider's settings by omitting the provider_id param. The routes are behind `requireAdminAuth()` which blocks anonymous calls, but any admin token holder (including the provider UI) gets prov_001's data by default.

**P0-2: Dual `BookingStatus` type — `'payment_submitted'` vs `'refunded'`**
- `types/database.ts:3` has `'refunded'`, `lib/bookings-store.ts:4` has `'payment_submitted'`
- The Stripe webhook at `app/api/stripe/webhooks/route.ts:94` uses `'cancelled'` when it could mean `'payment_submitted'` in the file store
- Any component that uses `BookingStatus` from one source and receives data from the other is silently broken

**P0-3: `app/api/whatsapp/webhook/route.ts:333` — forced Promise cast bypasses Supabase error handling**
```ts
.limit(20) as unknown as Promise<{ data: WaMessage[] | null }>
```
This cast makes TypeScript think the Supabase query returns a plain Promise. The actual return is `{ data, error, status, ... }`. If the Supabase query errors, `error` is silently ignored; `history` is treated as `null` rather than triggering any error path.

### P1 — High impact on correctness or maintainability

**P1-1: `zodResolver(schema) as any` in all 9 form files**
TypeScript cannot check that form field names match schema keys. A single fix (`useForm<z.infer<typeof schema>>()`) in all 9 files resolves this.

**P1-2: 30 API routes with no top-level `try/catch`**
Unhandled exceptions in `app/api/providers/route.ts`, `app/api/listings/[id]/route.ts`, `app/api/upload/route.ts`, `app/api/notifications/route.ts`, and others will cause unstructured 500 errors in production. Most at-risk: write routes (`profile`, `notifications`, `upload`).

**P1-3: Missing `not-found.tsx` in entire app**
No 404 page exists anywhere. Invalid slugs/IDs fall through to global-error.tsx or blank renders.

**P1-4: No error boundary on OnboardingWizard (1,687-line component)**
`app/onboard/[slug]/` has no `error.tsx`. A runtime error in any wizard step surfaces as a global error reset, losing all wizard progress.

**P1-5: Server-side validation missing on two write routes**
- `app/api/provider-settings/route.ts` POST: no Zod validation, raw body cast
- `app/api/onboard/[slug]/route.ts`: no Zod validation, raw body cast
Any field can be written to the JSON stores without validation.

**P1-6: `require()` dynamic imports in App Router API routes**
`app/api/bookings/route.ts:22`, `mine/route.ts:10`, `[id]/route.ts:11` all use CommonJS `require()` inside async functions in ES module routes. This blocks static analysis and bundler optimization.

**P1-7: `shadcn` in production dependencies**
`package.json` lists `"shadcn": "^4.1.1"` as a runtime dependency. This CLI tool should be in `devDependencies`.

### P2 — Technical debt

**P2-1: `lib/ruta/i18n.tsx` (1,214 lines) — string literals in TypeScript**
743 lines of i18n strings hardcoded in TS. Should be JSON files.

**P2-2: Two `ListingCard` components diverging**
`ListingCard.tsx` (Supabase listings) and `BrowseListingCard.tsx` (scraped/admin listings) have different interfaces, different feature sets, and different styling. TODOS.md P1 tracks this.

**P2-3: Inconsistent date formatting — 3 patterns**
`date-fns format()`, `toLocaleDateString('en-US')`, and `toLocaleDateString('es-VE')` used in parallel. `lib/utils.ts formatDate()` exists but is underused (~14 files import it vs 30+ using raw `toLocaleDateString`).

**P2-4: `as unknown as` in 17 API route locations**
Concentrated in `app/api/listings/route.ts` (7 occurrences) where the dual-store mapping functions lack proper typing. The fix is to define explicit return types for `mapSupabaseToApiListing` and `mapLocalToApiListing`.

**P2-5: `lib/admin-auth.ts` TODO — placeholder auth**
The comment on line 10 says "Replace with real session/JWT auth". The current implementation checks a SHA-256 hash stored in `ADMIN_PASSWORD` env var — functional but not tied to Supabase auth sessions. This is the auth mechanism for all admin API routes.

**P2-6: Index keys in 7 real component lists (not skeletons)**
`PlanningChatPanel.tsx`, `ListingDetail.tsx`, `ReviewSection.tsx`, `BookingForm.tsx`, `ListingWizard.tsx` all use index keys on non-reorderable arrays. Low risk but bad practice.

**P2-7: `@base-ui/react` and Radix UI coexist**
Two overlapping headless UI systems. Consolidate to one.

**P2-8: `@types/uuid` v10 with `uuid` v13**
Type definitions are three major versions behind the runtime package.

### P3 — Low priority / nice to have

**P3-1: `generateId()` in `lib/utils.ts` wraps `uuidv4` — use `crypto.randomUUID()` instead**
Matches usage in `lib/bookings-store.ts` and `lib/payouts-store.ts`.

**P3-2: `window.location` used in 9 page files**
`useRouter().push()` is the App Router pattern. Direct `window.location` mutations bypass Next.js routing and break the back button in some cases.

**P3-3: Missing `not-found.tsx` and error boundaries for `app/(auth)/`, `app/(ruta)/`, `app/creator/`, `app/map/`, `app/plan/`**

**P3-4: `console.log`/`console.error` in 24 API route files and 6 component files**
Server-side `console.error` is acceptable for debugging, but should be replaced with a structured logger in production. Client-side `console.log` in `components/map/MapContainer.tsx:3` and `components/itinerary/PlanningChatPanel.tsx:1` should be removed.

**P3-5: Data fetching pattern inconsistency**
Public-data pages (`ExploreClient.tsx`, `TrendingSection.tsx`) use `useEffect + fetch` where Next.js Server Components + `fetch()` with caching would be more performant and avoid loading states.

---

## Summary Counts

| Category | Count |
|----------|-------|
| `: any` in production code | 5 |
| `as any` in production code | 13 |
| `as unknown as` in production code | 22 |
| API routes without try/catch | 30 / 81 |
| eslint-disable suppressions | 28 |
| TODO/FIXME comments | 7 |
| Components over 300 lines | 20+ |
| Components over 1,000 lines | 4 |
| Duplicate type definitions | 1 (BookingStatus) |
| Hardcoded prov_001 in production routes | 3 |
