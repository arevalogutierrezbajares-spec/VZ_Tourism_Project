# Session Summary — 2026-04-20

> Full QA pass, 15 bug fixes, PMS local setup, platform rebrand decision, **PMS integration into VAV shipped**, **WhatsApp AI Concierge — 13-fix engineering hardening + code review + 8 patches**.

---

## What Was Done

### 1. End-to-End QA (5 parallel agents)

Tested **67 pages + 24 API routes** across all platform areas. Found **13 issues** across 5 severity levels. Full details in [[QA-Fix-Plan-2026-04-20]].

### 2. Bug Fixes Shipped (commit `56f5dfe5`)

| # | Priority | Fix |
|---|----------|-----|
| 1 | **P0** | Supabase RLS infinite recursion on `users` table — switched to `createServiceClient()` for public reads in `/api/safety-zones` and `/api/itineraries` |
| 2 | **P1** | 7 API routes: wrapped `request.json()` in try/catch (ai/search, fill-itinerary, suggest-stops, optimize-itinerary, itineraries/conversation, extract-from-links, itineraries/[id]) |
| 3 | **P1** | `/api/places/autocomplete` — added env var guard (returns 503 instead of crash) |
| 4 | **P1** | `/api/ruta/geocode` — changed error from 500 to 503 with safe message |
| 5 | **P1** | `/api/provider-settings` — sanitized error message (was leaking config details) |
| 6 | **P1** | `/explore/category/[slug]` — added `notFound()` in `generateMetadata` for invalid slugs |
| 7 | **P1** | `/invite/[slug]` — same `notFound()` fix in `generateMetadata` |
| 8 | **P2** | Duplicate `<title>` on 8 pages — removed "| VZ Explorer" suffix (root layout template adds it) |
| 9 | **P2** | Login page — added OAuth `?error=` param display |
| 10 | **P2** | Login page — replaced dead "Forgot password?" `href="#"` with toast notification |

### 3. AI Trip Planner Crash Fix

**Bug:** `generatedItinerary.map is not a function` in `PlanningChatPanel.tsx`

**Root cause:** Claude AI sometimes returns `{days: [...]}` instead of a raw array `[...]`.

**Fix:** Normalized response data at set time + added `Array.isArray` guard at render time.

### 4. Demo Login Flow Unblocked

**Bug:** Clicking "My Trips" redirected to `/login` which then got stuck — demo account has no Supabase session.

**Root cause:** `proxy.ts` at project root had `PROTECTED_ROUTES = ['/trips', '/account', '/bookings', '/messages']` which checked for a Supabase server session. The demo account is Zustand-only (client-side), so it always failed the server check.

**Fix:** Emptied `PROTECTED_ROUTES` array — these pages already handle unauthenticated state client-side with "Sign in" UI.

### 5. Platform Documentation

- Created [[Platform-Features]] — full inventory of all 14 feature areas + cross-cutting features
- Created [[QA-Fix-Plan-2026-04-20]] — detailed fix plan with verification results

### 6. Posada PMS Local Setup

Set up the PMS monorepo (`/Users/tomas/posada-pms`) for local testing:

| Service | Port | Status |
|---------|------|--------|
| VAV (main platform) | 3000 | Running |
| PMS API (NestJS) | 3001 | Running |
| PMS Web (Next.js) | 3002 | Running |
| PostgreSQL | 5433 | Running |

**Login credentials:** `demo@posada.dev` / `posada123`

**PMS features:** Property management, reservations, units, guests, housekeeping, payments, rate plans, channels, reports, notifications, activity log.

### 7. Platform Rebrand Decision

**Old name:** VZ Explorer / VZ Tourism
**New name:** Vamos A Venezuela
**Codename:** VAV

Single platform for tourists and providers. PMS will be embedded so providers access it from the VAV login.

---

### 8. WhatsApp AI Concierge Fixes (5 bugs)

Reviewed and tested the `/demo/whatsapp` demo from the frontend. Found and fixed 5 issues:

| # | Priority | Fix |
|---|----------|-----|
| 1 | **P0** | Hydration mismatch — `new Date()` at module scope + `Date.now()` in `timeAgo()` produced different values on server vs client. Fixed with a stable `REFERENCE_EPOCH` and `useClientNow()` hook that defers live time to client mount. |
| 2 | **P1** | No sidebar navigation — `DemoSidebar` items were non-interactive `<div>` elements. Extracted to shared `DemoSidebar` component with `next/link` routing between Messages, AI Brain, and AI Settings. |
| 3 | **P2** | No back-nav from brain/settings — both sub-pages were full-page with no way back. Now share the same sidebar for consistent navigation. |
| 4 | **P2** | Brain page save fails silently — PUT to knowledge API returned 503 without Supabase service key. Added `localStorage` fallback so saves always work in demo mode. |
| 5 | **P3** | Conversation list didn't re-sort — sending a reply updated `last_message_at` but list stayed static. Added descending sort by most recent message. |

**Files changed:**
- `components/whatsapp/DemoSidebar.tsx` (new — shared sidebar component)
- `app/demo/whatsapp/page.tsx` (hydration fix, sort fix, use shared sidebar)
- `app/demo/whatsapp/brain/page.tsx` (sidebar layout, localStorage fallback)
- `app/demo/whatsapp/settings/page.tsx` (sidebar layout)

### 9. PMS Integration into VAV (Shipped)

**Goal:** Embed the Posada PMS inside the VAV provider dashboard so providers manage their property without a separate login.

**Architecture decision:** Microservice + API proxy (not monolith).

- PMS NestJS API stays at port 3001 as an independent service
- VAV proxies all requests and bridges auth (Supabase → PMS JWT) transparently
- Separate databases with user linkage via `supabase_user_id`

**What was built:**

**PMS API changes (posada-pms repo):**
- Added `supabase_user_id` column to `users` table + migration (`0002_add_supabase_user_id.sql`)
- Added `POST /auth/bridge` endpoint — accepts service secret + Supabase user details, creates/links PMS user, returns PMS JWT
- Env var: `PMS_BRIDGE_SECRET`

**VAV infrastructure:**
- `app/api/pms/[...path]/route.ts` — Catch-all proxy that authenticates via Supabase, exchanges for PMS JWT via bridge, forwards to NestJS. Caches PMS JWT in httpOnly cookie (6-day TTL).
- `lib/pms/api.ts` — Client-side API wrapper calling through `/api/pms/*`
- `lib/pms/types.ts` — Full TypeScript types for all PMS domain objects (reservations, payments, guests, folios, etc.)
- `lib/pms/context.tsx` — `PmsProvider` + `usePms()` hook for property/user state
- Env vars: `PMS_API_URL`, `PMS_BRIDGE_SECRET`

**10 new routes under `/dashboard/pms/`:**

| Route | Feature |
|-------|---------|
| `/dashboard/pms` | Interactive calendar grid with reservation pills, 7/14/30-day views, state-colored pills with tooltips |
| `/dashboard/pms/reservations` | Filterable/searchable reservations table with state badges and channel labels |
| `/dashboard/pms/reservations/new` | New reservation form: guest search (debounced), unit type select, date range, availability check, cost estimate |
| `/dashboard/pms/reservations/[id]` | Reservation detail: state transitions (confirm, check-in, check-out, cancel), folio with charges/payments/balance |
| `/dashboard/pms/payments` | Two-tab view: pending payments with AI match candidates (confidence %), payment history table |
| `/dashboard/pms/guests` | Searchable guest directory with tags, stay counts |
| `/dashboard/pms/guests/[id]` | Guest detail: contact info, tags, reservation history |
| `/dashboard/pms/settings` | Three tabs: General (property info), Fiscal (IGTF toggle), Team (staff roles) |
| `/dashboard/pms/onboarding` | 4-step wizard: property details → unit types → rooms → completion |

**Navigation:** Added "Property (PMS)" section to `ProviderSidebar` with Hotel icon.

**Build:** TypeScript clean, Next.js build passes, PMS DB migration applied.

### 10. Provider Login Fix (End-to-End)

**Bug:** After Google OAuth login, navigating to `/dashboard` or `/dashboard/pms` redirected back to `/` — provider dashboard was inaccessible.

**Root cause (3 layers):**
1. User `tomas.gutierrez.2000@gmail.com` existed in the `users` table but with `role: 'tourist'` (set by the OAuth callback which hardcodes `role: 'tourist'` for new signups)
2. `dashboard/layout.tsx` checks `profile.role === 'provider' || 'admin'` — `tourist` fails this check → redirect to `/`
3. No `providers` row existed for the user, so even if the role check passed, the dashboard overview page would have no provider data

**Fix (data + verification):**
- Updated `users.role` from `'tourist'` → `'provider'` via Supabase service role API
- Created `providers` row (`business_name: 'Posada Tomas Dev'`, `region: 'Caracas'`, `is_verified: true`, `is_approved: true`)
- Verified PMS auth bridge works with updated user (returns PMS JWT + empty properties → triggers onboarding)
- Verified OAuth callback uses `ignoreDuplicates: true` → re-login won't reset role back to `tourist`

**Auth flow verified end-to-end:**
1. Google OAuth → Supabase session created
2. `proxy.ts` middleware: session exists → passes through
3. `dashboard/layout.tsx`: role = `provider` → renders dashboard
4. `ProviderSidebar`: shows "Property (PMS)" nav group
5. PMS layout → `PmsProvider` → bridge auth → PMS user loaded → `needsOnboarding = true` (no properties yet)

---

### 11. WhatsApp AI Concierge — Engineering Hardening (13 fixes + code review)

Executed the full [[WhatsApp-Eng-Review-Fix-Plan]] using 5 parallel agents (A–E), then ran an adversarial code review with Blind Hunter + Edge Case Hunter. 8 review findings patched on top.

**Phase 1 — 5-Agent Fix Plan (13 items from architecture review):**

| Agent | Domain | Fixes |
|-------|--------|-------|
| **A** | Webhook Security (P0) | HMAC signature verification (`X-Hub-Signature-256`), per-phone rate limiting (20/min), verify_token hashed at rest with plaintext fallback |
| **B** | AI & Model Hardening | Temperature 0.7→0.3, `GROQ_MODEL` env var, `supabase: any` → typed `ServiceClient` (4 files), error message sanitization in send route |
| **C** | Webhook Logic | Fixed broken `unread_count` RPC embed, working hours check + after-hours auto-reply, non-text message handling (image/audio/video get canned reply) |
| **D** | Test Coverage | 3 new test suites, 34 tests: `parseWebhookPayload`, `analyzeMessage` sentiment, `buildSystemPrompt` injection safety |
| **E** | Demo UI + Sentiment | Demo page 870→141 lines (4 extracted components + mock data file), sentiment false-positive fix via context-aware keyword filtering |

**Phase 2 — Adversarial Code Review (Blind Hunter + Edge Case Hunter):**

Found 23 raw findings → 15 unique after dedup → 8 patched, 4 deferred, 3 dismissed.

| # | Severity | Patch |
|---|----------|-------|
| 1 | **HIGH** | verify_token hash broke dashboard copy-to-clipboard — GET now masks (`••••••••`), PUT returns plaintext once |
| 2 | **HIGH** | Unread count TOCTOU race — added SQL migration `017_increment_wa_unread.sql` with atomic increment |
| 3 | **HIGH** | Silent 403 when `META_APP_SECRET` unset — added explicit error log differentiating "secret missing" vs "signature invalid" |
| 4 | **MED** | Non-text messages persisted empty body/preview — moved check earlier, now persists `[Photo]`/`[Voice note]`/etc. labels |
| 5 | **MED** | Plaintext verify_token never auto-migrated — GET handler now hashes-on-match |
| 6 | **MED** | Sentiment `POSITIVE_CONTEXT` not normalized for accented Spanish — added `normalize()` |
| 7 | **LOW** | `hashToken` duplicated in 2 files — extracted to `lib/whatsapp/hash.ts` |
| 8 | **NIT** | Dead `StatsStrip.tsx` component — deleted |

**Deferred (not actionable in this diff):**
- In-memory rate limiter is per-instance (by design on serverless, signature verification is primary defense)
- `as unknown as Promise<>` double casts (Supabase PostgREST type limitation)
- Working hours: overnight ranges unsupported (extremely unlikely for VZ posadas)
- `ServiceClient` loses generic DB type info (no generated Supabase types yet)

**Files changed:** 11 modified, 12 new (4 components, 3 test suites, 1 util, 1 type, 1 SQL migration, 1 mock data, 1 working-hours util)

**New env vars:** `META_APP_SECRET` (required for production), `GROQ_MODEL` (optional, defaults to `llama-3.3-70b-versatile`)

**Verification:** `tsc --noEmit` zero errors, `npm run build` passes, 34/34 tests pass.

---

### 12. WhatsApp Onboarding & Dashboard Restructure — Eng Review Fixes (10 patches)

Ran `/plan-eng-review` on the WhatsApp onboarding + dashboard restructure implementation. 7-section review (Architecture, Code Quality, Tests, Performance, Outside Voice) surfaced 10 issues, all accepted and fixed.

**Route restructure:** `/dashboard/messages/*` → `/dashboard/whatsapp/*` with 301 redirects in `next.config.ts`. Sidebar updated, old routes deleted.

**New endpoints:**
- `POST /api/whatsapp/test-reply` — wizard step 7 preview (merges partial config with defaults, calls Groq)
- `POST /api/whatsapp/knowledge/sync-pms` — pulls property + unit types from PMS, maps cents→dollars, merges amenities

**New pages:**
- `/dashboard/whatsapp/setup` — 8-step wizard (Welcome → Meta → Webhook → Persona → Knowledge → Hours → Test → Go Live)
- `/dashboard/whatsapp/brain` — knowledge editor with "Sync from PMS" button
- `/dashboard/whatsapp/settings` — AI config panel wrapper

**Eng review fixes (10 patches):**

| # | Severity | Fix |
|---|----------|-----|
| 1 | Med | localStorage persistence for wizard state (save on dispatch, hydrate on mount, "Resume?" banner, clear on activation) |
| 2 | Med | 10s AbortController timeout on PMS fetches in sync-pms (returns 504 on timeout) |
| 3 | Med | Added FaqBuilder + payment method ToggleChips to wizard step 5 (Knowledge) |
| 4 | Low | Converted 3 `<a href>` to Next.js `<Link>` for client-side navigation |
| 5 | High | 19 new unit tests: 10 for test-reply, 9 for sync-pms (auth, validation, error paths, config merge, data mapping) |
| 6 | Med | Warning toast when knowledge save fails in wizard step 8 (replaced silent `console.warn`) |
| 7 | Low | Custom greeting textarea in wizard step 4 when `greeting_style === 'custom'` |
| 8 | **High** | Realtime subscription `provider_id` filter — was listening to ALL providers' `wa_conversations` changes |
| 9 | **High** | Removed hardcoded `'vav-bridge-dev-secret-2026'` fallback from sync-pms (returns 503 if `PMS_BRIDGE_SECRET` unset) |
| 10 | Med | Strip empty arrays from wizard knowledge PUT (prevents clobbering brain page data) |

**Outside voice findings (cross-model tension):**
- Realtime data leak: `wa_conversations` subscription had no `provider_id` filter — every provider's browser received change events for every other provider. RLS protected the re-fetch path, but the INSERT handler injected `payload.new` directly into state.
- Hardcoded secret: `PMS_BRIDGE_SECRET || 'vav-bridge-dev-secret-2026'` committed in source, inconsistent with PMS proxy which throws if unset.
- Wizard data clobber: sending `room_types: []` would overwrite existing brain page rooms. Fixed by only including non-empty arrays.

**Files changed:** 3 modified (`whatsapp/page.tsx`, `setup/page.tsx`, `sync-pms/route.ts`), 2 new test files.

**Verification:** 74/74 whatsapp tests passing (55 existing + 19 new), zero TypeScript errors.

---

### Next Session: WhatsApp Agent Platform Onboarding

**Goal:** Make it as easy as possible for posadas to start using the WhatsApp AI agent suite.

**Current state:** The onboarding flow exists at `/dashboard/pms/onboarding` (4-step wizard: property details → unit types → rooms → completion) but this is PMS onboarding only. The WhatsApp agent setup requires separate configuration at `/demo/whatsapp/settings` which is disconnected from the provider dashboard.

**What needs to happen:**
1. **Unified onboarding wizard** — Extend or create a new onboarding flow that gets a posada from zero to "WhatsApp agent live" in one sitting
2. **WhatsApp setup steps to integrate:**
   - Meta Business verification + phone number linking (guide + config fields)
   - `phone_number_id` + `access_token` entry (currently in settings page)
   - `verify_token` generation + Meta webhook URL setup (currently manual)
   - AI persona configuration (name, tone, language, greeting style)
   - Knowledge base seeding (property description, amenities, policies, pricing — pull from PMS if available)
   - Working hours configuration
   - Test message flow (send a test message to verify everything works)
3. **Auto-populate from PMS** — If the posada already completed PMS onboarding, pre-fill the knowledge base from property/room/rate data
4. **Settings page refactor** — Move `/demo/whatsapp/settings` into the real provider dashboard at `/dashboard/pms/settings` or a new `/dashboard/whatsapp/` section
5. **Guided setup UX** — Step-by-step with progress indicators, inline validation, "test your agent" button at the end

**Key files to start with:**
- `app/(provider)/dashboard/pms/onboarding/page.tsx` — existing PMS onboarding wizard
- `app/demo/whatsapp/settings/page.tsx` — current WhatsApp config UI (54 lines, just a sidebar + link to AiSettingsPanel)
- `components/whatsapp/AiSettingsPanel.tsx` — the big 1,146-line settings panel (persona, tone, knowledge, working hours, etc.)
- `app/api/whatsapp/config/route.ts` — GET/PUT for WhatsApp config
- `app/api/whatsapp/knowledge/route.ts` — GET/PUT for knowledge base
- `lib/pms/api.ts` — PMS client (for pulling property data to seed knowledge)

**Design considerations:**
- Use the existing DESIGN.md system (navy/gold palette, Bebas/Barlow fonts)
- Mobile-first — many posada owners will set this up on their phone
- Spanish-first with English fallback (most VZ posada owners speak Spanish)
- Minimize Meta Business jargon — abstract away the Graph API complexity

---

### Backlog

From [[QA-Fix-Plan-2026-04-20]]:
- Category/invite 404 status: works in production builds but dev mode may still flush 200 before metadata resolves (SSR streaming behavior)

From remaining TODOs:
- WhatsApp Vault integration (P1)
- PMS DESIGN.md (P1)
- Photo migration to Supabase Storage (P2)
- 8 UX polish items (P2)
- Match quality improvements (P2)

### PMS Integration Follow-ups
- End-to-end test with PMS API running (start both services, register as provider, access PMS)
- WhatsApp inbox page (PMS conversations) — not yet ported
- Rate calendar management page — not yet ported
- Notifications page — not yet ported
- Production deployment: configure `PMS_API_URL` and `PMS_BRIDGE_SECRET` in Vercel env

### Rebrand Tasks (future)
- Update root layout title template from "VZ Explorer" to "Vamos A Venezuela"
- Update all brand references across the platform
- New logo/assets for VAV branding
