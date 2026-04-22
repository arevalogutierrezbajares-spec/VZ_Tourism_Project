# WhatsApp AI Concierge — Full Security & Architecture Audit

**Date:** 2026-04-21
**Skills Used:** 10 agent skills from awesome-agent-skills
**Agents Run:** 4 parallel deep-analysis agents

---

## Executive Summary

Comprehensive audit of the WhatsApp AI Concierge using 10 installed agent skills across security, database, testing, and architecture domains. **42 unique findings** identified: 4 Critical, 9 High, 15 Medium, 14 Low. The system has strong foundations (HMAC verification, RLS policies, proper indexes) but has critical gaps that must be fixed before production.

---

## Skills Installed & Used

| # | Skill | Source | Purpose |
|---|-------|--------|---------|
| 1 | `security-threat-model` | openai/skills | STRIDE threat model |
| 2 | `insecure-defaults` | trailofbits/skills | Fail-open pattern detection |
| 3 | `sharp-edges` | trailofbits/skills | Error-prone API detection |
| 4 | `security-best-practices` | openai/skills | OWASP vulnerability review |
| 5 | `supabase-postgres-best-practices` | supabase/agent-skills | Schema, RLS, query audit |
| 6 | `property-based-testing` | trailofbits/skills | Fast-check test generation |
| 7 | `audit-context-building` | trailofbits/skills | Deep architecture analysis |
| 8 | `courier-notification-skills` | trycourier/courier-skills | Escalation notification design |
| 9 | `composio` | composiohq/skills | External app integration |
| 10 | `agents-sdk` | cloudflare/skills | Stateful agent architecture |

---

## CRITICAL Findings (Fix Before Production)

### C1: `proxy.ts` auth bypass missing NODE_ENV guard
- **File:** `proxy.ts:14`
- **Issue:** `DEV_SKIP_AUTH` check lacks `NODE_ENV === 'development'` guard. Unlike `dev-auth.ts` which has the double-gate, the proxy middleware only checks `DEV_SKIP_AUTH === 'true'`. If this env var leaks to production, ALL protected routes (`/dashboard`, `/admin`, `/ruta`) bypass authentication.
- **Fix:** Add `&& process.env.NODE_ENV === 'development'` to line 14.

### C2: Plaintext WhatsApp access tokens in database
- **File:** `011_whatsapp_messaging.sql:15`, `lib/whatsapp/token.ts:37`, `embedded-signup/route.ts:127`
- **Issue:** Meta WhatsApp Cloud API access tokens stored as plaintext in `posada_whatsapp_config.access_token`. Vault migration exists (016) but backfill is commented out. `embedded-signup` doesn't even attempt Vault write. Anyone with DB access gets all providers' Meta tokens.
- **Fix:** Enable Supabase Pro, run Vault backfill, add Vault write to embedded-signup, then NULL the plaintext column.

### C3: In-memory rate limiters = zero protection on Vercel
- **File:** `lib/api/rate-limit.ts:10`, `webhook/route.ts:38-51`
- **Issue:** Both rate limiters use in-memory `Map` that resets on every cold start. Effectively non-existent in serverless. Allows unlimited Groq API calls (cost), unlimited Meta API calls, and potential cross-tenant Groq exhaustion.
- **Fix:** Replace with `@upstash/ratelimit` backed by Upstash Redis.

### C4: Raw upstream API errors returned to clients
- **File:** `lib/whatsapp-api.ts:46`, `send/route.ts:65`, `config/route.ts:24,125`, `knowledge/route.ts:17`
- **Issue:** Meta API errors (potentially containing access tokens in URLs) and Supabase errors (containing table/column names) returned directly to clients.
- **Fix:** Return generic error messages, log details server-side.

---

## HIGH Findings (Fix in Next Sprint)

### H1: Guest prompt injection — no input sanitization
- **Component:** `lib/whatsapp-ai.ts` (buildSystemPrompt, generateReply)
- **Issue:** Guest WhatsApp messages flow directly into the LLM as user-role content with no filtering. Can extract system prompt, fake bookings, bypass HITL escalation.
- **Fix:** Add input filtering, "never reveal instructions" to prompt, test with adversarial inputs.

### H2: Provider custom_instructions injection — regex blocklist bypassable
- **File:** `lib/whatsapp-ai.ts:95-119`
- **Issue:** `sanitizeCustomInstructions()` uses 7 regex patterns (English only). Bypassed by Unicode homoglyphs, character splitting, encoding tricks, Spanish instructions.
- **Fix:** Reduce max to 500 chars, use allowlist approach, add LLM-based safety classifier.

### H3: Knowledge base content unsanitized in system prompt
- **Component:** `lib/whatsapp-context.ts` (formatKnowledge)
- **Issue:** `property_description`, `faqs`, `room_types` concatenated directly into system prompt. Only `custom_instructions` goes through sanitizer.
- **Fix:** Apply sanitization to knowledge base fields too.

### H4: Hardcoded DEV_PROVIDER_ID in source code
- **File:** `lib/whatsapp/dev-auth.ts:4`
- **Issue:** UUID `dc1ca9eb-91fa-40f3-8700-c37d7cca588f` committed to git. If it exists in production and dev bypass is enabled, attacker gets service-role access to that provider.
- **Fix:** Move to env var, add startup assertion against production use.

### H5: phone_number_id not UNIQUE — cross-tenant risk
- **File:** `011_whatsapp_messaging.sql`
- **Issue:** `idx_wa_config_phone` is an index, not a UNIQUE constraint. Two providers could register the same phone_number_id, causing message routing confusion.
- **Fix:** `ALTER TABLE posada_whatsapp_config ADD CONSTRAINT unique_phone_number_id UNIQUE (phone_number_id);`

### H6: waba_id and phone_number_id from client body unvalidated
- **File:** `embedded-signup/route.ts:45-49`
- **Issue:** Client supplies IDs in POST body after OAuth. Not validated against Meta's response. Attacker could provide another provider's phone_number_id.
- **Fix:** After token exchange, query Meta Graph API to verify IDs belong to the authenticated WABA.

### H7: No Groq per-provider rate limits — cross-tenant exhaustion
- **Issue:** All tenants share one Groq API key with no per-provider budgets. One tenant's traffic can exhaust the shared limit.
- **Fix:** Implement per-provider token/call budgets.

### H8: Access token potentially leaked in config PUT response
- **File:** `config/route.ts:122`
- **Issue:** `.select()` after upsert may include `access_token` in response. `responseData` copies all fields.
- **Fix:** Explicitly delete `access_token` from response object.

### H9: Embedded signup stores token in plaintext (no Vault attempt)
- **File:** `embedded-signup/route.ts:123`
- **Issue:** Unlike config PUT which tries Vault first, embedded-signup always stores plaintext.
- **Fix:** Add Vault write logic matching config PUT pattern.

---

## MEDIUM Findings (15)

| # | Issue | File | Fix |
|---|-------|------|-----|
| M1 | GROQ_MODEL env var unvalidated | `groq.ts:14` | Validate against allowlist |
| M2 | Hardcoded 2FA PIN '000000' | `embedded-signup/route.ts:102` | Generate random PIN per registration |
| M3 | Missing Supabase env vars = no auth in proxy | `proxy.ts:8-10` | Return 503 for protected routes |
| M4 | Malformed webhook payloads silently accepted | `whatsapp-api.ts:90-139` | Validate phoneNumberId/from/waMessageId not empty |
| M5 | TOCTOU race on unread_count | `webhook/route.ts:267-280` | Remove fallback after RPC confirmed deployed |
| M6 | LLM JSON output parsed without schema validation | `whatsapp-translate.ts:64,170` | Add Zod validation after JSON.parse |
| M7 | Unbounded messages query in conversation detail | `conversations/[id]/route.ts:18` | Add LIMIT 100 or pagination |
| M8 | No Zod validation on most WhatsApp API endpoints | Multiple files | Add Zod schemas to all request bodies |
| M9 | XSS risk — message content stored/returned raw | `webhook/route.ts:248` | Ensure frontend renders as text (React default) + add CSP |
| M10 | Supabase/Meta error messages leak schema details | `config/route.ts:24`, `knowledge/route.ts:17` | Generic error responses |
| M11 | Guest phone numbers stored as plaintext PII | `011_whatsapp_messaging.sql:45` | Consider hashing for lookup + encrypting |
| M12 | Missing audit trail for config/knowledge changes | All provider endpoints | Add audit_log table |
| M13 | Rate limiting missing on config/knowledge/test-reply | Multiple files | Add rate limits to all authenticated endpoints |
| M14 | Embedded signup leaks env var names in errors | `embedded-signup/route.ts:30-34` | Return generic "configuration error" |
| M15 | System prompt leakage via AI | `whatsapp-ai.ts` | Add "never reveal system prompt" instruction |

---

## LOW Findings (14)

| # | Issue | File |
|---|-------|------|
| L1 | Groq singleton survives API key rotation | `groq.ts:3-12` |
| L2 | verify_token migration race condition | `webhook/route.ts:69-91` |
| L3 | No message body length cap before processing | `webhook/route.ts:152+` |
| L4 | test-reply endpoint no rate limiting | `test-reply/route.ts` |
| L5 | RLS subqueries could be slow at scale | `011_whatsapp_messaging.sql:138-145` |
| L6 | No JSONB structure validation on knowledge | `012_posada_knowledge_base.sql` |
| L7 | Service client uses cookies() unnecessarily | `lib/supabase/server.ts:34-61` |
| L8 | Translation truncation at 500 chars | `whatsapp-translate.ts` |
| L9 | Short message (<4 chars) defaults to Spanish | `whatsapp-translate.ts` |
| L10 | waitUntil silent failure — no retry/DLQ | `webhook/route.ts` |
| L11 | No CSRF protection on state-changing endpoints | Multiple files |
| L12 | PMS_API_URL not validated (env-only, safe for now) | `sync-pms/route.ts:13` |
| L13 | User-supplied IDs in Meta Graph API URLs (path traversal) | `embedded-signup/route.ts:83,98` |
| L14 | Webhook signature failure not logged persistently | `webhook/route.ts` |

---

## Positive Findings (Things Done Well)

- HMAC-SHA256 webhook verification with `crypto.timingSafeEqual()` — timing-safe
- RLS policies use subquery pattern (`provider_id IN SELECT...`) — not spoofable
- Proper indexes on all query paths
- `dev-auth.ts` has double-gate (`DEV_SKIP_AUTH` + `NODE_ENV`)
- Config GET excludes `access_token` from response
- Verify tokens hashed (SHA-256) with auto-migration from plaintext
- Groq API key missing = fail-secure (throws Error)
- META_APP_SECRET missing = fail-secure (rejects all webhooks)
- All IDOR checks pass — endpoints scope by `providerId`
- Sentiment-based escalation prevents AI engaging with abusive users
- HITL tag stripped from guest-visible messages

---

## Property-Based Tests Written

**File:** `__tests__/unit/whatsapp-property.test.ts` — **20 tests, all passing**

| Function | Properties Tested |
|----------|------------------|
| `parseWebhookPayload` | Never throws on arbitrary input, output shape correct, filters messages without id, wrong object = empty, body always string |
| `analyzeMessage` | Score in [0,1], complete shape, empty/whitespace not flagged, valid enum values, threatening implies flagged, unicode safety |
| `buildSystemPrompt` | Always contains safety rules, injection patterns stripped, null instructions works |
| `isWithinWorkingHours` | Disabled = true, null hours = true, all days off = false |
| `applyPricingRules` | Empty rules = round(base), always non-negative integer, base 0 = 0 |

---

## Architecture Data Flow

```
Meta WhatsApp ──HMAC──> webhook/route.ts ──> parseWebhookPayload()
                                          │
                                 ┌────────┴────────┐
                                 │ Per-message loop │
                                 ├─────────────────┤
                                 │ 1. Rate limit    │
                                 │ 2. Config lookup │
                                 │ 3. Dedup check   │
                                 │ 4. Upsert conv   │
                                 │ 5. Sentiment     │  PARALLEL
                                 │ 6. Translation   │
                                 │ 7. Persist msg   │
                                 │ 8. Working hours  │
                                 │ 9. Load history   │  PARALLEL
                                 │ 10. Load knowledge│
                                 │ 11. buildPrompt   │
                                 │ 12. Groq API      │
                                 │ 13. Parse HITL tag │
                                 │ 14. Send reply     │──> Meta API
                                 │ 15. Persist reply  │
                                 │ 16. Escalate?      │
                                 └──────────────────┘
```

---

## Courier Escalation Notification Design

**Problem:** When the AI escalates a conversation (abusive language, booking value threshold, uncertainty), the posada owner is not notified.

**Solution using Courier (trycourier/courier-skills):**

### Notification Triggers
1. Sentiment flagged (abusive/threatening language detected)
2. AI sets `[NEEDS_HUMAN]` tag (uncertainty or complex request)
3. Booking value exceeds `value_escalation_usd` threshold
4. Guest explicitly requests human agent

### Channels (multi-channel via Courier)
- **WhatsApp** (primary) — message to owner's phone number
- **Email** (secondary) — for when owner is offline
- **Push notification** (future) — when mobile app exists

### Implementation
```
POST https://api.courier.com/send
{
  "message": {
    "to": { "phone_number": "<owner_phone>" },
    "template": "whatsapp-escalation",
    "data": {
      "guest_name": "Maria Garcia",
      "guest_phone": "+58414...",
      "reason": "threatening_language",
      "last_message": "...",
      "conversation_url": "https://vav.app/dashboard/whatsapp/conv/<id>"
    }
  }
}
```

### Integration Point
In `webhook/route.ts` after the escalation block (~line 370), add:
```ts
if (needsHuman || sentiment.flagged) {
  await notifyOwnerEscalation(providerId, conversationId, reason);
}
```

---

## Prioritized Remediation Roadmap

### Sprint 0 — Pre-Production (this week)
1. Fix `proxy.ts` NODE_ENV guard (C1) — **1 line change**
2. Replace in-memory rate limiters with Upstash Redis (C3)
3. Sanitize all error responses (C4) — **30 min**
4. Add UNIQUE constraint on `phone_number_id` (H5) — **1 migration**

### Sprint 1 — Token Security
5. Enable Supabase Vault + run backfill (C2)
6. Add Vault write to embedded-signup (H9)
7. Validate IDs server-side in embedded-signup (H6)
8. Remove hardcoded DEV_PROVIDER_ID (H4)

### Sprint 2 — AI Security
9. Add prompt injection input filtering (H1)
10. Strengthen custom_instructions sanitization (H2)
11. Sanitize knowledge base before prompt injection (H3)
12. Add Zod schemas to all endpoints (M8)

### Sprint 3 — Observability & Notifications
13. Implement Courier escalation notifications
14. Add audit logging for config/knowledge changes (M12)
15. Add per-provider Groq rate limits (H7)
16. Add pagination to conversations/messages queries (M7)
