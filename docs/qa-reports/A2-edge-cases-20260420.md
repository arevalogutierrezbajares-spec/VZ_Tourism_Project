# A2 — Edge Case Analysis
**Date:** 2026-04-20

---

## Booking Creation

### No availability check before booking is created
**File:** `app/api/bookings/route.ts` (entire POST handler)
The route inserts a booking record immediately with no check for conflicting bookings on the same listing and date range. Two guests can book the same listing for overlapping dates and both receive `status: 'confirmed'`. There is no unique constraint or availability query before insert.

### Listing becomes unavailable between date selection and payment
**File:** `app/api/bookings/route.ts:106–133`
The only pre-booking check is that the listing exists in the JSON file and has a price. There is no date-based availability query. A listing could be manually taken offline or fully booked, and the booking will still be created successfully. The guest will not be notified of a conflict at any point.

### `checkIn === checkOut` (zero-night booking) treated as 1 night silently
**File:** `app/api/bookings/route.ts:144–149`
```ts
const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / ...))
```
`Math.max(1, ...)` forces a minimum of 1 night. A same-day booking (checkout date equals check-in date) silently produces a 1-night charge with no validation error. The guest is billed for a night they did not intend.

### `guest_count` accepts 0 or negative — partially guarded
**File:** `app/api/bookings/route.ts:29–34, 137–142`
The Zod schema uses `.positive()` for both `guests` and `guest_count`, and the route validates against `min_guests`. However, the fallback `guest_count = parsed.data.guest_count ?? parsed.data.guests ?? 1` means if both are omitted they default to `1` silently. If the listing has `min_guests > 1`, the default of `1` will be correctly rejected, but if `min_guests` is 1 (the default), a booking for 1 guest is always accepted even if the caller intended to omit guest count deliberately.

### `maxGuests` exceeded — guarded
**File:** `app/api/bookings/route.ts:134–142`
This IS checked. The route reads `max_guests` from the listing and rejects the request. **Covered.**

### Guest booking their own listing — no check
**File:** `app/api/bookings/route.ts` (entire POST handler)
The route does not compare the authenticated user's ID against the listing's `provider_id`. A provider can book their own listing, pay themselves, and claim the commission. There is no ownership check anywhere in the booking flow.

### Double-tap / double-submit race condition on JSON fallback store
**File:** `lib/bookings-store.ts:43–82`
`createBooking` uses a read-then-write pattern on a flat JSON file (`data/bookings.json`) with no file locking or transaction. Two near-simultaneous POST requests can both read the same state, independently append a booking, and then the second write overwrites the first write's booking record. This is a data-loss race condition when Supabase is unavailable and the JSON store is the primary backend.

### Stripe checkout creation failure leaves booking in permanent `pending` state
**File:** `app/api/bookings/route.ts:216–241`
If `createCheckoutSession` throws (network error, Stripe down, invalid key), the error is logged and the function continues. The booking record has already been inserted with `status: 'pending'`. The API returns `checkout_url: null` with a `201` response. There is no TTL or cleanup job to cancel these orphaned `pending` bookings. The Stripe `checkout.session.expired` webhook will only fire if a session was successfully created.

---

## Payment Flows

### Stripe webhook fires before `POST /api/bookings` completes — low risk but present
**File:** `app/api/stripe/webhooks/route.ts:55–61`
The `checkout.session.completed` handler looks up `bookingId` from `session.metadata`. Because the booking is inserted in Supabase *before* the Stripe session is created (`app/api/bookings/route.ts:191–205`), the booking record should exist when the webhook arrives. However, the JSON fallback path does NOT store `discount_code_id` or `discount_amount_usd` at booking creation time — only at checkout session creation. If the webhook fires against a booking that only exists in the JSON store, `getBooking(bookingId)?.discount_amount_usd` returns `undefined`, and the discount usage counter will be incremented with a `$0` discount amount.

### Stripe webhook idempotency — not guarded for `checkout.session.completed` in tourism flow
**File:** `app/api/stripe/webhooks/route.ts:55–61`
The RUTA webhook (`app/api/ruta/webhooks/route.ts:55–59`) has an explicit idempotency check (`ride.stripe_payment_intent_id === session.payment_intent`). The tourism booking webhook has no such guard. If Stripe retries `checkout.session.completed`, the booking will be updated to `confirmed` again (idempotent for status, not harmful) **but** the discount code usage record will be inserted twice (`discount_code_uses` INSERT) and `increment_discount_code_use` RPC will be called twice, inflating `times_used` and `revenue` for the discount code.

### Stripe session expires but booking stays in `pending` forever (no Supabase fallback)
**File:** `app/api/stripe/webhooks/route.ts:84–106`
The `checkout.session.expired` handler cancels the booking in Supabase with `.eq('status', 'pending')`, which is correct. However, `session.metadata?.bookingId` is populated but `session.metadata?.booking_id` is also checked as a fallback. In `app/api/bookings/route.ts:226`, the metadata is set as `{ bookingId: booking.id }` (camelCase). The webhook handler reads both `bookingId` and `booking_id`. This is fine for the booking case, but the JSON fallback path `updateBookingStatus(bookingId, 'cancelled')` is called unconditionally after the Supabase update, even if the booking only exists in Supabase and the JSON store has no record. That is benign (returns null), but if the booking only exists in JSON (Supabase was down at creation time), the expired event will cancel it correctly via JSON path.

### Discount code reduces price to `$0` — Stripe will reject
**File:** `app/api/stripe/checkout/route.ts:33–67`, `lib/stripe/server.ts:47`
`net_total_usd` is clamped to `Math.max(0, ...)` in the validate route. If a fixed-amount code equals or exceeds the booking total, `chargeAmount` will be `0`. `createCheckoutSession` then calls `Math.round(0 * 100) = 0`, and Stripe's Checkout API rejects sessions with `unit_amount: 0`. This will throw an unhandled error at `stripe.checkout.sessions.create`, the `catch` block in `app/api/stripe/checkout/route.ts:85–88` will return a 500, and the guest sees "Failed to create checkout session" with a valid 100%-off discount code.

### Zelle payment confirmed by provider when booking was already guest-cancelled
**File:** `app/api/bookings/[id]/route.ts:88–149`
The PATCH route for bookings does not check payment method or enforce state machine transitions. A guest can cancel their own booking (setting `status: 'cancelled'`) while the provider simultaneously confirms Zelle payment (setting `status: 'confirmed'`). Whichever PATCH request arrives second wins. There is no guard preventing a cancelled booking from being moved back to confirmed.

---

## Discount Code System

### Race condition on `max_uses = 1` under concurrent requests
**File:** `app/api/discount-codes/validate/route.ts:64–69`
Validation reads `times_used` and checks `times_used >= max_uses` via a SELECT, then returns `valid: true`. The `times_used` increment only happens later in `app/api/stripe/webhooks/route.ts:75–78` via `increment_discount_code_use` RPC (which is presumably atomic). However, because validation and increment are in separate requests separated by the Stripe checkout flow, two users can both pass validation (both see `times_used = 0 < 1`), both create Stripe sessions, both pay, and the webhook increments `times_used` to 2. A `max_uses = 1` code can be used by multiple concurrent users. There is no database-level reservation (e.g., an optimistic lock or FOR UPDATE on the validation SELECT).

### Code expiry between validation and checkout completion
**File:** `app/api/discount-codes/validate/route.ts:49–54`, `app/api/stripe/webhooks/route.ts:64–79`
Validation checks `expires_at < now()`. If the code expires between validation (which returned `valid: true`) and the Stripe payment completing, the discount is still applied. The webhook handler does not re-validate expiry before incrementing `times_used` and recording the discount. A guest could use a code that expired seconds before they paid.

### Same code submitted twice in rapid succession to `/api/discount-codes/validate`
**File:** `app/api/discount-codes/validate/route.ts`
The validate endpoint is stateless — it only reads and never writes. Calling it twice produces the same result twice, which is by design. The race condition is at the increment step (webhook), not here. **Not a bug in this file specifically**, but the overall system relies on atomicity of the RPC that is triggered asynchronously at webhook time.

### `booking_total_usd` is `.positive()` in validate schema — free bookings blocked
**File:** `app/api/discount-codes/validate/route.ts:8`
```ts
booking_total_usd: z.number().positive(),
```
If a listing ever has a `total_usd` of exactly `$0.00` (e.g., a free experience), discount validation will return a 400 error because `0` fails `.positive()`. This will surface as a generic validation error in the checkout flow.

---

## Auth Flows

### OAuth callback with invalid/expired code — redirects to login with generic error
**File:** `app/(auth)/callback/route.ts:16–42`
`exchangeCodeForSession(code)` will throw or return an error if the code is invalid or expired. The `if (!error && data.session)` check will be falsy, and the route falls through to `redirect('/login?error=auth_callback_failed')`. The login page shows "Sign-in failed. Please try again." — **this is handled** but only with a generic error. The user is not told whether the link expired or was already used.

### User registers with email that already exists
**File:** `app/(auth)/register/page.tsx:56–67`
`supabase.auth.signUp()` with a duplicate email returns an error. The error is caught and shown via `toast.error(message)`. Supabase returns a deliberately vague message ("User already registered") rather than confirming the email exists (to prevent enumeration). This is handled but the UX is a toast with no guidance to go to login. **Functionally handled.**

### Email confirmation link expires mid-registration
**File:** `app/(auth)/register/page.tsx:70–73`
After `signUp()` succeeds, the code does `router.push('/')` immediately. If the user never clicks the confirmation email and the link expires, they will have an unconfirmed account. There is no UI feedback that email confirmation is required, and there is no resend confirmation email flow anywhere in the codebase (`login/page.tsx` has "Forgot password?" that shows `toast('Password reset coming soon')` — no resend confirmation option either). Unconfirmed users are silently in a broken state.

### No rate limiting on login attempts
**File:** `app/(auth)/login/page.tsx:49–70`
The login form has no client-side or server-side rate limiting on password attempts. Supabase's built-in rate limiting applies, but there is no UI-level lockout or CAPTCHA. Combined with the demo account bypass (`signInAsDemo` at line 81) which sets auth state in Zustand only without a real Supabase session, a user logged in as Demo can call authenticated API endpoints — the server-side `createClient().auth.getUser()` call will return `null` for a demo session because no real Supabase cookie is set. This means the demo user flow is effectively broken for any server-side protected route.

### User is mid-registration and their session expires — no handling
**File:** `app/(auth)/register/page.tsx`
The registration is a single client-side form submission. There is no session to expire mid-registration (no multi-step server state). If the Supabase client token expires while the user is filling the form, the `signUp()` call will still work because signUp does not require an existing session. **Not a real edge case here.**

---

## Provider Dashboard

### Provider accepts a booking already cancelled by the guest
**File:** `components/provider/ProviderBookingActions.tsx:33–54`, `app/api/bookings/[id]/route.ts:71–149`
The provider PATCH route does not enforce a valid state machine. A provider can move a booking from `cancelled` to `confirmed` via `PATCH /api/bookings/:id` with `{ status: 'confirmed' }`. The `validStatuses` array includes `confirmed`, and there is no guard preventing a transition from `cancelled → confirmed`. The dialog message says "No actions available" for cancelled bookings in the UI (`ProviderBookingActions.tsx:96–98`), but the API endpoint enforces no such restriction.

### Guest not notified and no refund triggered when provider cancels a confirmed booking
**File:** `components/provider/ProviderBookingActions.tsx:33–54`
When a provider cancels a confirmed booking, `updateStatus('cancelled')` fires a PATCH request that sets `status: 'cancelled'`. There is no email sent to the guest (the booking POST sends an initial confirmation email, but the PATCH handler sends no emails at all). There is also no Stripe refund initiated — `payment_intent_id` is on the booking record but the PATCH route makes no Stripe API call. The guest's card is charged and stays charged.

### Provider dashboard shows ALL bookings, not scoped to provider's own listings
**File:** `app/(provider)/dashboard/bookings/page.tsx:97`
```ts
const allBookings = getAllBookings().sort(...)
```
`getAllBookings()` returns every booking in the JSON store regardless of `provider_id`. Any authenticated user with a provider role can see every guest's name, email, phone, booking details, and confirmation codes. This is a P0 data exposure issue. The Supabase-backed path also does not filter by the authenticated provider's listings — the page never queries Supabase for bookings scoped to the current provider.

### Two providers accepting the same booking simultaneously
**File:** `app/api/bookings/[id]/route.ts:110–133`
The PATCH handler does a fetch-then-update with an ownership check (`guest_email !== user.email`), but this check is for the *guest*, not the provider. The route authenticates the user and checks that the booking's `guest_email` matches `user.email`. This means a provider cannot use this endpoint to update a booking at all unless they share the guest's email — the ownership check is inverted for provider use. Either providers can't actually confirm bookings via the API (the UI calls the same endpoint), or the provider dashboard is using an unauthenticated path. Given that `ProviderBookingActions` calls `fetch('/api/bookings/${bookingId}', { method: 'PATCH' })`, this will return 401 for any logged-in provider because their email won't match the guest's email.

---

## WhatsApp AI

### Groq API timeout — webhook returns 200 to WhatsApp (retry suppressed correctly)
**File:** `app/api/whatsapp/webhook/route.ts:118–125`
The webhook handler immediately returns `NextResponse.json({ status: 'ok' })` before processing begins. `waitUntil(processInbound(...))` runs the AI pipeline asynchronously. If Groq times out, the WhatsApp platform will NOT retry (it already got a 200). This is the correct behavior for preventing duplicate messages. However, the guest receives **no response** if Groq times out — there is no fallback message or error handling in `generateReply` that would send an "I'm having trouble right now" message. `generateReply` throws `new Error('Empty response from Groq')` and the catch in `processInbound` only logs the error (`console.error`).

**File:** `lib/groq.ts`
There is no timeout set on the Groq SDK call itself. The `groq.chat.completions.create()` call in `lib/whatsapp-ai.ts:208` has no `signal` or timeout. The WhatsApp API call in `lib/whatsapp-api.ts:25` has an 8s timeout. If Groq hangs indefinitely, `waitUntil` will hold the Vercel function alive until the platform's maximum execution duration.

### Same message delivered twice (WhatsApp deduplication)
**File:** `app/api/whatsapp/webhook/route.ts:183–186`
Step 3 checks `wa_message_id` against `wa_messages` with a `count` query before processing. If `count > 0`, the message is skipped. **This is handled correctly.** Duplicate webhook deliveries are deduplicated.

### AI response longer than WhatsApp's 4,096 character limit
**File:** `lib/whatsapp-ai.ts:208–218`, `lib/whatsapp-api.ts:53–64`
`generateReply` sets `max_tokens: 400` for non-brief configs, which keeps responses well under 4,096 characters in most cases. However, the `sendWhatsAppText` function in `lib/whatsapp-api.ts` passes `opts.body` directly to the WhatsApp API with no length check or truncation. If the model returns a longer-than-expected response (possible at 400 tokens), the WhatsApp Cloud API will return a 400 error. `sendAndPersist` logs the error but does not retry with a truncated message — the guest receives nothing. The message is still persisted to `wa_messages` so the provider can see it, but it is never delivered.

### Knowledge base is empty — AI still responds using provider description fallback
**File:** `lib/whatsapp-ai.ts:136–142`
When `knowledge` is `null`, `buildSystemPrompt` uses `providerDescription` as a fallback:
```ts
: `\nAbout the property:\n${providerDescription}\n`
```
The AI will still respond using whatever is in `providers.description`. If that field is also empty or generic, the AI will either hallucinate details or send a NEEDS_HUMAN escalation. This is acceptable degradation but could produce confident-sounding incorrect answers about pricing/availability if the provider description contains stale data.

### In-memory rate limiter resets on serverless cold starts
**File:** `app/api/whatsapp/webhook/route.ts:41–50`
`rateLimitMap` is a module-level `Map`. On serverless platforms (Vercel), each cold start creates a new Map instance. A user who sends 19 messages, triggers a cold start, and sends 19 more will never hit the 20-message rate limit. Rate limiting is effectively non-functional in serverless deployments.

### Non-text messages (images, voice notes) trigger Groq despite the early return
This is handled correctly — `messageType !== 'text'` returns after sending an acknowledgment. **Covered.**

---

## RUTA

### Distance calculation fails (Mapbox down) — haversine fallback applied silently
**File:** `lib/ruta/pricing.ts:177–195`
If Mapbox is down, the code falls back to haversine distance with a `1.4x` road factor and `distance * 1.5` for duration. The quote returned to the user gives no indication that it is an estimate. The server-side price re-validation in `app/api/ruta/checkout/route.ts:38–57` re-runs `calculateQuote`, which will also use the haversine fallback if Mapbox is still down. Both the displayed quote and the validation quote use the same fallback, so the 5% delta check will pass. However, haversine can significantly under- or overestimate actual road distance in Venezuela's terrain (mountain routes, coastal roads), potentially producing quotes 30–50% off from actual pricing. No user-visible warning is shown.

### No drivers available at requested time — no check before booking
**File:** `app/api/ruta/checkout/route.ts:82–103`, `app/api/ruta/dispatch/assign/route.ts`
Driver availability is checked by the dispatcher after the ride is confirmed. The booking flow (`/api/ruta/checkout`) creates the ride record immediately without querying `ruta_drivers` for availability at `scheduled_at`. A passenger can book and pay for a ride at a time when no drivers are available. There is no pre-booking availability check. The dispatcher must then manually assign, and if no driver is free, there is no automated refund trigger — the dispatcher must manually handle it.

### Quote price staleness — `expires_at` is returned but never enforced server-side
**File:** `lib/ruta/pricing.ts:226`, `app/api/ruta/checkout/route.ts:49–55`
Each quote includes `expires_at: new Date(Date.now() + 15 * 60 * 1000)`. The checkout route re-validates price using `calculateQuote` and rejects if `priceDelta > 0.05`. This is a good guard. However, if `calculateQuote` throws during re-validation (Mapbox + DB both down), the submitted price is accepted unconditionally:
```ts
} catch {
  console.warn('Price re-validation failed, accepting submitted price')
}
```
A tampered client could submit an artificially low `price_quoted_usd` during a window when Mapbox is unavailable and bypass the price check entirely.

### Zelle confirmation does not verify the amount paid matches the quoted price
**File:** `app/api/ruta/zelle-confirm/route.ts:10–11`
The `verified_amount_usd` parameter is accepted in the request body but is never compared against `ride.price_quoted_usd`. A dispatcher could confirm a Zelle payment for $10 on a $200 ride with no validation error. The `verified_amount_usd` is not stored on the ride record either.

### RUTA Stripe webhook returns 500 when database is unavailable — triggers retries
**File:** `app/api/ruta/webhooks/route.ts:27–31`
```ts
if (!supabase) {
  return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
}
```
Returning 500 to Stripe causes Stripe to retry the webhook with exponential backoff. If Supabase is temporarily unavailable, the ride will eventually be confirmed on a retry (idempotency check exists). But repeated 500s for a misconfigured Supabase will fill Stripe's webhook retry queue and trigger failure alerts. The tourism booking webhook has the same pattern: `createServiceClient()` returns null only if env vars are missing (permanent) rather than a transient DB error, so this is low probability but real.

---

## Priority Issues

### P0 (exploitable or data-corrupting)

**[P0-1] Provider dashboard exposes all guests' bookings**
`app/(provider)/dashboard/bookings/page.tsx:97` — `getAllBookings()` returns every booking with no provider scoping. Any authenticated provider sees all guest PII (name, email, phone, booking codes).

**[P0-2] Provider booking PATCH ownership check is inverted**
`app/api/bookings/[id]/route.ts:121` — The route checks `booking.guest_email !== user.email`, blocking providers (who aren't the guest) from updating bookings. Provider "Confirm" and "Cancel" buttons in the dashboard silently fail with 401. This means no booking can ever be confirmed or cancelled through the provider UI.

**[P0-3] Double-payment via discount code race condition (max_uses = 1)**
`app/api/discount-codes/validate/route.ts:64–69` — Two concurrent users can both pass `max_uses = 1` validation, create Stripe sessions, pay, and the code's usage counter increments to 2. Code is effectively used twice.

**[P0-4] Guest booking own listing — no check**
`app/api/bookings/route.ts` — Provider can book their own listing and pocket both the guest payment and receive the net provider payout.

### P1 (likely to hit in production)

**[P1-1] No availability check — double bookings**
`app/api/bookings/route.ts` — Two guests can confirm overlapping dates on the same listing. Will occur as soon as a popular listing has two simultaneous interested guests.

**[P1-2] Stripe session creation fails → orphaned pending bookings**
`app/api/bookings/route.ts:216–241` — On any Stripe error, booking is stuck in `pending` forever with no cleanup mechanism.

**[P1-3] Provider cancels confirmed booking → no refund, no guest notification**
`components/provider/ProviderBookingActions.tsx` — Cancellation from provider side silently cancels with no Stripe refund call and no email to guest.

**[P1-4] `$0` checkout via 100% discount code crashes Stripe session creation**
`app/api/stripe/checkout/route.ts:47` — `unit_amount: 0` is rejected by Stripe with an unhandled error.

**[P1-5] Groq timeout → guest receives no reply, no fallback message**
`lib/whatsapp-ai.ts:197–218` — On Groq timeout or empty response, `generateReply` throws and the catch in `processInbound` logs and swallows the error. Guest is left waiting with no response.

**[P1-6] Demo account bypasses real auth — server routes return 401**
`app/(auth)/login/page.tsx:81–88` — Demo login sets client-side Zustand state but creates no Supabase session cookie. Any server-side protected route will return 401 for demo users.

### P2 (uncommon but real)

**[P2-1] `checkIn === checkOut` silently billed as 1 night**
`app/api/bookings/route.ts:146` — Same-day booking treated as 1 night with no warning.

**[P2-2] Stripe webhook fires twice → discount code `times_used` inflated**
`app/api/stripe/webhooks/route.ts:64–79` — No idempotency guard on discount code increment; Stripe retry increments counter twice.

**[P2-3] Provider cancels a cancelled booking via direct API PATCH**
`app/api/bookings/[id]/route.ts` — No state machine enforcement; cancelled → confirmed transition is possible via direct API call.

**[P2-4] Zelle confirmation accepts any amount without matching quoted price**
`app/api/ruta/zelle-confirm/route.ts` — `verified_amount_usd` is ignored; dispatcher can confirm partial payments.

**[P2-5] WhatsApp rate limiter resets on cold start**
`app/api/whatsapp/webhook/route.ts:41–50` — In-memory Map is ephemeral; rate limit is ineffective on serverless platforms.

**[P2-6] RUTA: no driver availability check before booking payment**
`app/api/ruta/checkout/route.ts` — Passenger pays for a ride with no guarantee a driver is available at the scheduled time.

**[P2-7] Quote price validation bypassed when Mapbox + DB are both unavailable**
`app/api/ruta/checkout/route.ts:56–59` — `catch` block accepts any submitted price unconditionally on calculation failure.

### P3 (theoretical)

**[P3-1] Unconfirmed email — no resend flow, accounts stuck in limbo**
`app/(auth)/register/page.tsx` — Users who never confirm email and whose link expires have no path to recover. No resend confirmation UI exists.

**[P3-2] JSON bookings-store read-write race condition**
`lib/bookings-store.ts:43–82` — Concurrent writes can result in one write overwriting another when Supabase is unavailable. Low probability on hosted deployments.

**[P3-3] WhatsApp AI response exceeds 4,096 chars — silent delivery failure**
`lib/whatsapp-api.ts:53–64` — Unlikely at `max_tokens: 400` but possible; no length guard before sending.

**[P3-4] Discount code valid-then-expired between validation and Stripe completion**
`app/api/discount-codes/validate/route.ts:49–54` — Code expires after validation returns but before webhook fires; discount applied to expired code.

**[P3-5] `booking_total_usd: .positive()` blocks $0 listings from applying discount codes**
`app/api/discount-codes/validate/route.ts:8` — Free listings cannot go through discount validation at all.
