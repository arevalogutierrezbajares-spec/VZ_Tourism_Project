# WhatsApp AI Agent -- Production Readiness
*Created: 2026-04-20 | Commit: ceff44bb*

---

## Status: E2E Verified, Not Yet Production-Ready

The full chatbot pipeline works end-to-end in dev. All test paths pass (happy path, language detection, escalation, dedup, non-text, webhook verification). The gap is Meta App configuration and real auth.

---

## P0 -- Blockers (before any real posada can test)

### 1. Create Meta Business App + Configure Embedded Signup
The Embedded Signup UI is built but the env vars are empty.

- [ ] Go to [developers.facebook.com](https://developers.facebook.com) and create a Business-type app
- [ ] Enable "WhatsApp" and "Facebook Login for Business" products on the app
- [ ] Facebook Login for Business > Settings > create a Configuration for WhatsApp Embedded Signup
- [ ] Copy values into Vercel env vars:
```
NEXT_PUBLIC_META_APP_ID=<your-app-id>
NEXT_PUBLIC_META_LOGIN_CONFIG_ID=<your-config-id>
META_APP_SECRET=<your-real-app-secret>
```
- [ ] Submit app for "Advanced Access" on `whatsapp_business_management` and `whatsapp_business_messaging` permissions (Meta review takes 1-5 business days)

### 2. Deploy to Vercel with Production Env Vars
Meta requires HTTPS for webhooks. Must be deployed.

- [ ] `vercel deploy --prod` or connect GitHub repo to Vercel
- [ ] Set all env vars in Vercel dashboard (copy from `.env.local`, replace dev values)
- [ ] **Remove or unset `DEV_SKIP_AUTH`** ... this is critical, it bypasses all authentication
- [ ] Verify the production build works: `npm run build` should pass clean

### 3. Configure Meta Webhook URL
After deploying, tell Meta where to send inbound messages.

- [ ] Meta App Dashboard > WhatsApp > Configuration > Webhook
- [ ] Set callback URL: `https://yourdomain.com/api/whatsapp/webhook`
- [ ] Set verify token: the one you'll generate during Embedded Signup (or a manually set one)
- [ ] Subscribe to: `messages` field

### 4. Real Auth Flow for Posada Owners
Currently all routes use `DEV_SKIP_AUTH`. Real posadas need:

- [ ] Supabase Auth configured (email/password or Google OAuth)
- [ ] Each posada owner creates an account
- [ ] Admin links their `auth.uid()` to a `providers` row via `providers.user_id`
- [ ] RLS policies already exist in migration 011 ... they just need real auth tokens to activate

### 5. Access Token Security (Supabase Vault)
WhatsApp access tokens are stored in plaintext in `posada_whatsapp_config.access_token`.

- [ ] Upgrade Supabase to Pro plan ($25/mo) if not already
- [ ] Enable `pgsodium` and `vault` extensions in Supabase dashboard
- [ ] Run the backfill block in `supabase/migrations/016_whatsapp_vault_tokens.sql` (currently commented out)
- [ ] Verify `getWhatsAppToken()` reads from Vault instead of plaintext

---

## P1 -- Should Fix for Real Testing

### 6. Escalation Notifications
When a conversation escalates (angry guest, HITL, bot question), the posada owner has no way to know. Options:
- [ ] WhatsApp notification to owner's personal number
- [ ] Email notification via Resend
- [ ] Push notification (requires PWA service worker)

### 7. Rate Limiter Persistence
In-memory `rateLimitMap` resets on Vercel cold starts. Not urgent for a few posadas but matters at scale.
- [ ] Sign up at [Upstash](https://upstash.com/) (free tier works)
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [ ] Refactor rate limiter to use Redis (same fix needed for other API routes, see TODO item #4 in Post-Wave6)

### 8. Groq API Limits
Free Groq tier: ~30 req/min. Multiple posadas with concurrent guests will hit this.
- [ ] Monitor usage at [console.groq.com](https://console.groq.com)
- [ ] Consider paid tier or add fallback to Anthropic Claude API (key already in env)

### 9. Meta Access Token Refresh
Meta access tokens expire. The current flow gets a token during Embedded Signup but has no refresh mechanism.
- [ ] Add a token refresh endpoint or background job
- [ ] Or use System User tokens (longer-lived, 60 days)

---

## P2 -- Before Wider Rollout

- [ ] Working hours timezone support (currently assumes server TZ)
- [ ] Conversation analytics dashboard (response time, resolution rate, escalation %)
- [ ] Manual reply from dashboard (send as human, auto-flip status to 'human')
- [ ] Multi-provider isolation testing (verify messages route correctly with 2+ posadas)
- [ ] Provider onboarding email flow (welcome email with setup instructions)

---

## Quick-Start Checklist: First Real Posada

```
[ ] Meta App created + Embedded Signup configured
[ ] Deployed to Vercel with HTTPS
[ ] DEV_SKIP_AUTH removed from production env
[ ] Meta webhook URL pointed at production domain
[ ] Posada owner has Supabase Auth account
[ ] Provider row linked to auth user
[ ] Posada owner completes Embedded Signup wizard
[ ] Meta sends test webhook (verify 200 response)
[ ] Send test WhatsApp message to posada number
[ ] Confirm AI reply arrives + shows in dashboard
```

---

## Files Changed (ceff44bb)

| File | Change |
|------|--------|
| `app/(provider)/dashboard/whatsapp/setup/page.tsx` | Embedded Signup UI + manual fallback |
| `app/api/whatsapp/embedded-signup/route.ts` | NEW: OAuth code exchange + WABA subscription |
| `lib/whatsapp/dev-auth.ts` | NEW: shared auth helper with dev bypass |
| `app/api/whatsapp/config/route.ts` | Refactored to dev-auth |
| `app/api/whatsapp/conversations/route.ts` | Refactored to dev-auth |
| `app/api/whatsapp/conversations/[id]/route.ts` | Refactored to dev-auth |
| `app/api/whatsapp/knowledge/route.ts` | Refactored to dev-auth |
| `app/api/whatsapp/send/route.ts` | Refactored to dev-auth |
| `app/api/whatsapp/test-reply/route.ts` | Refactored to dev-auth |
| `scripts/test-whatsapp-e2e.sh` | NEW: E2E test harness with HMAC signing |

---

## E2E Test Results (2026-04-20)

| Scenario | Pass |
|----------|------|
| Room pricing inquiry (Spanish) | Yes |
| Multi-question (English) | Yes |
| Angry guest + escalation keywords | Yes |
| Duplicate message dedup | Yes |
| Non-text message (image) | Yes |
| Webhook verification (wrong token) | Yes |
| Webhook verification (correct token) | Yes |
| Dashboard conversations API | Yes |
| Test-reply wizard preview | Yes |
| TypeScript compilation | Yes |
