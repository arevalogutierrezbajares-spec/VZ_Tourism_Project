# VZ Tourism — Venezuela Travel Marketplace

A full-stack tourism marketplace for Venezuela. Tourists discover, plan, and book experiences with local posadas and guides. Providers manage listings, receive AI-powered guest messaging via WhatsApp, and handle bookings through a provider dashboard.

## What's Live

**Tourist experience**
- Explore listings by category, region, and AI-powered search
- Book experiences — instant confirmation (verified providers) or request-to-book
- Build multi-day itineraries with AI assistance (natural language, link extraction, text paste)
- Itinerary persistence: anonymous drafts sync to Supabase on sign-in
- Booking management: trips, cancellation with refund estimates, QR codes on confirmation

**Provider experience**
- Listing management and availability calendar
- WhatsApp AI concierge: incoming guest messages handled by an AI agent that quotes, answers, and books
- Dynamic pricing rules per season and room type
- Human-in-the-loop escalation for uncertain AI responses
- Knowledge base editor for FAQs and property details

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 App Router, React 19, TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand 5 (persist + devtools) |
| Auth + DB | Supabase (auth, postgres, realtime) |
| Maps | Mapbox GL JS v3 |
| Payments | Stripe (card) + Zelle/USDT manual flow |
| AI | Anthropic Claude API (itinerary, search, concierge) |
| Email | Resend |
| Messaging | WhatsApp Business API |

## Getting Started

```bash
npm install
npm run dev        # starts on port 3003 (Turbopack)
```

### Required environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# AI
ANTHROPIC_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Google Places
GOOGLE_PLACES_API_KEY=
```

## Commands

```bash
npm run dev        # dev server (port 3003, Turbopack)
npm run build      # production build
npm run lint       # ESLint
npx jest           # run unit tests
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Home |
| `/book` | Search / book experience |
| `/explore` | Browse listings |
| `/listing/[slug]` | Listing detail + booking form |
| `/itineraries` | Public itinerary browse |
| `/itineraries/draft` | Private draft from store |
| `/booking/confirmation` | Post-booking confirmation + QR |
| `/trips` | Tourist's booking history |
| `/provider/dashboard` | Provider management |
| `/provider/dashboard/messages` | WhatsApp concierge inbox |
| `/provider/dashboard/messages/brain` | AI knowledge base |

## Database

Supabase migrations in `supabase/migrations/`. Run in order:

```
001 — core schema (users, listings, bookings)
009 — itinerary planning
010 — degusta restaurants
011 — WhatsApp messaging
012 — posada knowledge base
013 — pricing rules
014 — multilingual conversation trail
```

## Version

Current: **0.3.0.0** — see [CHANGELOG.md](./CHANGELOG.md)
