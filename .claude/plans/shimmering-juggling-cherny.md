<!-- /autoplan restore point: /Users/tomas/.gstack/projects/tomasgutierrez2000-eng-vz-tourism-app/claude-admiring-shaw-autoplan-restore-20260408-014130.md -->

# RUTA Platform — Production Readiness Review

## Context

RUTA is an executive security transport platform for Venezuela, built as part of the vz-tourism-app Next.js application. It enables booking armored vehicle transport with armed security for high-value passengers (expats, business travelers) between airports and cities.

**Why this review:** The platform has been built feature-complete at MVP scope. Before going live with real passengers and payments, we need to confirm it handles real-world conditions: payment failures, GPS edge cases, concurrent dispatch, guest access security, and operational reliability.

## Platform Scope

### Core Features (Implemented)
- **Booking flow**: Quote calculation, Stripe/Zelle checkout, guest access tokens
- **Ride state machine**: 10 states (requested → completed/cancelled/expired) with actor-based transitions
- **Dispatch portal**: Manual driver/vehicle assignment, status management
- **Fleet management**: Drivers, vehicles, armor ratings, driver-vehicle assignments
- **GPS tracking**: Device pings, rate limiting, anomaly detection, Venezuela bbox validation
- **Payments**: Stripe checkout sessions, Zelle manual verification, refund calculation
- **Cron jobs**: Zelle payment expiration (15-min interval)

### Tech Stack
- Next.js 16.2.1 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4
- Supabase PostgreSQL with PostGIS, RLS policies
- Stripe payments + Zelle alternative
- Mapbox GL + Google Places API
- Vercel deployment

### Key Files
- `/types/ruta.ts` — Type definitions, state machine constants (273 LOC)
- `/supabase/migrations/007_ruta_schema.sql` — Database schema (361 LOC)
- `/lib/ruta/` — Utility libraries: pricing, stripe, tracker, ride-status, cancellation, auth, access-token (566 LOC)
- `/app/api/ruta/` — 12 API routes (booking, dispatch, payments, tracking, cron)
- `/app/(ruta)/` — Frontend pages (landing, dispatch, drivers, vehicles, confirmation)
- `/components/ruta/` — 6 UI components (BookingForm, LocationInput, AirportSelect, etc.)

### Known Gaps (Phase 2 / Future)
- No notification system (email/SMS/WhatsApp) — TODOs in webhooks, cron, cancel routes
- No automated dispatch (manual only)
- No ride history/analytics dashboard
- No rating/review system
- No RUTA-specific tests (Jest/Playwright configured but no test files)
- Camera feed URL field exists but unused

## Production Readiness Criteria

1. **Security**: Auth, RLS policies, input validation, token handling, role enforcement
2. **Payment reliability**: Stripe webhook handling, Zelle verification flow, refund logic, edge cases
3. **Data integrity**: State machine transitions, concurrent access, race conditions
4. **Operational**: Error handling, logging, monitoring, cron reliability
5. **Performance**: Query optimization, tracker ping volume, index coverage
6. **User experience**: Booking flow completeness, error states, loading states, responsive design
7. **Deployment**: Environment config, secrets management, Vercel config, database migrations

---

# PHASE 1: CEO REVIEW (Strategy & Scope)

**Mode: HOLD SCOPE** (auto-decided, P3: pragmatic — this is a production readiness review, not a feature expansion. The goal is to make the existing platform bulletproof.)

## Step 0A: Premise Challenge

### Premises Under Review

**P1: "Venezuela travelers need pre-booked armored transport"**
Valid. The threat environment for affluent travelers in Venezuela is real. WhatsApp-coordinated fixers are the status quo, and that's fragmented, untrustworthy, and has no audit trail. A structured platform with GPS tracking and verified vehicles is a genuine step up.

**P2: "Dual payment (Stripe + Zelle) covers the market"**
Valid and smart. Zelle is widely used in the Venezuelan diaspora. Stripe handles international cards. This covers both use cases.

**P3: "Manual dispatch is acceptable for MVP"**
Valid at low volume (< 10 rides/day). Becomes a bottleneck quickly but acceptable for launch.

**P4: "Guest checkout (no account required) is the right default"**
Valid. High-security travelers may not want to create accounts. Reducing friction is correct.

**P5 (ASSUMED): "Mapbox driving directions work reliably in Venezuela"**
QUESTIONABLE. Venezuelan road data in Mapbox is incomplete, especially secondary roads and mountain routes. The haversine fallback with 1.4x road factor (`pricing.ts:59`) could be 50-100% wrong in certain corridors, leading to severe underquoting for inter-city routes.

**P6 (ASSUMED): "`user_metadata` in Supabase JWT is a secure authorization mechanism"**
WRONG. `user_metadata` is client-writable by default in Supabase. Any authenticated user can call `supabase.auth.updateUser({ data: { ruta_role: 'ruta_admin' } })` and become an admin. The entire role system is built on this assumption. This is the most severe finding in the review.

**P7 (ASSUMED): "URL query parameters are safe for access tokens"**
WRONG for a security transport service. Access tokens in URLs leak through browser history, referrer headers, server logs, CDN logs, and analytics. `checkout/route.ts:106` puts the token in `?token=${accessToken}`.

## Step 0B: Existing Code Leverage

| Sub-problem | Existing code | Reused? |
|---|---|---|
| Auth/sessions | Supabase auth, `lib/supabase/server.ts` | Yes |
| Stripe payments | `lib/stripe/server.ts` (shared Stripe client) | Yes |
| Form validation | Zod used in tracker, not in booking | Partial |
| State machine | Custom `lib/ruta/ride-status.ts` | N/A (new) |
| Geocoding | Google Places API (shared) | Yes |
| Notifications | None exists anywhere in the app | GAP |

## Step 0C: Dream State Mapping

```
CURRENT STATE                    THIS PLAN                   12-MONTH IDEAL
─────────────────                ─────────────               ──────────────────
MVP with critical               Fix security +              B2B API, WhatsApp
security holes, no              payment bugs,               booking, automated
notifications, no               add notifications,          dispatch, driver app,
tests, broken webhook           write tests                 real-time passenger
and cron paths                                              tracking, multi-country
```

This review moves us from "demo that works on happy path" to "platform safe for real money and real passengers." The 12-month ideal is still far, but the gap is primarily features, not structural defects.

## Step 0C-bis: Implementation Alternatives

**APPROACH A: Fix Critical Bugs Only (Minimum Viable)**
- Summary: Fix the 4 critical security/payment bugs. Nothing else.
- Effort: S (human: ~1 day / CC: ~30 min)
- Risk: Low
- Pros: Fastest to production-safe state
- Cons: No notifications (passengers fly blind), no tests (regressions undetected)
- Reuses: All existing code

**APPROACH B: Fix Criticals + Add Core Safety Net (Recommended)**
- Summary: Fix 4 criticals + 5 high-severity issues + add email notifications for key events + write integration tests for payment flows
- Effort: M (human: ~3-5 days / CC: ~2-3 hours)
- Risk: Low-Med
- Pros: Actually usable by real passengers, payment flow verified by tests
- Cons: Still no driver app, no automated dispatch, no WhatsApp
- Reuses: Existing Stripe, Supabase, email via Supabase or Resend

**APPROACH C: Full Production Hardening**
- Summary: Everything in B + monitoring/alerting, rate limiting via Redis, load testing, staging environment, runbooks
- Effort: L (human: ~2 weeks / CC: ~1 day)
- Risk: Med (scope creep risk)
- Pros: Fully production-grade
- Cons: Delays launch significantly for operational infrastructure that can be added iteratively

**RECOMMENDATION:** Choose B. It's the minimum that makes the platform safe for real passengers AND real money. A is too risky (no notifications = passengers don't know their ride status). C is ideal-state work that can happen post-launch.

## Step 0E: Temporal Interrogation

```
HOUR 1 (foundations):     Move ruta_role to app_metadata. Add requireRutaRole to dispatch routes.
                          Switch webhook + cron to createServiceClient. These are one-line fixes
                          but the most consequential changes.

HOUR 2-3 (core logic):   Server-side quote re-validation at checkout. Tracker API key verification.
                          Zod validation on booking inputs. These touch the hot path.

HOUR 4-5 (integration):  Email notifications (booking confirmed, cancelled, driver assigned).
                          Stripe refund execution on cancellation. These require new integrations.

HOUR 6+ (polish/tests):  Integration tests for: checkout → webhook → confirmation flow,
                          cancellation → refund flow, dispatch assignment flow. E2E test for
                          guest booking happy path.
```

## CEO Dual Voices

### CLAUDE SUBAGENT (CEO — strategic independence)

Key findings from independent review:

1. **CRITICAL: Auth system is fundamentally broken** — `user_metadata` is client-writable. Any user can self-escalate to admin. Severity: CRITICAL.
2. **CRITICAL: Dispatch endpoints have zero authentication** — `/api/ruta/dispatch/*` routes expose all PII (names, emails, phones) with no auth check. Full data breach vector. Severity: CRITICAL.
3. **CRITICAL: Webhook uses wrong Supabase client** — `createClient()` instead of `createServiceClient()`. Stripe payments silently fail to confirm rides. Passengers pay and nothing happens. Severity: CRITICAL.
4. **CRITICAL: Cron job uses wrong Supabase client** — Same issue. Zelle rides never expire, phantom pending rides accumulate. Severity: CRITICAL.
5. **HIGH: Tracker API key never verified** — `x-tracker-key` header is read but never checked against stored hash. Any attacker can inject fake GPS pings. Severity: HIGH.
6. **HIGH: Quoted price not re-validated** — Client submits any price, server accepts it. $320 ride booked for $1. Severity: HIGH.
7. **HIGH: In-memory rate limiter useless on serverless** — Map resets on cold starts. No actual rate limiting. Severity: HIGH.
8. **HIGH: No input validation on booking data** — No email/phone format checks, no max lengths, XSS risk via address fields. Severity: HIGH.
9. **HIGH: Access token in plaintext in DB** — Should be hashed. Severity: HIGH.
10. **MEDIUM: Stripe refunds never execute** — TODO comment but no implementation. Broken promise. Severity: MEDIUM.
11. **MEDIUM: Notifications completely absent** — 3 TODO comments. Passengers get zero communication. Severity: MEDIUM.
12. **MEDIUM: Zero test coverage** — No unit, integration, or E2E tests for any RUTA code. Severity: MEDIUM.
13. **MEDIUM: Tracker partition rotation missing** — Partitions expire after 4 months, inserts will fail. Severity: MEDIUM.
14. **MEDIUM: NEXT_PUBLIC_ Mapbox token used server-side** — Token exposed to client, enables API abuse. Severity: MEDIUM.

Strategic recommendation: Platform is NOT production ready. 4 critical bugs must be fixed before any real passenger uses this. The Approach B path is correct.

### CODEX SAYS (CEO — strategy challenge)

Codex unavailable. Proceeding with single-model review, tagged [single-model].

### CEO CONSENSUS TABLE

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   2/7     N/A    2 WRONG
  2. Right problem to solve?           YES     N/A    CONFIRMED
  3. Scope calibration correct?        HOLD    N/A    HOLD SCOPE
  4. Alternatives explored?            3/3     N/A    CONFIRMED
  5. Competitive/market risks?         NOTED   N/A    CONFIRMED
  6. 6-month trajectory sound?         YES     N/A    CONFIRMED
═══════════════════════════════════════════════════════════════
Single-model review [single-model]. Codex unavailable.
```

## Review Sections 1-11

### Section 1: Architecture Review

System architecture:

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Next.js)  │
                    └──────┬──────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Frontend │    │ API Routes│    │  Cron    │
   │ /ruta/*  │    │ /api/ruta │    │ expire-  │
   │          │    │ 12 routes │    │ zelle    │
   └────┬─────┘    └─────┬────┘    └────┬─────┘
        │                │              │
        ▼                ▼              ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │ Mapbox  │    │ Supabase │    │ Stripe   │
   │ Google  │    │ Postgres │    │ Webhooks │
   │ Places  │    │ + PostGIS│    │          │
   └─────────┘    └──────────┘    └──────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ┌───────┐ ┌──────┐ ┌──────────┐
         │ Rides │ │Fleet │ │ Tracker  │
         │ RLS   │ │ RLS  │ │ Pings    │
         └───────┘ └──────┘ └──────────┘
```

**Coupling concerns:** The `createClient()` vs `createServiceClient()` usage is inconsistent across routes. Some routes that need service-level access (webhook, cron) use the wrong client. This is not a design flaw — it's a bug pattern.

**Single points of failure:** Supabase is the single datastore. No read replicas, no failover. Acceptable for MVP.

**Scaling:** Tracker pings are the first bottleneck at scale (high-frequency writes). Partitioning is correct but needs rotation. The in-memory rate limiter doesn't work on serverless.

### Section 2: Error & Rescue Map

```
METHOD/CODEPATH                | WHAT CAN GO WRONG              | RESCUED? | USER SEES
───────────────────────────────┼────────────────────────────────┼──────────┼───────────────────
POST /api/ruta/checkout        │ Stripe session create fails    │ Y (500)  │ "Internal error"
                               │ DB insert fails                │ Y (500)  │ "Failed to create"
                               │ Invalid body (missing fields)  │ Y (400)  │ Field-specific msg
                               │ Lead time too short            │ Y (400)  │ Specific msg
                               │ Price manipulated by client    │ N ← GAP  │ Silent ← BAD
POST /api/ruta/webhooks        │ Invalid Stripe signature       │ Y (400)  │ N/A (webhook)
                               │ RLS blocks DB update           │ N ← CRIT │ Silent ← CRITICAL
                               │ Ride not found                 │ Y (200)  │ Swallowed
POST /api/ruta/dispatch/assign │ No auth check                  │ N ← CRIT │ Anyone can call
                               │ Driver already assigned        │ Y (409)  │ Specific msg
                               │ Ride not confirmed             │ Y (400)  │ Specific msg
                               │ Driver status not checked      │ N ← GAP  │ Assigns offline driver
POST /api/ruta/dispatch/status │ No auth check                  │ N ← CRIT │ Anyone can call
                               │ Invalid transition             │ Y (400)  │ Specific msg
                               │ Race condition (stale read)    │ Partial  │ Atomic .eq() helps
POST /cancel                   │ Stripe refund not executed     │ N ← GAP  │ Told refund, gets none
                               │ Dev bypass in prod             │ N ← GAP  │ Auth bypassed
GET /api/ruta/cron/expire-zelle│ RLS blocks DB update           │ N ← CRIT │ Silent ← CRITICAL
                               │ Cron secret not set            │ N ← GAP  │ Open to public
POST /api/ruta/tracker/ping    │ API key not verified           │ N ← GAP  │ Fake pings accepted
                               │ Rate limiter doesn't work      │ N ← GAP  │ Flood accepted
GET /api/ruta/rides/[id]       │ Dev bypass in prod             │ N ← GAP  │ Auth bypassed
```

**CRITICAL GAPS: 4** (webhook RLS, cron RLS, dispatch no auth x2)
**HIGH GAPS: 6** (price manipulation, API key, rate limiter, refund, dev bypass, driver status)

### Section 3: Security & Threat Model

| Threat | Likelihood | Impact | Mitigated? |
|--------|-----------|--------|------------|
| User self-escalates to ruta_admin via user_metadata | HIGH | CRITICAL | NO |
| Unauthenticated dispatch access (PII exposure) | HIGH | CRITICAL | NO |
| Price manipulation at checkout | MED | HIGH | NO |
| Fake GPS pings (unverified tracker key) | MED | HIGH | NO |
| Access token leaked via URL referrer/logs | MED | HIGH | NO |
| XSS via unsanitized address/name fields | MED | MED | NO |
| Mapbox token abuse via NEXT_PUBLIC_ exposure | MED | MED | NO |
| Duplicate ride creation (no idempotency) | LOW | MED | NO |
| Dev bypass reaches production | LOW | HIGH | NO |

### Section 4: Data Flow & Interaction Edge Cases

**Booking Flow (Happy Path):**
```
User fills form → POST /checkout → Create ride (DB) → Create Stripe session → Redirect
     │                                                        │
     ▼                                                        ▼
Stripe hosted page → User pays → Stripe webhook → Update ride to confirmed
                                      │
                                      ▼ ← BROKEN (createClient, no auth)
```

**Edge cases examined:**
- Double-click submit: No idempotency → duplicate rides created
- Quote expires during checkout: No server-side revalidation → stale price accepted
- Zelle user doesn't pay: Cron expiry broken (wrong client) → rides never expire
- Cancel after Stripe payment: Refund calculated but never executed
- Guest loses access token: No recovery mechanism (no email sent with link)

### Section 5: Code Quality

- **Good:** Clean type definitions, consistent use of state machine, Zod validation on tracker input
- **Bad:** Inconsistent `createClient` vs `createServiceClient` usage — the #1 bug pattern
- **Bad:** No Zod validation on booking input (only truthy checks)
- **DRY violation:** Haversine distance calculated in both `pricing.ts:43-59` and `tracker.ts:34-43`
- **Naming:** Good overall. `RutaRideStatus`, `calculateRefund`, `isValidTransition` are clear.
- **Over-engineering:** None detected. Code is appropriately simple.
- **Under-engineering:** Input validation, auth on dispatch routes, actual refund execution

### Section 6: Test Review

```
NEW CODEPATHS:                  TEST EXISTS?   GAP?
─────────────────────────────── ────────────── ──────
Checkout → ride creation        NO             YES
Stripe webhook → confirmation   NO             YES (CRITICAL: broken path)
Zelle confirm → paid status     NO             YES
Dispatch assign → driver status NO             YES
Status transition validation    NO             YES
Cancellation → refund calc      NO             YES
Tracker ping → storage          NO             YES
Quote calculation → pricing     NO             YES
Access token generation/valid   NO             YES
Cron → Zelle expiration         NO             YES (CRITICAL: broken path)
```

**Zero test coverage across all RUTA code.** Every codepath is untested. For a platform handling real money and real passenger safety, this is a critical gap.

### Section 7: Performance

- **Indexes:** Good coverage. Composite indexes for common queries. Partial indexes for Zelle timeout and active rides per driver.
- **N+1:** Dispatch route fetches rides, drivers, vehicles in 3 separate queries (not N+1, just 3 parallel). Acceptable.
- **Tracker pings:** Partitioned by month (good). Missing rotation cron (will break after 4 months).
- **Mapbox caching:** `next: { revalidate: 86400 }` caches route results for 24h. Good.
- **Connection pool:** Service client created per-request. Supabase JS client pools internally. OK for serverless.

### Section 8: Observability

**Current state:** `console.log` and `console.error` only. No structured logging, no metrics, no traces, no alerting, no health checks.

**Critical observability gaps:**
- Webhook failures are silent (no alert when Stripe confirmation fails)
- Cron failures are silent (no alert when Zelle expiry fails)
- No way to know if tracker pings are being received
- No payment reconciliation (no way to detect Stripe payment ≠ DB status)

### Section 9: Deployment

- **Migration safety:** Schema uses `IF NOT EXISTS` and `DO $$ BEGIN...EXCEPTION` patterns. Safe for re-runs.
- **Feature flags:** None. All features are always on. Acceptable for MVP.
- **Rollback:** Git revert + migration rollback. Standard.
- **Environment:** 12 env vars required. `CRON_SECRET` may not be set (cron auth bypassed if missing).
- **Post-deploy verification:** None defined.

### Section 10: Long-Term Trajectory

- **Reversibility:** 4/5. All changes are database-backed and reversible.
- **Tech debt introduced:** Moderate. The role system needs to move to app_metadata, which requires a Supabase admin API call (not just a code change).
- **Path dependency:** The guest checkout token system is fine but will need to evolve (email-based magic links would be better long-term).
- **12-month trajectory:** Sound. The architecture supports notifications, automated dispatch, and a driver app without structural changes.

### Section 11: Design & UX Review

**Interaction state coverage:**

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Booking form | ? | N/A | ? | Redirect | ? |
| Confirmation page | ? | N/A | ? | Status shown | ? |
| Dispatch dashboard | ? | No rides msg? | ? | Table | ? |
| Driver management | ? | ? | ? | List | ? |

This needs deeper review in Phase 2 (Design).

## Failure Modes Registry

```
CODEPATH                    | FAILURE MODE              | RESCUED? | TEST? | USER SEES?  | LOGGED?
────────────────────────────┼───────────────────────────┼──────────┼───────┼─────────────┼────────
Stripe webhook confirmation | RLS blocks update         | NO       | NO    | Silent      | NO
Zelle expiry cron           | RLS blocks update         | NO       | NO    | Silent      | NO
Dispatch endpoints          | No auth                   | NO       | NO    | PII exposed | NO
Role escalation             | Client-writable metadata  | NO       | NO    | Full access | NO
Checkout price              | Client-submitted price    | NO       | NO    | Silent      | NO
Tracker API key             | Never verified            | NO       | NO    | Fake pings  | NO
Cancel refund               | Stripe refund not called  | NO       | NO    | Told refund | NO
Rate limiter                | Serverless resets memory  | NO       | NO    | Flood       | NO
Partition rotation          | No cron to create new     | NO       | NO    | Insert fail | YES
```

**9 CRITICAL GAPS** — rows where RESCUED=NO, TEST=NO, and failure is silent.

## NOT in scope (deferred)

1. **Automated dispatch algorithm** — Manual assignment is fine for MVP
2. **Driver mobile app** — Dispatchers manage status; drivers don't need an app yet
3. **WhatsApp integration** — Would be ideal but adds significant scope
4. **Rating/review system** — Fields exist in DB, implement post-launch
5. **Camera feed integration** — Phase 2
6. **Multi-country expansion** — Architecture supports it, but not now
7. **B2B API / corporate travel integration** — Valid 10x play, but not MVP scope

## What already exists

- Supabase auth system (reuse for role management)
- Stripe integration (`lib/stripe/server.ts`)
- Google Places API integration (shared)
- State machine implementation (well-designed, reusable)
- Database schema with proper indexes and RLS (needs fixes, not rebuild)

## Dream state delta

This review, if acted on, closes the gap from "demo" to "MVP safe for real use." The remaining gap to 12-month ideal is features (notifications, automation, driver app), not structural defects.

## CEO Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | 4 critical bugs, 5 high, 4 medium           |
| Step 0               | HOLD + Approach B recommended               |
| Section 1  (Arch)    | Architecture sound, client usage bug pattern |
| Section 2  (Errors)  | 10 error paths mapped, 10 GAPS (4 critical) |
| Section 3  (Security)| 9 threats found, 9 unmitigated              |
| Section 4  (Data/UX) | 5 edge cases, 5 unhandled                   |
| Section 5  (Quality) | 3 issues (inconsistent client, no validation)|
| Section 6  (Tests)   | Diagram produced, 10 gaps (all untested)     |
| Section 7  (Perf)    | 1 issue (partition rotation)                 |
| Section 8  (Observ)  | 4 gaps (zero observability)                  |
| Section 9  (Deploy)  | 1 risk (CRON_SECRET may be unset)            |
| Section 10 (Future)  | Reversibility: 4/5, trajectory sound         |
| Section 11 (Design)  | Deferred to Phase 2                         |
+--------------------------------------------------------------------+
| NOT in scope         | written (7 items)                           |
| What already exists  | written                                     |
| Dream state delta    | written                                     |
| Error/rescue registry| 10 methods, 4 CRITICAL GAPS                 |
| Failure modes        | 9 total, 9 CRITICAL GAPS                    |
| TODOS.md updates     | deferred to Phase 4                         |
| Outside voice        | subagent-only (Codex unavailable)            |
| Diagrams produced    | 3 (architecture, data flow, booking flow)    |
+====================================================================+
```

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Mode: HOLD SCOPE | Mechanical | P3 Pragmatic | Production readiness review, not feature expansion | EXPANSION, SELECTIVE, REDUCTION |
| 2 | CEO | Approach B (criticals + safety net) | Mechanical | P1 Completeness | A is too risky (no notifications), C delays launch | A (too minimal), C (too broad) |
| 3 | CEO | Skip /office-hours prerequisite | Mechanical | P6 Action | Thorough codebase understanding already achieved | Running /office-hours |
| 4 | CEO | No design doc needed | Mechanical | P6 Action | Review is code-level, not feature design | Running /office-hours |
| 5 | CEO | Skip Codex (unavailable) | Mechanical | N/A | `which codex` returned not found | N/A |

---

# PHASE 2: DESIGN REVIEW (UI/UX)

## Design Scope Assessment

Initial design completeness: **3/10**. The landing page looks polished but the booking flow is non-functional and the dispatch UX uses `alert()` for errors.

## Design Dual Voices

### CLAUDE SUBAGENT (design — independent review)

7 findings, 2 critical:

1. **CRITICAL: "Book Now" button has no onClick handler** — `BookingForm.tsx:409-414`. Dead button. The entire conversion funnel terminates at the moment of highest user intent. No checkout initiation, no passenger detail collection, no payment method selection.

2. **CRITICAL: No passenger detail collection anywhere in the booking flow** — The checkout API requires name, email, phone. No UI exists to collect these. An implementer would need to invent this screen from scratch.

3. **HIGH: Confirmation page promises things that don't exist** — `confirmation/page.tsx:170-176` says "driver details via email and WhatsApp, 24-hour reminder, 2-hour tracking link." None of this is implemented. Trust-destroying lies on the trust-critical page.

4. **HIGH: Dispatch auth is client-side only** — `dispatch/layout.tsx:24` checks `user_metadata` client-side with dev bypass. Cosmetic security that creates false sense of safety.

5. **MEDIUM: Dispatch error state shows "No rides" instead of error** — Failed API fetches show the empty state, not an error. Dispatcher thinks no rides exist when actually the API is down.

6. **MEDIUM: Booking form buried on mobile** — Hero section is `min-h-screen`, form drops below 2-3 screen scrolls on mobile. No sticky CTA to scroll to form.

7. **MEDIUM: Quote expiration not enforced client-side** — Shows "Valid for 15 min" but no countdown, no button disable, no re-quote prompt.

### CODEX SAYS (design — UX challenge)

Codex unavailable [single-model].

### DESIGN LITMUS SCORECARD

```
DESIGN DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Info hierarchy serves user?       5/10    N/A    NEEDS WORK
  2. Interaction states specified?     3/10    N/A    INCOMPLETE
  3. Responsive strategy intentional?  6/10    N/A    ACCEPTABLE
  4. Accessibility requirements met?   2/10    N/A    POOR
  5. Specific UI vs generic patterns?  4/10    N/A    TOO GENERIC
  6. Booking funnel complete?          1/10    N/A    BROKEN
  7. Emotional arc coherent?           3/10    N/A    BREAKS AT CHECKOUT
═══════════════════════════════════════════════════════════════
```

## Design Passes 1-7 Summary

### Pass 1: Information Hierarchy (5/10)
Landing page hierarchy is correct: hero → trust badges → services → security. But the booking form (the primary CTA) is buried below fold on mobile. Dispatch dashboard has correct split layout but lacks visual priority for urgent rides.

### Pass 2: Interaction States (3/10)
- Loading: text-only ("Loading rides..."), no spinners
- Empty: present and reasonable
- Error: uses `alert()` in dispatch, no inline error states
- Success: quote display is good, confirmation page is well-structured
- Partial: no progressive loading or skeleton states

### Pass 3: User Journey (BROKEN at checkout)
```
Landing → Browse services → Fill form → Get quote → [DEAD END]
                                                      ↑ Book Now button
                                                        does nothing
```
The journey breaks at the highest-intent moment. There is no passenger detail collection, no payment method selection, no redirect to Stripe/Zelle.

### Pass 4: Responsive Strategy (6/10)
Grid breakpoints are reasonable (1→2→3 cols). Mobile nav missing in dispatch. Form works on mobile but is too far down the page.

### Pass 5: Accessibility (2/10)
- ARIA: tabs have role="tablist" and aria-selected (good). Location dropdown missing aria-expanded. Status badges use color alone.
- Keyboard: no arrow-key navigation in dropdowns, no focus management after actions
- Contrast: gold (#c9a96e) on dark (#0a0a0a) likely passes, but secondary text (#999) may fail WCAG AA

### Pass 6: Error Handling (3/10)
- `alert()` used for errors in dispatch (blocks UI)
- Form validation is silent failure (returns early, no message)
- No error boundaries
- Confirmation page error handling is actually good

### Pass 7: Design System Alignment (2/10)
No DESIGN.md exists. Colors hardcoded as hex values throughout (not CSS variables). Typography inconsistent. No spacing scale. No component library.

## Design Implementation Checklist (Production Readiness)

1. **CRITICAL: Wire BookingForm checkout** — Add passenger detail step, payment method selection, call /api/ruta/checkout, redirect to Stripe or show Zelle instructions
2. **CRITICAL: Collect passenger name/email/phone** — Add form step between quote and checkout
3. **HIGH: Fix confirmation page copy** — Remove promises about email/WhatsApp/reminders that don't exist
4. **HIGH: Add mobile sticky CTA** — "Book Now" button that scrolls to form on mobile
5. **MEDIUM: Replace alert() with inline errors** — Use toast notifications (already configured in layout)
6. **MEDIUM: Add loading spinners** — Replace "Loading..." text with actual spinners
7. **MEDIUM: Add auto-refresh on confirmation** — Poll status every 10s when pending payment
8. **LOW: Keyboard navigation for dropdowns** — Arrow keys, Escape to close

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 6 | Design | Fix dead Book Now button (critical) | Mechanical | P1 Completeness | Can't ship a booking platform where you can't book | N/A |
| 7 | Design | Collect passenger details before checkout | Mechanical | P1 Completeness | API requires them, no UI collects them | N/A |
| 8 | Design | Fix confirmation page promises | Mechanical | P5 Explicit | Don't promise what doesn't exist | N/A |
| 9 | Design | Add mobile sticky CTA | Taste | P5 Explicit | Form below fold on mobile, but some users prefer scrolling | Skip CTA |
| 10 | Design | i18n is NOT in scope | Mechanical | P6 Action | English-only is fine for MVP targeting expats/business travelers | Full i18n |

---

# PHASE 3: ENG REVIEW (Architecture, Tests, Security)

## Eng Scope Assessment

The RUTA backend is ~1200 LOC across 7 lib files + 12 API routes + 1 SQL migration. Clean separation of concerns. The major issues are not architectural (the structure is sound) but implementation bugs — wrong Supabase clients, missing auth, dead code paths, and unfinished integrations.

## Eng Dual Voices

### CLAUDE SUBAGENT (eng — independent review)

8 net-new findings beyond CEO review:

1. **CRITICAL: Zelle-confirm uses `createClient()` too** — `zelle-confirm/route.ts:20`. Same bug as webhook/cron. RLS may block the update. CEO review caught webhook and cron but missed this route.

2. **HIGH: Driver status never reset on cancellation** — `dispatch/status/route.ts:56-60` resets driver to `available` on completion but NOT on cancellation. Cancel route also ignores driver status. A cancelled ride permanently locks the driver in `on_ride`.

3. **HIGH: Stripe `expires_after` is wrong** — `stripe.ts:55`. `expires_after: 1800` is not a valid Stripe Checkout Session parameter. Should be `expires_at` (Unix timestamp). Sessions may never expire on Stripe's side.

4. **MEDIUM: PostGIS columns always NULL** — `checkout/route.ts:63-82`. Insert never populates `pickup_location`/`dropoff_location` geometry columns despite having lat/lng. GIST indexes are useless.

5. **MEDIUM: Realtime channel never unsubscribed** — `tracker/ping/route.ts:114`. Channel created per request, `send()` called without confirming subscription.

6. **MEDIUM: `canActorTransition()` is dead code** — `ride-status.ts:58-67`. Actor-based validation exists but no route calls it. The documented actor security model is theater.

7. **MEDIUM: `paymentMethod` parameter unused in `calculateRefund`** — `cancellation.ts:14`. Zelle/Stripe treated identically when they're fundamentally different.

8. **MEDIUM: Webhook idempotency check is misleading** — `webhooks/route.ts:51-54`. Checks `stripe_payment_intent_id` which is NULL on first call. Real idempotency comes from `.eq('status', 'pending_payment')`.

### CODEX SAYS (eng — architecture challenge)

Codex unavailable [single-model].

### ENG CONSENSUS TABLE

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               7/10    N/A    SOUND (bugs, not arch)
  2. Test coverage sufficient?         0/10    N/A    ZERO COVERAGE
  3. Performance risks addressed?      6/10    N/A    PARTITION ROTATION
  4. Security threats covered?         2/10    N/A    CRITICAL GAPS
  5. Error paths handled?              3/10    N/A    MANY GAPS
  6. Deployment risk manageable?       5/10    N/A    ENV VAR RISKS
═══════════════════════════════════════════════════════════════
```

## Architecture ASCII Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL (Next.js 16)                    │
│                                                             │
│  ┌──────────┐  ┌─────────────────────────────────────────┐  │
│  │ Frontend │  │            API Routes                   │  │
│  │          │  │                                         │  │
│  │ /ruta    │  │  /quote ──── pricing.ts ──── Mapbox     │  │
│  │ /dispatch│  │  /checkout ─ stripe.ts ──── Stripe API  │  │
│  │ /confirm │  │  /webhooks ─ ⚠ createClient (BROKEN)   │  │
│  │          │  │  /dispatch ─ ⚠ NO AUTH                  │  │
│  │          │  │  /assign ─── ⚠ NO AUTH                  │  │
│  │          │  │  /status ─── ride-status.ts             │  │
│  │          │  │  /cancel ─── cancellation.ts            │  │
│  │          │  │  /zelle ──── ⚠ createClient (BROKEN)    │  │
│  │          │  │  /tracker ── tracker.ts                  │  │
│  │          │  │  /cron ───── ⚠ createClient (BROKEN)    │  │
│  │          │  │  /rides/[id] access-token.ts            │  │
│  │          │  │  /geocode ── Google Places               │  │
│  └──────────┘  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Supabase      │    │    External       │
│   PostgreSQL    │    │    Services       │
│   + PostGIS     │    │                  │
│   + RLS         │    │  Stripe API      │
│   + Realtime    │    │  Mapbox API      │
│                 │    │  Google Places   │
│  ⚠ user_metadata│    │  Vercel Cron     │
│    client-      │    │                  │
│    writable     │    │                  │
└─────────────────┘    └──────────────────┘

⚠ = Bug / Security issue identified
```

## Test Diagram

```
CODEPATH                          | TYPE NEEDED  | EXISTS? | GAP
──────────────────────────────────┼──────────────┼─────────┼──────
Quote calculation (3 ride types)  | Unit         | NO      | YES
Quote with Mapbox failure         | Unit         | NO      | YES
Checkout → ride creation          | Integration  | NO      | YES
Checkout with price manipulation  | Integration  | NO      | YES
Stripe webhook → confirmation     | Integration  | NO      | CRITICAL
Stripe webhook idempotency        | Integration  | NO      | YES
Zelle confirm → paid status       | Integration  | NO      | YES
Zelle expiry cron                 | Integration  | NO      | CRITICAL
Dispatch assign + driver status   | Integration  | NO      | YES
Status transition validation      | Unit         | NO      | YES
Status transition actor check     | Unit         | NO      | YES (dead code)
Cancel → refund calculation       | Unit         | NO      | YES
Cancel → driver status reset      | Unit         | NO      | YES (bug)
Access token generation/validation| Unit         | NO      | YES
Tracker ping validation           | Unit         | NO      | YES
Tracker rate limiting             | Integration  | NO      | YES (broken)
Tracker API key verification      | Integration  | NO      | YES (missing)
Auth role escalation prevention   | Security     | NO      | CRITICAL
Dispatch auth enforcement         | Security     | NO      | CRITICAL
Guest booking → Stripe → confirm  | E2E          | NO      | YES
Dispatch assign → status → done   | E2E          | NO      | YES
```

**22 test gaps. 4 critical (payment flow, auth). Zero existing tests.**

## Mandatory Fixes for Production (Ordered by Priority)

### CRITICAL (must fix before any real user)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| C1 | Role escalation: user_metadata is client-writable | `auth.ts:21`, `007_ruta_schema.sql:274` | Move ruta_role to app_metadata |
| C2 | Dispatch routes have zero auth | `dispatch/route.ts:6`, `assign/route.ts:4`, `status/route.ts:6` | Add `requireRutaRole` to all 3 |
| C3 | Webhook uses createClient (RLS blocks update) | `webhooks/route.ts:27` | Switch to `createServiceClient` |
| C4 | Cron uses createClient (RLS blocks update) | `cron/expire-zelle/route.ts:18` | Switch to `createServiceClient` |
| C5 | Zelle-confirm uses createClient for update | `zelle-confirm/route.ts:20` | Switch to `createServiceClient` |
| C6 | "Book Now" button has no onClick handler | `BookingForm.tsx:409` | Wire checkout flow |
| C7 | No passenger detail collection in UI | `BookingForm.tsx` | Add name/email/phone step |

### HIGH (must fix before real money)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| H1 | Price not re-validated server-side | `checkout/route.ts:78` | Re-run `calculateQuote` + compare |
| H2 | Tracker API key never verified | `tracker/ping/route.ts:57-74` | Compare against tracker_api_key_hash |
| H3 | In-memory rate limiter useless on serverless | `tracker/ping/route.ts:6` | Use DB-side rate check or Redis |
| H4 | No input validation on booking data | `checkout/route.ts:13-23` | Add Zod schema like tracker |
| H5 | Access token stored in plaintext | Schema + checkout | Hash with SHA-256, compare hashes |
| H6 | Driver status never reset on cancel | `cancel/route.ts` + `status/route.ts` | Reset driver to available on cancel |
| H7 | Stripe `expires_after` wrong parameter | `stripe.ts:55` | Use `expires_at: Math.floor(Date.now()/1000) + 1800` |
| H8 | Confirmation page promises unbuilt features | `confirmation/page.tsx:170-176` | Rewrite copy |
| H9 | Stripe refunds never execute | `cancel/route.ts:102` | Implement Stripe refund API call |

### MEDIUM (fix before scaling)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| M1 | PostGIS columns always NULL | `checkout/route.ts:63-82` | Populate pickup_location/dropoff_location |
| M2 | Partition rotation missing | `007_ruta_schema.sql:183-199` | Monthly cron to create/drop partitions |
| M3 | NEXT_PUBLIC_ Mapbox token on server | `pricing.ts:21` | Use separate MAPBOX_SECRET_TOKEN |
| M4 | canActorTransition is dead code | `ride-status.ts:58-67` | Wire into dispatch/status + cancel |
| M5 | Dev bypass in production code | `cancel/route.ts:43-44` | Remove or gate behind explicit flag |
| M6 | paymentMethod unused in refund calc | `cancellation.ts:14` | Differentiate Stripe vs Zelle refund |
| M7 | Cron secret optional (open endpoint) | `cron/expire-zelle/route.ts:11` | Make CRON_SECRET required |
| M8 | Dispatch race condition on assign | `assign/route.ts:17-46` | Atomic transaction or DB function |
| M9 | No booking idempotency | `checkout/route.ts` | Idempotency key or dedup check |

## Eng Completion Summary

```
+====================================================================+
|            ENG REVIEW — COMPLETION SUMMARY                         |
+====================================================================+
| Architecture           | Sound structure, bug pattern (wrong client)|
| Critical issues        | 7 (C1-C7)                                |
| High issues            | 9 (H1-H9)                                |
| Medium issues          | 9 (M1-M9)                                |
| Test coverage          | 0% → need 22 tests minimum               |
| Security threats       | 9 unmitigated                             |
| Performance            | Partition rotation + rate limiter          |
| Observability          | Zero (console.log only)                   |
+====================================================================+
```

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 11 | Eng | All 7 criticals must be fixed | Mechanical | P1 Completeness | Any one of these breaks the platform for real users | Defer any critical |
| 12 | Eng | All 9 highs should be fixed before real money | Mechanical | P1 Completeness | Payment integrity requires all high fixes | Defer high fixes |
| 13 | Eng | Medium fixes can be done post-MVP launch | Taste | P6 Action | None of the medium issues cause immediate harm to users | Fix all mediums now |
| 14 | Eng | Write 22 tests minimum | Mechanical | P1 Completeness | Zero test coverage on payment/auth code is unacceptable | Defer tests |

## Cross-Phase Themes

**Theme 1: Wrong Supabase client pattern** — Flagged in Phase 1 (CEO: webhook + cron) and Phase 3 (Eng: zelle-confirm too). Three routes share the same bug. High-confidence signal.

**Theme 2: Auth is broken at every layer** — Phase 1 (user_metadata writable), Phase 2 (client-side only dispatch guard), Phase 3 (no server-side dispatch auth, dev bypass). Defense in depth is zero.

**Theme 3: Booking funnel is incomplete** — Phase 2 (dead button, no detail collection), Phase 1 (no notifications), Phase 3 (price not validated). The frontend → backend → payment → confirmation chain has gaps at every stage.

---

# PRODUCTION READINESS VERDICT

## Status: NOT PRODUCTION READY

**7 critical issues** that must be fixed before any real passenger or real money:

| Priority | Fix | Effort (CC) |
|----------|-----|-------------|
| C1 | Move ruta_role to app_metadata | 15 min |
| C2 | Add requireRutaRole to 3 dispatch routes | 10 min |
| C3 | Webhook: createClient → createServiceClient | 2 min |
| C4 | Cron: createClient → createServiceClient | 2 min |
| C5 | Zelle-confirm: createClient → createServiceClient | 2 min |
| C6 | Wire BookingForm checkout flow (onClick + API call) | 30 min |
| C7 | Add passenger detail collection (name/email/phone) | 20 min |

**9 high issues** to fix before handling real money:

| Priority | Fix | Effort (CC) |
|----------|-----|-------------|
| H1 | Server-side quote re-validation at checkout | 15 min |
| H2 | Verify tracker API key against hash | 10 min |
| H3 | Replace in-memory rate limiter | 15 min |
| H4 | Zod validation on booking inputs | 15 min |
| H5 | Hash access tokens in DB | 15 min |
| H6 | Reset driver status on cancellation | 10 min |
| H7 | Fix Stripe expires_after → expires_at | 5 min |
| H8 | Rewrite confirmation page copy | 10 min |
| H9 | Implement Stripe refund execution | 20 min |

**9 medium issues** for post-launch:

M1-M9 (PostGIS, partitions, Mapbox token, actor validation, dev bypass, payment method, cron secret, race condition, idempotency)

**Estimated total effort to reach production:** ~3 hours with CC

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 14 findings (4C, 5H, 5M) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | 7 findings (2C, 2H, 3M) |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 8 net-new findings |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | unavailable | Codex not installed |

**VERDICT:** 3-phase review complete. 25 unique issues. Platform is NOT production ready. ~3 hours CC effort to reach launch-safe state.
