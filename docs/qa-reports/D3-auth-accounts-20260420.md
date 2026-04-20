# D3 — Auth + Accounts UX/UI Review
**Date:** 2026-04-20
**Pages Reviewed:** Login, Register, Provider Register, Account Settings, Messages, Demo Login (login/page.tsx + AuthModal)
**Reviewer:** Senior UX/UI + Frontend (automated audit)

---

## Executive Summary

The auth flows are structurally solid: Zod validation, inline error messages, aria attributes, 44px touch targets, show/hide password toggles, and focus trap in the modal are all implemented. The Google OAuth callback is robust with upsert logic to prevent race conditions on first login.

However, there are **several significant gaps** against DESIGN.md and Airbnb-quality standards:

1. **No password reset.** "Forgot password?" shows a toast pointing users to "contact support." This is a P0 friction point that blocks real-user auth.
2. **Auth layout uses hardcoded sky/blue palette** instead of DESIGN.md's OKLCH teal-primary system.
3. **Provider register is crammed into `max-w-md`** (same auth layout as login), making a 9-field form awkward and scroll-heavy.
4. **Provider DB insert failure is silently swallowed** — the user gets a success toast even if the `providers` row failed to create.
5. **Account Settings uses `bg-sky-500` throughout** (hardcoded Tailwind, not design tokens).
6. **Messages is a WhatsApp redirect layer, not a real inbox** — unclear to users that "Messages" means "open WhatsApp."
7. **Demo login persona is "Tomas Demo"** — developer placeholder name visible in production UI.
8. **No post-registration email verification UX** — neither tourist nor provider registration mentions the email confirmation Supabase sends.

---

## Login Page

**File:** `app/(auth)/login/page.tsx`

### What works
- Form structure is clean: Google first, then Demo, then email/password (lines 106–198).
- `autoComplete="email"` and `autoComplete="current-password"` are set correctly (lines 149, 176).
- `aria-invalid`, `aria-describedby`, and `role="alert"` are all wired up (lines 150–155, 177–192).
- Show/hide password toggle with correct `aria-label` (lines 181–188).
- Error banner from `?error=` query param handles `auth_callback_failed` (lines 98–104).
- `redirectTo` / `next` param correctly read and passed through OAuth callback (line 35, 78).
- `min-h-[44px]` on all action buttons meets touch target requirement.

### Issues

**P0 — Forgot password is a dead end (login/page.tsx:165)**
```tsx
onClick={() => toast('Password reset coming soon. Contact support for help.', { icon: 'ℹ️' })}
```
Clicking "Forgot password?" fires a toast. There is no `app/(auth)/forgot-password/` route, no `supabase.auth.resetPasswordForEmail()` call anywhere in the codebase. Users who cannot remember their password have no self-service recovery path.

**P1 — Auth layout background diverges from DESIGN.md (layout.tsx:6)**
```tsx
bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-950 dark:to-gray-900
```
DESIGN.md specifies OKLCH warm neutrals with primary = teal-blue (`oklch(0.55 0.18 220)`). The sky/blue gradient is close but uses Tailwind named colors rather than design tokens. In dark mode it flips to `gray-950`/`gray-900` which is neutral grey, not the warm-shifted dark palette specified in DESIGN.md.

**P1 — Error alert uses hardcoded red (login/page.tsx:99)**
```tsx
className="bg-red-50 border border-red-200 text-red-700 ..."
```
DESIGN.md defines an error semantic token (`oklch(0.577 0.245 27)` = warm red). Should use `bg-destructive/10 border-destructive/30 text-destructive` to respect the design system and dark mode.

**P2 — Demo button copy and persona are developer-facing**
The demo button (line 127) says "✨ Try Demo Account" with emoji in the login page, but the AuthModal version (AuthModal.tsx:238) uses a Sparkles Lucide icon correctly. The login page uses a raw ✨ emoji — inconsistent and DESIGN.md specifies "no emoji in UI" in the Aesthetic Direction. More critically, `signInAsDemo` sets `full_name: 'Tomas Demo'` (login/page.tsx:23) — a developer's real first name visible to all real users in the nav avatar dropdown.

**P2 — Google OAuth button and Demo button have no visual hierarchy distinction**
Both use `variant="outline"`. Google is the trusted social method; Demo is a throwaway sandbox. Their visual weight is identical. Google should have slightly higher visual prominence (e.g., solid border, no background fill). Demo should be visually secondary (lighter styling) to avoid users clicking Demo when intending Google.

**P2 — No loading spinner on Google OAuth button during redirect**
Email/password shows `isLoading` state correctly, but `signInWithGoogle` (line 72–79) has no loading state. After clicking, the button remains static while the OAuth redirect processes. This is confusing on slow connections.

**P3 — `CardHeader` is center-aligned but body copy below is left-aligned** (lines 91–95)
Header "Welcome back" + description are `text-center`, but the form fields below are left-aligned. This creates an inconsistent axis. Airbnb login uses left-aligned everything.

---

## Registration

**File:** `app/(auth)/register/page.tsx`

### What works
- Password strength meter exists and works (lines 18–31, 230–247), with score 1–5 and color feedback.
- Inline validation errors are rendered adjacent to each field (not on submit only).
- `autoComplete` attributes on all fields (name, email, new-password, tel, country-name).
- Terms checkbox wired to Zod validation.
- Form has both name, email, password, confirm password — appropriate length for initial signup.

### Issues

**P0 — No post-registration email verification UX (register/page.tsx:70–72)**
```tsx
toast.success('Account created! Welcome to VZ Explorer!');
router.push('/');
```
Supabase sends an email confirmation. The code immediately pushes to `/` and shows a success toast, but gives no indication that the user needs to verify their email. Users will expect to be logged in, then find they cannot access protected routes. There should be a success state that says "Check your email and click the verification link."

**P1 — No Google OAuth on the registration page**
The login page has "Continue with Google" as the primary CTA. The registration page has email-only. This creates a disconnect: a user who tries to sign up and clicks the Google button on login will create an unlinked account. Registration should also offer Google OAuth for consistency.

**P1 — Password and Confirm fields are in a 2-column grid on mobile (register/page.tsx:120–172)**
```tsx
<div className="grid grid-cols-2 gap-4">
```
On a 360px phone, each password input is ~160px wide. The show/hide eye button overlaps with the input content. This is broken on mobile. The password pair should stack vertically on small screens: `grid grid-cols-1 sm:grid-cols-2`.

**P1 — Phone/Nationality in a 2-column grid on mobile (lines 174–195)**
Same issue as above — these fields are in `grid-cols-2` with no responsive breakpoint. On mobile, both fields are too narrow.

**P2 — Password strength bar uses hardcoded Tailwind status colors (lines 27–31)**
`bg-red-500`, `bg-orange-500`, `bg-yellow-500`, `bg-green-500`, `bg-green-600` are all hardcoded. DESIGN.md v0.3.5 defines semantic status tokens (`bg-status-cancelled`, `bg-status-pending`, `bg-status-confirmed`). Should map to those tokens.

**P2 — Terms links point to `href="#"` (register/page.tsx:205, 207)**
The Terms of Service and Privacy Policy links are dead (`<Link href="#">`). Users cannot read what they're agreeing to. These should link to real pages or at minimum open a modal with placeholder content.

**P3 — "Nationality" field is confusing — it's an open text input**
`placeholder="Venezuelan"` suggests a single string. International travelers won't know their nationality string format. Should be a `<select>` from a country list (the `COUNTRIES` array already exists in account/page.tsx).

**P3 — Required fields use asterisk `*` in labels but there is no legend explaining it**
E.g. `Full name *`, `Email *`. WCAG recommends a note like "* Required" near the form top.

---

## Provider Registration

**File:** `app/(auth)/provider-register/page.tsx`

### What works
- Correct separate flow from tourist registration, accessible via login page footer link and footer nav.
- Collects business-specific data: business name, region, description, RIF, Instagram, website.
- Password strength not shown but all other field validations mirror tourist form.
- `autoComplete="organization"` on business name (line 112).

### Issues

**P0 — Provider DB insert failure is silently ignored (provider-register/page.tsx:65–79)**
```tsx
if (providerError) console.error('Provider creation error:', providerError);
```
If the `providers` table insert fails (e.g., RLS policy, network error, missing field), the error is only logged to the console. The user receives a success toast: `"Provider account created! We'll review your application shortly."` Their auth account is created but their `providers` row is missing. They'll be logged in as a user without provider capabilities, with no way to know something went wrong.

**P1 — Form is constrained to `max-w-md` via the shared auth layout (layout.tsx:9)**
The auth layout wrapper is `w-full max-w-md`. The provider registration form has 9+ fields across multiple 2-column grids. At `max-w-md` (448px), the 2-col grids produce inputs only ~196px wide — too narrow for a business description textarea. The provider register should have its own wider layout (e.g., `max-w-lg` or `max-w-2xl`) or use the shared layout with a wider override.

**P1 — No onboarding step after registration**
After successful registration, the user is redirected to `/dashboard` (line 79). There is no welcome/verification screen, no explanation of the review process, no indication of what happens next ("We'll review your application" is in the toast only — it disappears after 4s). The `/onboard/[slug]` route exists for listing setup but is not linked from provider registration.

**P1 — 2-column grids are not responsive (lines 97–107, 144–155, 156–187, 189–198)**
All `grid-cols-2` grids have no `sm:` prefix. On mobile, all field pairs are half-width. The description textarea in particular shares a row with nothing but is fine, but the full_name/phone pair, email/rif pair, password/confirm pair, and instagram/website pair are all cramped on mobile.

**P2 — `acceptTerms` error is not associated with an `id` for screen readers (lines 200–213)**
The Checkbox has `id="acceptTerms"` and the error below (line 211) has no `id` or `aria-describedby` linkage. Compare to tourist register which also lacks this but the checkbox is still semantically linked via `htmlFor`.

**P2 — Terms links are `href="#"` (lines 207, 209)**
"Provider Terms" and "Commission Structure" both point to `#`. Same issue as tourist registration.

**P3 — RIF field has no explanation or format hint**
`placeholder="J-12345678-9"` is the only hint. International providers may not know what a RIF is. A short helper text like "Venezuelan tax ID (optional for foreign operators)" would reduce abandonment.

**P3 — Description min-length is 50 characters but this is not communicated to the user**
The Zod schema enforces `min(50)` (validators.ts:32) but the textarea placeholder does not mention a minimum. Users who type a short description will hit an error only on submit.

---

## Demo Login

**Demo button locations:**
- `app/(auth)/login/page.tsx` — lines 123–132 (page-level)
- `components/common/AuthModal.tsx` — lines 231–240 (inline modal)

### What works
- Demo login is instantly accessible from the login page and the AuthModal (triggered by any protected action).
- No password or form required — single click.
- Auth state is set correctly in the Zustand store (user + profile + loading + initialized).
- `use-auth.ts` correctly short-circuits Supabase session checks for `demo-user-001` (lines 116–121).
- The demo user persists across page reloads via Zustand persist middleware.

### Issues

**P1 — Demo persona name is "Tomas Demo" (login/page.tsx:23, AuthModal.tsx:21)**
```tsx
full_name: 'Tomas Demo',
```
This is the developer's real first name. It appears in the nav avatar tooltip and the account page greeting. Real users will see "Welcome back, Tomas!" This should be replaced with a neutral persona name like "Demo Traveler" or "Alejandro Demo."

**P1 — No indication of what "demo" means or its limitations**
The button label is "Try Demo Account" but there is no tooltip, modal, or explanatory text indicating what the demo experience includes. Is it read-only? Can they complete a booking? Can they see real data or fixture data? Users may attempt to book and be confused when nothing processes.

**P2 — Demo button is visually indistinguishable from Google OAuth in the login page**
Both buttons are `variant="outline"` with similar sizing. In `AuthModal.tsx` the demo button has `bg-accent/10` styling which differentiates it slightly, but in `login/page.tsx` (line 123–132) it uses `bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900` — hardcoded amber colors not in the design system.

**P2 — Demo login does not redirect demo users away from auth pages**
If a demo user navigates directly to `/login`, they are shown the login form with no indication they are already signed in. There is no middleware or guard that redirects already-authenticated users.

**P3 — `signInAsDemo` toast says "Signed in as Tomas Demo!"** on the login page vs "Signed in as demo account" in the AuthModal — inconsistent copy.

---

## Account Settings

**File:** `app/(tourist)/account/page.tsx`

### What works
- Profile loads from `/api/profile` with graceful `503` fallback (lines 62–81).
- Service unavailable banner is clear and non-blocking (lines 151–155).
- Travel interests chip-picker is a pleasant interaction (lines 228–244).
- Emergency contact section is unique and context-appropriate for a Venezuela travel app.
- Save button correctly disables when service is unavailable (line 314).
- Unauthenticated state shows a proper CTA to sign in (lines 120–132).

### Issues

**P1 — No way to change password (entire file)**
The account page has no "Change password" option. Users who created their account via email/password have no self-service path to update their password. This requires a call to `supabase.auth.updateUser({ password: '...' })` after re-authentication, but it does not exist anywhere.

**P1 — Account inputs use raw `<input>` with hardcoded `bg-sky-500` focus rings, not shadcn `<Input>` (lines 164–310)**
```tsx
className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
```
This appears 8 times throughout the page. The rest of the platform uses shadcn `<Input>` component. This creates visual inconsistency (the input border, radius, and hover states don't match the design system). DESIGN.md specifies inputs should be `rounded-md` (10px) not `rounded-lg` (12px). The focus ring should use `focus:ring-primary` not `focus:ring-sky-500`.

**P1 — Save button uses hardcoded `bg-sky-500` (account/page.tsx:315)**
```tsx
className="w-full rounded-xl bg-sky-500 text-white py-3 ..."
```
Should use the shadcn `<Button>` component (`variant="default"`) to stay consistent with design tokens. The `rounded-xl` also violates DESIGN.md's button radius spec of `rounded-lg` (12px).

**P2 — No notification/email preferences section**
Common expectations for a travel app account page: email alerts for bookings, marketing opt-out, WhatsApp notification toggle. These are entirely absent.

**P2 — Language preference toggle is functional but disconnected from global language state**
The `form.language` field is saved to `/api/profile` but there is no `<html lang="">` update or i18n context re-initialization on change. Setting language to "Español" appears to do nothing visible.

**P2 — Avatar has no way to upload a custom photo**
The avatar shows either the OAuth profile photo or initials. There is no image upload field. Users cannot personalize their account beyond what Google provides.

**P2 — Role badge shows raw "tourist" / "provider" text (account/page.tsx:148)**
```tsx
<Badge variant="secondary" className="ml-auto capitalize">{profile?.role}</Badge>
```
`capitalize` CSS makes it "Tourist" / "Provider" but there's no icon, no differentiation styling, and no explanation of what the role means. For providers, this should link to the dashboard.

**P3 — Payment section asks for USDT wallet address in a consumer account page**
This is an unusual field that will confuse most international tourists. It should be moved to a separate "Billing & Payments" section or hidden behind an optional "advanced" disclosure.

**P3 — No delete account / deactivate option**
GDPR and good practice require a way for users to request account deletion. Completely absent.

---

## Messages

**File:** `app/(tourist)/messages/page.tsx`

### What works
- Empty state is well-designed: icon + descriptive text + CTA link (lines 83–89). Follows DESIGN.md component pattern ("Never just 'No items found.'").
- Booking cards show confirmation code and date range.
- Quick-reply templates (Check-in time, Directions, Breakfast, Early arrival) are a practical UX feature.
- Loading state shows skeleton cards (lines 77–83).

### Issues

**P1 — The page is not a real messages inbox — it redirects to WhatsApp (lines 27–31, 105–113)**
The "Messages" page is actually a WhatsApp deep-link launcher. Users expecting an in-platform inbox will be confused. The nav tab is labeled "Messages" but every action exits the app. The empty state says "No bookings to message about yet" which makes it obvious messages = bookings, but the nav label is misleading. Should either rename the page "Contact Hosts" or add a brief header explaining "We use WhatsApp for host communication."

**P1 — `fetching` state check is unreachable (messages/page.tsx:77)**
```tsx
{fetching ? (
  <div className="space-y-4">…skeleton…</div>
) : bookings.length === 0 ? (
```
The component already returns early at line 49–55 with a full-page spinner if `fetching` is true. The `fetching` ternary at line 77 is dead code — it will never be true when we reach that render path. This means the skeleton cards inside the conditional at line 78–83 never actually show. The skeleton loading state is broken/unreachable.

**P1 — If `provider_phone` is null, the WhatsApp link is `https://wa.me/`** (messages/page.tsx:29–30)
```tsx
const number = booking.provider_phone ? booking.provider_phone.replace(/\D/g, '') : '';
return `https://wa.me/${number}?text=...`;
```
If `provider_phone` is null, `number` is `''` and the link becomes `https://wa.me/?text=...`. This is an invalid WhatsApp URL. When clicked, WhatsApp will show an error or open to an empty "new chat" screen with no recipient. The button should be disabled (or hidden) when `provider_phone` is null.

**P2 — Messages does not check for unauthenticated state before fetching (messages/page.tsx:39–45)**
The `useEffect` checks `if (!isAuthenticated) return;` but `setFetching(false)` is never called in that early return. The spinner continues showing forever if the user is not authenticated. The unauthenticated UI at lines 56–68 is only reached when `!fetching` is false... but fetching never becomes false in that path. Auth and fetching states are tangled.

**P3 — "Message Host" button has no `aria-label` describing which host (messages/page.tsx:105–112)**
The button just says "Message Host" for each booking card. A screen reader user navigating multiple bookings cannot distinguish which button belongs to which booking. Should be `aria-label={`Message host for ${booking.listing_name}`}`.

**P3 — WhatsApp links open in `target="_blank"` without visual indication (lines 105–112)**
The "Message Host" and template links open in a new tab/app. No external link icon or `title` attribute alerts the user they are leaving the platform.

---

## Auth UX Details (loading, mobile, autocomplete)

### Loading states
- **Login:** `isLoading` state correctly disables all buttons and changes submit text to "Signing in..." (lines 195–197). Good.
- **Register:** `isLoading` state shows "Creating account..." (line 215). Good.
- **Provider Register:** Same pattern — "Creating account..." (line 214). Good.
- **AuthModal:** `isLoading` state covers submit button but NOT the Google/Demo buttons (modal lines 299–302). Google button is disabled during email form load (`disabled={isLoading}` at line 203) but there is no loading indicator on the button itself — no spinner, no visual feedback.
- **Account:** Loading shows a centered spinner (`border-b-2 border-sky-500` — hardcoded color, line 115). After hydration, the form should show skeleton cards rather than the empty form fields briefly flashing.

### Mobile keyboard handling
- All password/email inputs use correct `inputMode` attributes.
- `type="email"` with `inputMode="email"` on email fields: correct.
- `type="tel"` with `inputMode="tel"` on phone fields: correct.
- The 2-column grids in register and provider-register will cause layout issues on iOS when the keyboard appears (discussed under Registration P1).
- **Auth layout**: `p-4` padding on mobile with `max-w-md` centered — the card should not be cut off. Acceptable but the provider register form (9+ fields) will require excessive scrolling on mobile.

### Autocomplete attributes
- **Login:** `autoComplete="email"` and `autoComplete="current-password"` — correct (lines 149, 176).
- **Register:** `autoComplete="name"`, `autoComplete="email"`, `autoComplete="new-password"`, `autoComplete="tel"`, `autoComplete="country-name"` — all correct.
- **Provider Register:** `autoComplete` on name, email, tel, organization, url — correct. `instagram_handle` and `rif` have no `autoComplete` (acceptable since there's no standard value).
- **Account Settings:** `autoComplete="name"`, `autoComplete="tel"`, `autoComplete="country-name"` on personal fields — correct. `autoComplete="off"` on emergency contact fields — correct (prevents autofill of wrong data into emergency fields).

### Skeleton states
- Login: no skeleton — the `Suspense` fallback is `<div>Loading...</div>` (login/page.tsx:220–221), plain text. Should be a card skeleton.
- AuthModal: no skeleton, instant mount via portal — acceptable for a small modal.
- Account page: shows a centered spinner, not a skeleton of the form. Causes layout shift when content loads.

### Focus management
- **AuthModal:** Focus trap is properly implemented (AuthModal.tsx:66–95). Focus is restored on close (lines 59–63). Escape key closes the modal (line 68). These are all correct and production-quality.
- **Login page:** No focus management — the first field is not auto-focused on page load. Best practice is to auto-focus the email field.
- **Register/Provider Register:** No auto-focus on first field.

---

## Priority Issues

### P0 — Broken: Blocks real users
1. **No password reset flow** (`app/(auth)/login/page.tsx:165`) — "Forgot password?" fires a toast. No `resetPasswordForEmail()` call exists anywhere. Users cannot recover locked-out accounts.
2. **No post-registration email verification UX** (`app/(auth)/register/page.tsx:70–72`) — Supabase sends a confirmation email but the UI immediately redirects to `/` claiming success. Users expect to be logged in; they aren't yet verified. This causes silent auth failures on protected routes.

### P1 — High friction or trust-breaking
3. **Provider DB insert error silently swallowed** (`app/(auth)/provider-register/page.tsx:75`) — Auth account created, providers row missing, success toast shown. Data corruption scenario.
4. **Provider registration form crammed into `max-w-md`** (`app/(auth)/layout.tsx:9`) — 9+ fields in a 448px-wide card; provider-register needs a wider layout override.
5. **Demo persona name is "Tomas Demo"** (`login/page.tsx:23`, `AuthModal.tsx:21`) — developer name is visible in production to all users who try the demo.
6. **Messages: null `provider_phone` produces invalid WhatsApp URL** (`messages/page.tsx:29–30`) — `wa.me/?text=` is not a valid link.
7. **Messages: unauthenticated + fetching state deadlock** (`messages/page.tsx:39–45`) — `fetching` is never set to false for unauthenticated users; the spinner shows forever.
8. **Messages: skeleton loading state is unreachable dead code** (`messages/page.tsx:77`) — early return at line 49 means the skeleton conditional at line 77 never fires.
9. **Password/confirm fields in `grid-cols-2` with no responsive breakpoint** (`register/page.tsx:120`, `provider-register/page.tsx:156`) — inputs are ~160px wide on mobile, too narrow.
10. **No password change option in Account Settings** (`app/(tourist)/account/page.tsx`) — users who signed up with email/password have no path to change it.

### P2 — Medium: Polish and consistency
11. **Auth layout background uses non-token sky/blue gradient** (`layout.tsx:6`) — diverges from DESIGN.md warm OKLCH palette.
12. **Account page uses `bg-sky-500` everywhere** (8 focus rings, avatar, save button) — not design token usage.
13. **Raw `<input>` elements in account page instead of shadcn `<Input>`** (lines 164–310) — visual inconsistency.
14. **Error alert in login uses hardcoded `bg-red-50 border-red-200 text-red-700`** (`login/page.tsx:99`) — should use `bg-destructive/10` pattern.
15. **Password strength bar uses hardcoded status colors** (`register/page.tsx:27–31`) — should map to DESIGN.md semantic tokens.
16. **Terms links are `href="#"`** (both `register/page.tsx` and `provider-register/page.tsx`) — dead links users are agreeing to.
17. **No Google OAuth on registration page** — inconsistency with login page's primary CTA.
18. **No visual difference between Google and Demo buttons** on login page — equal weight creates decision paralysis.
19. **No loading state on Google OAuth button during redirect** (login/page.tsx:72–79).
20. **No onboarding screen after provider registration** — unclear next steps and review process.
21. **Messages page label is misleading** — "Messages" in nav implies in-app inbox; it's actually a WhatsApp launcher.
22. **Suspense fallback in login is plain text** (`login/page.tsx:220–221`) — should be a card skeleton.
23. **No avatar upload in Account Settings** — no photo customization beyond OAuth-provided image.

### P3 — Low: Minor polish
24. **Demo toast copy is inconsistent** — "Signed in as Tomas Demo!" vs "Signed in as demo account" (two different strings).
25. **"Nationality" field should be a select** — free-text input for country of origin is error-prone.
26. **Required field legend missing** — `*` used without explanatory note near form top.
27. **RIF field has no explanation** — confusing for non-Venezuelan providers.
28. **Description min-length (50 chars) not communicated** — users discover this only on submit.
29. **Payment section (USDT wallet) is jarring for consumer users** — should be behind disclosure.
30. **No delete account option** — GDPR / good practice gap.
31. **Navbar dropdown uses `window.location.href`** (`Navbar.tsx:123–148`) — hard navigations instead of Next.js `router.push()`. Causes full page reload and breaks the SPA experience.
32. **Messages "Message Host" button has no contextual `aria-label`** (`messages/page.tsx:105–112`).
33. **WhatsApp links open in new tab with no external-link indicator** (messages/page.tsx).
