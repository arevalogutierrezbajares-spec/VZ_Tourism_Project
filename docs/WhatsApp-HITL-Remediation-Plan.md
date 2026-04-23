# WhatsApp HITL Remediation Plan

**Date:** 2026-04-23
**Branch:** `feat/whatsapp-hitl-remediation`
**Goal:** Close all gaps between current WhatsApp agent and full HITL spec.

---

## Current State vs Requirements

| # | Requirement | Status | Gap |
|---|------------|--------|-----|
| 1 | Cloud API architecture (REST, webhook) | **DONE** | None |
| 2 | HITL state machine (ai/escalated/human/closed) | **DONE** | None |
| 3 | Operator takeover button | **DONE** | None |
| 4 | AI gating on human/closed | **DONE** | None |
| 5 | Real-time message updates (Supabase Realtime) | **DONE** | None |
| 6 | Message ordering (created_at + dedup) | **DONE** | None |
| 7 | Handback context injection (human -> ai) | **PARTIAL** | No context summary injected when AI resumes |
| 8 | Concurrency protection | **PARTIAL** | No outbound idempotency tokens |
| 9 | 24-hour messaging window | **MISSING** | No window tracking, no template messages |
| 10 | Typing indicators + read receipts | **MISSING** | `markWhatsAppRead` only called in AI path, no typing indicator |
| 11 | Media download + storage | **MISSING** | Only stores text labels `[Photo]`, no file download |
| 12 | Ghost RPC `set_message_content_es` | **BUG** | Called in code but never defined in migrations |
| 13 | Escalation trigger_type constraint | **BUG** | `ai_error` and `hitl` not in CHECK constraint |

---

## Work Streams (4 parallel agents)

### Stream 1: Migration 026 + Ghost RPC + Schema

**Agent:** migration-agent (worktree)
**Files:**
- `supabase/migrations/026_hitl_remediation.sql`

**Changes:**
1. Add `last_customer_message_at TIMESTAMPTZ` to `wa_conversations`
2. Backfill from `last_message_at` where status != closed
3. Add `media_url TEXT`, `media_type TEXT` to `wa_messages`
4. Add `idempotency_key TEXT` (unique, nullable) to `wa_messages`
5. Create `set_message_content_es(msg_id UUID, es_text TEXT)` RPC function
6. Update `wa_escalations.trigger_type` CHECK to include `ai_error`, `hitl`, `topic_guard`
7. Create `wa_media` storage bucket (public, 10MB limit)
8. Add index on `wa_messages.idempotency_key`
9. Add index on `wa_conversations.last_customer_message_at`

---

### Stream 2: 24-Hour Window + Template Messages

**Agent:** window-agent (worktree)
**Files:**
- `lib/whatsapp-window.ts` (NEW)
- `lib/whatsapp-api.ts` (add `sendWhatsAppTemplate`)
- `app/api/whatsapp/webhook/route.ts` (wire window check + track timestamp)
- `__tests__/unit/whatsapp-window.test.ts` (NEW)

**Changes:**
1. Create `lib/whatsapp-window.ts`:
   - `isWindowOpen(lastCustomerMessageAt: string | null): boolean` — returns true if < 24h since last customer message
   - `getWindowStatus(lastCustomerMessageAt: string | null): { open: boolean; expiresAt: Date | null; hoursRemaining: number | null }`
2. Add `sendWhatsAppTemplate(opts)` to `whatsapp-api.ts`:
   - Sends a pre-approved template message via Cloud API
   - Template name and language params
   - Used when 24-hour window is closed
3. Update `sendAndPersist()` in webhook:
   - Before sending, check window via `isWindowOpen()`
   - If closed: attempt `sendWhatsAppTemplate()` instead of free-form
   - If no template configured: log warning, skip send, persist with `[WINDOW_CLOSED]` tag
4. Update `handleMessage()`:
   - Set `last_customer_message_at = NOW()` on every inbound message upsert
5. Write tests for window logic

---

### Stream 3: Media Download + Storage + UI

**Agent:** media-agent (worktree)
**Files:**
- `lib/whatsapp-media.ts` (NEW)
- `app/api/whatsapp/webhook/route.ts` (update non-text handler)
- `app/(provider)/dashboard/whatsapp/page.tsx` (MessageBubble media rendering)
- `components/whatsapp/MessageThread.tsx` (MessageBubble media rendering)
- `__tests__/unit/whatsapp-media.test.ts` (NEW)

**Changes:**
1. Create `lib/whatsapp-media.ts`:
   - `getMediaUrl(mediaId: string, accessToken: string): Promise<string>` — GET to Meta API for download URL
   - `downloadAndStore(mediaUrl: string, accessToken: string, supabase: ServiceClient, conversationId: string, messageType: string): Promise<{ publicUrl: string; mimeType: string }>` — download binary, upload to Supabase Storage `wa_media` bucket
2. Update webhook non-text handler (lines 211-240):
   - After persisting the label, fire-and-forget media download via `waitUntil`
   - On success: update `wa_messages` row with `media_url` and `media_type`
   - On failure: log warning, leave label in place
3. Update `MessageBubble` in both `page.tsx` and `MessageThread.tsx`:
   - If `msg.media_url` exists, render inline:
     - `image` -> `<img>` with lightbox click
     - `audio` -> `<audio>` player
     - `video` -> `<video>` player
     - `document` -> download link with filename
     - `sticker` -> small `<img>`
   - Fallback to text label if no media_url
4. Parse media ID from webhook payload in `parseWebhookPayload()`:
   - Extract `image.id`, `audio.id`, `video.id`, `document.id`, `sticker.id` from message object
   - Add `mediaId?: string` to `InboundMessage` interface
5. Write tests for media URL parsing and download logic

---

### Stream 4: Typing + Read Receipts + Handback + Idempotency

**Agent:** polish-agent (worktree)
**Files:**
- `lib/whatsapp-api.ts` (add `sendTypingIndicator`)
- `app/api/whatsapp/webhook/route.ts` (move markRead, add typing, handback, idempotency)
- `lib/whatsapp-handback.ts` (NEW)
- `__tests__/unit/whatsapp-handback.test.ts` (NEW)

**Changes:**
1. Add `sendTypingIndicator(opts)` to `whatsapp-api.ts`:
   - POST to `/{phoneNumberId}/messages` with `{ messaging_product: 'whatsapp', status: 'typing', recipient_id: to }`
   - Fire-and-forget, don't block on response
2. Move `markWhatsAppRead()` call earlier in webhook pipeline:
   - Currently at line 385 (only in AI path)
   - Move to right after dedup check (line 209), so ALL messages get blue checks
   - Including non-text, escalated, flagged messages
3. Add typing indicator before AI generation:
   - In `scheduleDelayedReply()`, call `sendTypingIndicator()` right before `generateReply()`
   - Guest sees "typing..." while AI thinks
4. Create `lib/whatsapp-handback.ts`:
   - `buildHandbackContext(supabase, convId): Promise<string | null>`
   - Query messages where `role = 'outbound' AND is_ai = false` after the last `status = 'human'` transition
   - Summarize: "The team discussed: [topics]. Key commitments: [any promises made]."
   - Inject into `generateReply()` opts as `handbackContext`
5. Add handback context to `buildSystemPrompt()`:
   - New optional field `handbackContext?: string`
   - If present, append block: "## Recent Team Notes\n{context}"
6. Wire handback in webhook:
   - When `scheduleDelayedReply()` runs and conv was recently human, call `buildHandbackContext()`
7. Outbound idempotency:
   - Generate `idempotency_key` as `${convId}:${Date.now()}` before sending
   - Check for existing key before insert (prevent double-persist)
   - Pass to `sendAndPersist()`

---

## Merge Order

1. Migration 026 (Stream 1) — merges first, no code conflicts
2. Stream 4 (typing/read/handback/idempotency) — touches webhook broadly
3. Stream 2 (24-hour window) — adds window check to sendAndPersist
4. Stream 3 (media) — adds media flow to webhook

---

## Database Type Updates

After migration, update `types/database.ts`:
- Add `last_customer_message_at` to `WaConversation`
- Add `media_url`, `media_type`, `idempotency_key` to `WaMessage`

---

## Testing Strategy

Each stream writes its own unit tests. After merge:
- Run full suite: `npx jest --testPathPattern=whatsapp`
- Browser QA: verify media renders, typing shows, window warning appears
- Manual test: send photo to WhatsApp number, verify it appears in dashboard

---

## Rollback Plan

Each stream is a separate worktree branch. If any stream causes issues:
- `git revert` the merge commit for that stream
- Migration 026 is additive (no column drops), safe to leave in place
