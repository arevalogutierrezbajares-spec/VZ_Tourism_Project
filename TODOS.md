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

## WhatsApp RAG / Training Pipeline

**T-003 — Unit tests for `lib/whatsapp-ai.ts` and `lib/whatsapp-rag.ts`**

- **What:** Add `__tests__/unit/lib/whatsapp-ai.test.ts` and `__tests__/unit/lib/whatsapp-rag.test.ts` covering: `generateReply` confidence threshold, JSON parse failure fallback, `buildSystemPrompt` with/without tone profile, `embedText` null when OPENAI_API_KEY missing, `findRelevantLessons` returns `[]` on null embedding, `buildRagContext` empty lessons.
- **Why:** `lib/whatsapp-ai.ts` contains HITL escalation logic that decides whether AI responds or escalates. A bug here silently breaks escalation for all providers.
- **Priority:** P1 — cover before adding new Groq-dependent features.

**T-004 — Webhook processes only `messages[0]` (batched messages dropped)**

- **What:** The `processInbound` loop already iterates `for (const msg of messages)` in the evolved codebase — this was inherited from `parseWebhookPayload`. Verified fixed.
- **Status:** DONE in evolved codebase.

## Completed

- All P0 + P1 UX items shipped — **Completed: v0.3.0.0 (2026-04-18)**
- `@testing-library/dom` installed — **Completed: v0.3.0.0 (2026-04-18)**
- `BookingForm` null-safety fix — **Completed: v0.3.0.0 (2026-04-18)**
