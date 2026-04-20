# D6b — WhatsApp AI Concierge Review
**Date:** 2026-04-20
**Reviewer:** Senior UX/UI + Engineering Review
**Note:** 8 files with uncommitted changes — this is active development. Review covers all demo pages, new components, core logic, and API routes.

---

## Executive Summary

The WhatsApp AI Concierge is architecturally sound and significantly more mature than expected at this stage. The critical security requirement — HMAC-SHA256 webhook signature verification — is correctly implemented. The three-panel chat interface (ConversationList / MessageThread / BookingPipeline) is clean and logically organized. The AI Brain editor (7 sections) and AI Settings panel (7 tabs) are both well-structured.

**Key risks to address before any production exposure:**

1. **P0 — `StatsStrip.tsx` file is missing**: the component listed in git status (`?? components/whatsapp/StatsStrip.tsx`) does not exist on disk. The `ConversationList.tsx` imports a local inline version instead — creating a dead file entry that will cause confusion for future developers and possibly TypeScript import errors.
2. **P1 — Rate limiter is in-memory and per-process**: the in-memory `rateLimitMap` in the webhook route resets on every cold start and does not survive across Vercel serverless instances. Under any real load this is effectively no rate limit.
3. **P1 — Booking Pipeline: "Close" mode is one accidental click away from AI mode**: there is no confirmation dialog before setting a conversation to `closed`. The mode buttons are unlabeled as destructive and sit in the same visual group as "AI" and "Take Over".
4. **P1 — DemoSidebar has a hardcoded unread badge of `3`**: the badge ignores the actual `unread_count` sum from live state, so it will always show 3 in demo regardless of interactions.
5. **P2 — `custom_instructions` injection with no sanitisation**: provider-supplied free-text is injected verbatim into the system prompt. No stripping of NEEDS_HUMAN tag syntax, no max-length enforcement on the server side (only a client textarea `maxLength`).
6. **P2 — Working hours uses hardcoded `UTC-4` for Venezuela**: this is correct for standard time but Venezuela does not observe daylight saving, and the offset comment will become a maintenance liability if the system expands to other time zones.
7. **P3 — Avatar selection in PersonaTab is UI state only**: the selected avatar emoji is never persisted to any field in `AiConfig`. It is reset on remount.

---

## UX/UI Review

### Conversation List & Filters

**Passes.** `ConversationList.tsx` correctly sorts by `last_message_at` descending (lines 126–131). Unread badge counts use `min-w-[18px]` pill with `9+` cap — readable and standard. The five filter tabs (all / ai / human / escalated / closed) are rendered as compact pill buttons with clear active state (primary bg). The status dot on each avatar (green/blue/red/gray) provides quick visual scanning without needing to read the badge text.

**Issue (P3):** The "Refresh" button in the header has `title="Refresh (demo)"` but no `onClick` handler — clicking it does nothing. In production this should poll for new conversations or be removed.

**Issue (P2):** The filter tab for `'escalated'` has no unread count indicator — if you are on the `all` tab and switch to `escalated`, you have no way to know how many are waiting without visually scanning. The StatsStrip shows the count but it is above the filter tabs, not per-tab.

**Design system alignment:** Status colors use hardcoded Tailwind classes (`bg-green-100 text-green-800`) rather than the DESIGN.md semantic tokens (`bg-status-confirmed`, `text-status-confirmed`). This will break dark mode. Both `ConversationList.tsx` and `MessageThread.tsx` define an identical `STATUS_CONFIG` constant — this is duplicated logic that should live in a shared `lib/whatsapp-constants.ts`.

---

### Message Thread

**Passes strongly.** Day dividers are implemented (`DayDivider` component, lines 106–114), with correct "Today"/"Yesterday"/date logic. Translation toggles are per-message and intuitive (`Show in English (ES)` / `Hide translation`). Sentiment flags are visible via `ring-1 ring-destructive` on the bubble and an `AlertTriangle` icon. AI vs. human indicator is clear: `Sparkles` icon for AI outbound messages, `CheckCheck` for human outbound, `Phone` icon for inbound. Auto-scroll on new messages is implemented via `scrollIntoView`.

**Issue (P2):** When status is `ai` or `escalated`, the reply input is hidden and a text hint shows. The "Take over →" link is small (`text-xs text-primary`) and easy to miss on the escalated state where the operator urgently needs to type. The CTA should be a full Button with a visible affordance, not an inline text link.

**Issue (P3):** `groupedMessages()` is defined with `useCallback` but its return value is called inline as a function (`groupedMessages().map(...)`) — this means the memoization is effectively useless since the array is still recomputed on every render. Should be `const groups = useMemo(() => groupedMessages(), [...])` or computed directly.

**Issue (P3):** The translation button reads `Show in English (?)` when `detected_lang` is null. Should gracefully omit the language code or default to a sensible label rather than showing `?`.

---

### Stats Strip

The stats strip is implemented **inline within `ConversationList.tsx`** (lines 188–210) as `StatsStripInline`. It is not a standalone `StatsStrip.tsx` file, despite `StatsStrip.tsx` appearing in the git untracked list. This is a discrepancy.

**The design itself works:** 4-column grid (Total / AI / Human / Escalated) with large bold counts in semantic colors. Each cell has the count and an uppercase label. Compact (py-2.5), sits logically between the header and the filter tabs.

**Issue (P1):** `StatsStrip.tsx` is listed in git as `?? components/whatsapp/StatsStrip.tsx` but the file does not exist on disk. Any import of this path will cause a build error. The component must either be created as a standalone file or the git entry is a phantom. Needs resolution before merge.

---

### Mode Switching

**Partially passes.** The `BookingPipeline.tsx` `ModeButton` component is well-designed: an active indicator (filled circle dot), primary bg highlight, and a description sub-label. The three modes (AI / Take Over / Close) are visually distinguishable.

**Issue (P1 — safety):** There is no confirmation step before setting status to `closed`. One tap on "Close" irreversibly closes the conversation without any "Are you sure?" dialog. Operators handling many threads will accidentally close conversations. A minimum requirement is a confirmation popover or a require-double-click pattern for destructive mode changes.

**Issue (P1 — safety):** There is also no confirmation before switching from `human` back to `ai` mode. If an operator is mid-conversation and accidentally clicks "AI" in the mode panel, the AI immediately resumes — which could send an automated reply while the operator is composing something. This mode change should also require confirmation.

**Issue (P2):** The BookingPipeline also has a "Quick Actions" section at the bottom with "Resume AI" and "Mark Closed" buttons that duplicate the mode buttons above. This creates two places to do the same thing with no visual hierarchy explaining why. Remove the Quick Actions section or give it distinct functionality (e.g. "Send closing message template").

---

### Booking Pipeline

**Passes.** The five stages (Lead / Quoted / Confirmed / Checked In / Closed) are rendered as a vertical list with active stage highlighted in primary, inactive stages in muted text. Stage selection is immediate with no delay. Guest info (name, phone, since date) is shown at a glance.

**Issue (P2):** Stage buttons use a monochromatic single-color highlight (all stages use `bg-primary text-primary-foreground` when active). The DESIGN.md specifies semantic status tokens — Confirmed should use `bg-status-confirmed` (green), Quoted `bg-status-pending` (amber), Closed `bg-status-cancelled` (gray). The current treatment loses the visual information that different stages have different meanings.

**Issue (P3):** `STAGE_CONFIG` defines a `color` property for each stage (`text-yellow-700`, `text-green-700` etc.) but these colors are **never used** in the rendered output. The active state overrides with `bg-primary text-primary-foreground`. Dead config.

**Issue (P3):** `WaBookingStage` `closed` and `WaConversationStatus` `closed` are two different `closed` values that can get out of sync (booking_stage=closed but status=ai is a valid DB state). There is no guard in the UI to keep them consistent. When booking_stage is set to `closed`, the conversation status should also be set to `closed`.

---

### AI Brain Editor

**Passes strongly.** The 7-section accordion structure (Overview / Rooms & Rates / Amenities / Policies / FAQ Builder / Booking & Payment / Local Tips) is well-organized and logically ordered. Each section has:
- Completion indicator (green checkmark icon when filled)
- A progress bar showing sections completed
- Per-section save with spinner feedback
- Toast-style flash message on save

The FAQ suggestion chips (pre-filled bilingual questions) and amenity toggle chips are a strong UX pattern for non-technical posada owners.

**Issue (P2):** Save flash messages always show `ok: true` even when the API fails (lines 268–275 in `brain/page.tsx`). On API failure the code falls through to a localStorage save and then sets `flash.ok = true`. This misleads the operator — they see "Saved — Sofía will use this in her next reply" when in fact it was only saved to localStorage, not the production database.

**Issue (P2):** The "Preview prompt" split-column layout (`grid-cols-2`) is only applied when `showPreview` is true, but there is no responsive handling — on screens narrower than ~900px this will overflow badly. The preview panel needs `hidden lg:block` or similar.

**Issue (P3):** The `RoomBuilder` uses `key={i}` for room items, which causes React reconciliation issues when rooms are deleted from the middle of the list (the state of the remaining rooms will shift incorrectly). Should use a stable key based on room name + index or a uuid.

---

### AI Settings

**Passes strongly.** The 7-tab sidebar layout (Status / Persona / Communication / Smart Rules / Availability / Instructions / Connection) covers the full configuration surface comprehensively. The big on/off card on the Status tab is a strong affordance. `OptionCards` with radio-button-style selection and live example previews is excellent UX for non-technical users. The escalation keyword `TagInput` with bilingual suggestions is well-thought-out.

**Issue (P2):** Avatar emoji selection in PersonaTab is local component state only — it is never wired into `AiConfig` or saved to the database. The avatar state resets on every component remount and is purely decorative. Either wire it to a `persona_avatar` field or remove it to avoid confusion.

**Issue (P2):** The `addQuick` function in `InstructionsTab` (line 913) defines a `sep` variable that is never used. Minor dead code, but signals a copy-paste oversight.

**Issue (P2):** The Connection tab shows `access_token` as `'(not set)'` if the field is falsy, but this will happen when the real config is loaded (because the GET endpoint never returns the actual token, only a masked placeholder). The UI should explain that the token is already stored and only needs to be re-entered to change it.

**Issue (P3):** `siteUrl` defaults to `''` (empty string) in the panel props — the webhook URL shown in ConnectionTab will display as `/api/whatsapp/webhook` (relative path) if `siteUrl` is not passed. The settings page (`/demo/whatsapp/settings/page.tsx`) passes `siteUrl="https://vztravel.app"` which is hardcoded. For the real settings page this should use `process.env.NEXT_PUBLIC_SITE_URL`.

**Issue (P3):** Status tab stats (AI-handled today, escalation rate, avg response time, open conversations) all show `—`. This is acceptable for an MVP but the placeholder should be labeled "Connect to Supabase to see live stats" rather than just `—`, so operators understand this is a data loading state not a display bug.

---

### Mobile Experience

**Fails on the demo page.** The three-column layout in `app/demo/whatsapp/page.tsx` (`ConversationList` 280px + `MessageThread` flex-1 + `BookingPipeline` 208px) uses `flex h-screen overflow-hidden`. On any screen narrower than ~768px, this becomes three stacked columns that overflow horizontally with no mobile breakpoint handling. There is no responsive column collapse, no mobile "back" navigation from thread to list, and no mobile-visible BookingPipeline.

The Brain editor and Settings panels are single-column and scroll vertically — these work reasonably on mobile.

**Minimum fix required:** The demo page needs a responsive mode where at mobile widths: (1) only the ConversationList is shown initially, (2) selecting a conversation slides to the thread view, (3) BookingPipeline becomes a bottom sheet or collapsible panel.

---

## Code Quality Review

### Groq AI Integration (`lib/whatsapp-ai.ts` + `lib/groq.ts`)

**Quality: Good with one concern.**

The Groq client is a lazily-initialized singleton (`let _client: Groq | null = null`) — correct pattern for serverless to avoid re-creating on every invocation. Model is configurable via `process.env.GROQ_MODEL` with a sensible fallback to `llama-3.3-70b-versatile`.

The `buildSystemPrompt` function is clean and well-structured. Temperature `0.3` and `top_p 0.9` are appropriate conservative settings for factual guest-relations replies.

The HITL escalation tag protocol (`[NEEDS_HUMAN: <reason>]`) is clever — the AI appends a parseable tag that the system strips before delivery. The regex `NEEDS_HUMAN_RE` is defined at module level and reused, which is correct.

**Security concern (P2):** `custom_instructions` from the `config` object is injected directly into the system prompt at line 128:
```
const customBlock = config.custom_instructions
  ? `\nSpecial instructions from the posada owner:\n${config.custom_instructions}\n`
  : '';
```
A malicious or compromised posada account could inject instructions that override safety rules, impersonate different personas, or attempt to leak system prompt contents. The field should be sanitised to strip sequences like `[NEEDS_HUMAN:`, `##`, role-override attempts, and should be character-limited server-side (not just on the client textarea).

**No injection issues found** in the `inboundText` path — it is passed as a `user` role message, not concatenated into the system prompt. The history messages are also correctly mapped to `user`/`assistant` roles without any string interpolation.

**One code quality issue (P3):** `formatKnowledge` is defined twice — once in `lib/whatsapp-ai.ts` (line 21) as a private function, and then exported at line 222. The `brain/page.tsx` imports it from `lib/whatsapp-ai`. However the export happens at the bottom after the main function, which is fine — no duplicate, just note the function is exported for preview use in the brain editor.

---

### WhatsApp Webhook Security (`app/api/whatsapp/webhook/route.ts`)

**PASSES — signature verification is correctly implemented.**

The `verifyWebhookSignature` function (lines 22–35):
- Reads the raw request body as text **before** JSON.parse (correct — must be the raw bytes)
- Computes `sha256=<HMAC-SHA256(META_APP_SECRET, rawBody)>`
- Uses `crypto.timingSafeEqual` to prevent timing attacks
- Returns `false` (403) if `META_APP_SECRET` is not set
- Returns `false` if the `x-hub-signature-256` header is missing

The POST handler correctly reads `rawBody` first, verifies signature, then parses JSON — this is the required order and it is done correctly.

**Verify token handling:** The GET challenge handler correctly looks up the verify token by its SHA-256 hash (via `hashToken`), with a plaintext fallback and auto-migration path. This is a thoughtful migration story.

**Rate limiting concern (P1):** The `rateLimitMap` (lines 39–51) is in-memory and per-process. On Vercel, each serverless function invocation may run in a different container. The rate limit will not work across concurrent instances and resets on every cold start. For production this must be replaced with Redis or Supabase-based rate limiting.

**Additional security observations:**
- The `processInbound` call is wrapped in `waitUntil` — correct for Vercel serverless to avoid the function being killed before AI reply is sent.
- Dedup check on `wa_message_id` prevents double-processing of retried webhooks (Meta retries on non-200 responses).
- Non-text message types get a human-readable label `[Photo]` / `[Voice note]` rather than silently dropping — good UX.
- The bot-question detection path correctly escalates AND sends a human-acknowledgement response before escalating.

---

### API Error Handling (`lib/whatsapp-api.ts`, `/api/whatsapp/send`, `/api/whatsapp/config`)

**Quality: Good.**

`waPost` in `lib/whatsapp-api.ts` has:
- 8-second timeout via `AbortController`
- Proper catch on fetch errors returning `{ success: false, error }`
- Non-OK HTTP status handling with error text included
- No unhandled promise rejections

`/api/whatsapp/send/route.ts`:
- Auth checked via `supabase.auth.getUser()` before any data access
- Provider ownership verified via `.eq('provider_id', provider.id)` on conversation fetch
- Returns 502 on WhatsApp API failure (correct — the upstream is the bad gateway)
- Message insert failure is logged and returns 500

`/api/whatsapp/config/route.ts`:
- Allowlist-based field filtering (`allowed` array) prevents mass-assignment
- `verify_token` is hashed before storage, plaintext returned once in response
- `access_token` vault encryption attempted via service client with graceful plaintext fallback
- GET endpoint masks `verify_token` as `••••••••` — tokens never sent to client in plaintext

**One issue (P2):** In `config/route.ts` at line 93, the phone_number_id validation only applies on first creation, checked by `count`. But the query uses `supabase` (user-scoped client, not service client), so the count check is correct under RLS. However — if Vault encryption fails silently (line 127 catch-all), the plaintext token is stored in `access_token`. This is documented as a migration story, but operators who have Vault available should see a warning if Vault write fails, not silent fallback.

---

### Context Management (`lib/whatsapp-context.ts`)

**Quality: Good. No memory leaks.**

`buildLiveContext` is a pure async function that takes `supabase`, `providerId`, and `knowledge` — no React state, no closures, no subscriptions. It cannot leak memory.

The pricing engine `applyPricingRules` correctly handles: seasonal multipliers (highest wins), weekend premium, long-stay discounts (highest threshold wins), and last-minute discounts. These are applied in the correct sequence.

The availability summarizer `collapseWindows` is a clean O(n) linear scan — correct implementation.

**Issue (P2):** The `getAvailability` and `getRoomTypes` functions are imported from `./availability-store` — a file that uses file-system access (implied by the comment "File store not available (e.g. serverless)"). The entire availability block is wrapped in a try/catch that silently swallows all errors. This is acceptable for now but the silent suppression means availability data will never appear in production on Vercel without a database-backed store. There is no log or indicator that the block was skipped.

**Issue (P3):** `toYMD`, `addDays`, `diffDays`, `formatDate` are utility functions that duplicate date handling from elsewhere in the codebase. These should be in a shared `lib/date-utils.ts`.

---

### Token Management (`lib/whatsapp/token.ts`)

**Quality: Correct. Simple and defensible.**

The `getWhatsAppToken` helper implements a two-tier strategy:
1. Try Vault RPC (`vault_read_wa_token`) if `access_token_vault_id` is set
2. Fall back to plaintext `access_token` column

The try/catch around the Vault call correctly falls through to plaintext on RPC error. The function accepts `ServiceClient` (not user-scoped) which is correct for Vault access.

**Issue (P2):** There is no expiry handling. WhatsApp Cloud API access tokens expire (permanent tokens are available but system user tokens expire). If the stored token has expired, the webhook will silently fail to send replies — `sendWhatsAppText` returns `{ success: false }` which is logged but does not trigger any operator notification. The dashboard has no "WhatsApp connection health" indicator visible to operators.

**Issue (P3):** `lib/whatsapp/token.ts` imports `ServiceClient` but the `send/route.ts` passes a user-scoped `supabase` client (from `createClient()`) to `getWhatsAppToken`. The type allows this (both satisfy the `ServiceClient` interface) but the Vault RPC may fail silently under user-scoped auth — a future footgun. The function signature should distinguish client types or the send route should use the service client for token decryption.

---

## Priority Issues

### P0 — Security / Build Broken

| # | Issue | File | Fix |
|---|-------|------|-----|
| P0-1 | `StatsStrip.tsx` appears in git untracked list but does not exist on disk. Any future import of `@/components/whatsapp/StatsStrip` will cause a build error. Either create the file (wrapping the existing inline `StatsStripInline`) or remove it from git status. | `components/whatsapp/StatsStrip.tsx` (missing) | Create file that exports `StatsStripInline` logic, or `git rm --cached` the phantom entry |

### P1 — High

| # | Issue | File | Fix |
|---|-------|------|-----|
| P1-1 | In-memory rate limiter resets on cold start and is not shared across Vercel instances — effectively no rate limit in production. | `app/api/whatsapp/webhook/route.ts:39-51` | Replace with Supabase/Redis-backed rate limit keyed on phone + time window |
| P1-2 | No confirmation before "Close" conversation or before resuming AI mode — accidental destructive mode changes in production. | `components/whatsapp/BookingPipeline.tsx:99-104` | Add a `<AlertDialog>` confirmation for `closed` and for `ai` when current status is `human` |
| P1-3 | DemoSidebar "Messages" unread badge hardcoded to `3` regardless of actual unread state. | `components/whatsapp/DemoSidebar.tsx:61` | Derive from `MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.unread_count, 0)` or accept a prop |
| P1-4 | Mobile layout completely broken — three fixed-width columns with no responsive breakpoints. | `app/demo/whatsapp/page.tsx:108-137` | Implement responsive column collapse (mobile shows list → thread → pipeline as sequential views) |

### P2 — Medium

| # | Issue | File | Fix |
|---|-------|------|-----|
| P2-1 | `custom_instructions` injected verbatim into system prompt — prompt injection risk if a provider account is compromised. | `lib/whatsapp-ai.ts:127-129` | Strip `[NEEDS_HUMAN:` patterns and role-override sequences; enforce server-side max 2000 char limit in config route |
| P2-2 | `brain/page.tsx` shows "Saved — Sofía will use this in her next reply" even when API fails and only localStorage was written. | `app/demo/whatsapp/brain/page.tsx:268-275` | Distinguish localStorage-only saves with a different flash message: "Saved locally (database unavailable)" |
| P2-3 | Booking stage colors (`text-yellow-700`, `text-green-700`) defined in `STAGE_CONFIG` but never applied — all active stages render identically in primary color. | `components/whatsapp/BookingPipeline.tsx:14-19` | Use DESIGN.md status tokens per stage: Lead (neutral), Quoted (status-pending), Confirmed (status-confirmed), Checked In (status-info), Closed (status-cancelled) |
| P2-4 | No sync between `booking_stage: 'closed'` and `status: 'closed'` — these can diverge in the UI and in the DB. | `app/demo/whatsapp/page.tsx:57-61` | When `updateStage('closed')` is called, also call `updateStatus('closed')` |
| P2-5 | Avatar emoji in PersonaTab is never persisted — resets on remount. | `components/whatsapp/AiSettingsPanel.tsx:361` | Add `persona_avatar` to `AiConfig` type and wire to config save, or remove the avatar picker |
| P2-6 | "Preview prompt" split-column (`grid-cols-2`) in Brain editor has no responsive handling — overflows on screens < 900px. | `app/demo/whatsapp/brain/page.tsx:361` | Add `lg:grid-cols-2` responsive breakpoint; below lg, show preview as a modal or below the form |
| P2-7 | Access token expiry not handled — expired tokens fail silently with no operator notification. | `lib/whatsapp/token.ts` | Add a connection health endpoint or surfaced error state in the Connection tab when sends fail |
| P2-8 | `STATUS_CONFIG` constant duplicated verbatim in `ConversationList.tsx` and `MessageThread.tsx`. | Both files | Extract to `lib/whatsapp-constants.ts` and import in both |
| P2-9 | Reply compose textarea (`MessageThread.tsx`) is only shown when `status === 'human'`. The "Take over" affordance for escalated/AI conversations is an `<a>`-styled link that is too small and easy to miss. | `components/whatsapp/MessageThread.tsx:249-254` | Replace the "Take over →" text link with a `<Button variant="outline" size="sm">` with a `User` icon |

### P3 — Low / Polish

| # | Issue | File | Fix |
|---|-------|------|-----|
| P3-1 | Refresh button in ConversationList header has no `onClick` handler. | `components/whatsapp/ConversationList.tsx:141` | Wire to a no-op with a toast "Live refresh not available in demo" or remove in demo mode |
| P3-2 | `groupedMessages()` useCallback result is called inline — memoization is wasted. | `components/whatsapp/MessageThread.tsx:153` | Change to `useMemo` with dependency on `selected?.messages` |
| P3-3 | Translation toggle shows `Show in English (?)` when `detected_lang` is null. | `components/whatsapp/MessageThread.tsx:82` | Fallback to `Show translation` (no parenthetical) when `detected_lang` is null |
| P3-4 | `RoomBuilder` uses `key={i}` — unstable key on deletion. | `app/demo/whatsapp/brain/page.tsx:119` | Use `key={room.name + i}` or assign a client-side uuid on add |
| P3-5 | `STAGE_CONFIG.color` property defined but never used in rendering. | `components/whatsapp/BookingPipeline.tsx:14-19` | Remove unused property or use it (see P2-3) |
| P3-6 | `addQuick` in InstructionsTab defines `sep` variable that is never used. | `components/whatsapp/AiSettingsPanel.tsx:913` | Remove the dead variable |
| P3-7 | `siteUrl` defaults to `''` — webhook URL shows as relative path if not passed. | `components/whatsapp/AiSettingsPanel.tsx:1062` | Default to `typeof window !== 'undefined' ? window.location.origin : ''` |
| P3-8 | Working hours uses hardcoded `UTC-4` comment — no tz label in UI. | `lib/whatsapp-hours.ts:13` | Add a UI note "Hours are in Venezuela time (UTC-4)" on the Availability tab |
| P3-9 | Status tab live stats show `—` with no explanation. | `components/whatsapp/AiSettingsPanel.tsx:249-253` | Replace `—` with `—` + tooltip/hint: "Live data requires Supabase connection" |
| P3-10 | `lib/whatsapp-context.ts` date utility functions (`toYMD`, `addDays`, etc.) duplicate helpers from other modules. | `lib/whatsapp-context.ts:15-42` | Extract to `lib/date-utils.ts` |

---

*Review complete. Files read: 15 source files + DESIGN.md. No files were modified.*
