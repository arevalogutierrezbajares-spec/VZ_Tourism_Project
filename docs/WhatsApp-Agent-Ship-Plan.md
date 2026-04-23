# WhatsApp AI Agent — Ship Readiness Plan

**Date:** 2026-04-23
**Goal:** Close all gaps so a posada client can self-setup and test the WhatsApp AI agent end-to-end.

---

## Status: What's Built

| Feature | Status | Notes |
|---------|--------|-------|
| 7-step setup wizard | Done | Embedded signup + manual fallback |
| AI replies (multilingual) | Done | Groq LLM, auto-detect language, reply in kind |
| Topic guard | Done | Blocks off-topic, adversarial, harmful messages |
| Knowledge base ("Brain") | Done | 8 sections + dynamic pricing |
| Conversation dashboard | Done | Real-time, search, status mgmt, translation |
| Quick reply templates | Done | API + inline picker in chat |
| Escalation system | Done | Sentiment, bot-question, HITL, operator notify |
| Analytics dashboard | Done | 30-day KPIs, charts |
| Working hours | Done | Per-day schedule + after-hours message |
| Sentiment analysis | Done | Bilingual ES/EN keyword scoring |
| Booking handoff | Done | Create booking button in conversation |
| CRM placeholder | Done | Empty state with future description |

---

## Remediation Items

### P0 — Blockers

#### P0-1: Meta Embedded Signup Config
**Problem:** `NEXT_PUBLIC_META_APP_ID` and `NEXT_PUBLIC_META_LOGIN_CONFIG_ID` are not set. Embedded Signup button will fail — client can only do manual setup.
**Fix:** Environment config only. Client provides their Meta App credentials, or we set up a shared VAV Meta Business app.
**Action:** Document in client setup guide. Not a code fix.

#### P0-2: Groq Free Tier Token Limit
**Problem:** 100K tokens/day across ALL calls (translation + AI reply = ~4 Groq calls per message). ~50-80 conversations before AI goes silent.
**Fix:** Upgrade Groq to Dev tier ($0.10/M tokens) OR add a second LLM provider as fallback.
**Action:** Document requirement. Upgrade API key before client testing.

---

### P1 — Config Promises Not Wired

#### P1-1: Escalation Keywords Not Checked
**Problem:** `escalation_keywords[]` is stored in config and editable in Settings UI, but the webhook never checks inbound messages against them.
**Where:** `app/api/whatsapp/webhook/route.ts` — after sentiment check, before AI reply.
**Fix:** Add keyword matching in `handleMessage()`. If any keyword matches, escalate conversation + notify operator.
**Files:** `app/api/whatsapp/webhook/route.ts`

#### P1-2: Sentiment Threshold Hardcoded
**Problem:** Config stores `sentiment_threshold` (default 0.3), UI has a slider, but `sentiment.ts` uses hardcoded `score < 0.45` to flag.
**Where:** `lib/sentiment.ts:93` — `const flagged = score < 0.45`
**Fix:** Pass `config.sentiment_threshold` into `analyzeMessage()` or check it in the webhook after calling `analyzeMessage()`.
**Files:** `app/api/whatsapp/webhook/route.ts`

#### P1-3: Analytics Provider Filter on Escalations
**Problem:** Analytics page queries `wa_escalations` without filtering by provider. In multi-tenant, would show other providers' escalations.
**Where:** `app/(provider)/dashboard/whatsapp/analytics/page.tsx:96` — escalation query has no provider filter.
**Fix:** Filter escalations by joining through `wa_conversations.provider_id` or filtering by conversation IDs.
**Files:** `app/(provider)/dashboard/whatsapp/analytics/page.tsx`

---

### P2 — Polish

#### P2-1: Remove or Implement Value Escalation
**Problem:** `value_escalation_usd` is in the config schema and Settings UI but never triggers.
**Fix:** Remove from UI to avoid confusion. Can implement later.
**Files:** `components/whatsapp/AiSettingsPanel.tsx`

#### P2-2: Topic Guard — Strengthen Edge Cases
**Problem:** Current guard uses regex patterns. Sophisticated adversarial prompts may bypass.
**Fix:** Add more patterns, test edge cases. Consider adding a lightweight Groq-based classifier as second layer.
**Files:** `lib/whatsapp-topic-guard.ts`

#### P2-3: Fallback Message Language
**Problem:** Error fallback messages ("We're experiencing a brief delay...") are hardcoded in English/Spanish. Should match guest's detected language.
**Where:** `app/api/whatsapp/webhook/route.ts:449-451`
**Fix:** Use detected language to pick fallback message language.
**Files:** `app/api/whatsapp/webhook/route.ts`

---

## Client Setup Guide

### Prerequisites
1. A WhatsApp Business account (Meta Business Suite)
2. A Meta Developer account with a WhatsApp Business API app
3. A phone number registered for WhatsApp Business API

### Step-by-Step

#### 1. Get Access Credentials from Meta
- Go to [developers.facebook.com](https://developers.facebook.com) → Your App → WhatsApp → API Setup
- Copy your **Phone Number ID** (numeric, e.g., `1128083767048671`)
- Generate a **Permanent Access Token** (System User token, not temporary)
  - Go to Business Settings → System Users → Generate Token
  - Select your WhatsApp app, grant `whatsapp_business_messaging` permission

#### 2. Run the Setup Wizard
- Log into your VAV dashboard
- Navigate to **WhatsApp** → **Setup**
- Follow the 7-step wizard:

| Step | What to do |
|------|------------|
| 1. Welcome | Read requirements, click Start |
| 2. Connect | Paste Phone Number ID + Access Token. Copy the webhook URL and verify token shown. |
| 3. Persona | Name your AI (e.g., "Sofia"), pick tone and language |
| 4. Knowledge | Fill in: property description, rooms + prices, amenities, policies, FAQs |
| 5. Hours | Set when AI should respond. Configure after-hours message. |
| 6. Test | Send a test message, verify the AI reply looks correct |
| 7. Go Live | Toggle "Activar agente" and click activate |

#### 3. Configure Webhook in Meta Dashboard
- Go to developers.facebook.com → Your App → WhatsApp → Configuration
- Set **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
- Set **Verify Token**: (copied from Step 2 in the wizard)
- Subscribe to: `messages` webhook field

#### 4. Test End-to-End
- Send a WhatsApp message to your business number from a personal phone
- Verify AI responds within ~10 seconds
- Test: greeting, room availability question, booking request, off-topic message

#### 5. Ongoing Management
- **Dashboard** → Monitor conversations, take over from AI, close conversations
- **Brain** → Update room prices, policies, FAQs anytime
- **Settings** → Adjust AI personality, escalation rules, working hours
- **Analytics** → Review message volume, AI automation rate, escalation reasons

### Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| No AI reply | Token expired | Generate new token in Meta Dashboard, update in Settings |
| AI replies in wrong language | tone_language set to ES/EN instead of auto | Change to "Auto-detect" in Settings |
| AI answers off-topic questions | Topic guard gap | Report to dev team, we'll add pattern |
| "Brief delay" fallback sent | Groq rate limit or error | Check Groq dashboard for quota |
| Messages not arriving | Webhook disconnected | Re-verify webhook URL in Meta Dashboard |

---

## Acceptance Criteria

- [ ] Client can complete setup wizard without developer help
- [ ] AI responds in the guest's language (ES, EN, IT, PT, FR tested)
- [ ] Off-topic/adversarial messages get deflected, not answered
- [ ] Escalation keywords trigger notification to operator
- [ ] Sentiment threshold respects configured value
- [ ] Analytics show correct data scoped to the provider
- [ ] Access token doesn't expire daily (permanent token or Embedded Signup)
