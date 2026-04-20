# VZ Explorer — Platform Features

> High-level inventory of all functionality across the platform.

---

## 1. AI Trip Planner (`/plan`)
- Conversational AI chat that builds multi-day itineraries
- SmartStarters — one-click trip templates (e.g. "3 days in Merida")
- Interactive map with pins for each stop
- Day-by-day view with stops, costs, and listing links
- Save itinerary to account / localStorage
- Share itinerary link
- AI suggest stops — get recommendations for a specific day
- AI fill itinerary — auto-populate empty days
- AI optimize — reorder stops for efficiency

## 2. Explore & Discovery
- **Explore** (`/explore`) — browse all listings with search, category and region filters
- **Category pages** (`/explore/category/[slug]`) — beaches, mountains, cities, eco-tours, gastronomy, adventure, wellness, cultural
- **Region pages** (`/explore/region/[slug]`) — listings filtered by Venezuelan region
- **Discover** (`/discover`) — curated editorial collections and featured experiences
- **Map view** (`/map`) — full-screen Mapbox map with all listings as markers

## 3. Listings & Booking
- **Listing detail** (`/listing/[slug]`) — photos, description, pricing, reviews, availability calendar
- **Booking flow** (`/book`) — date selection, guest count, payment
- **Stripe checkout** — credit card payments via Stripe
- **Zelle payments** — manual Zelle confirmation flow for RUTA
- **Discount codes** — validate and apply promo codes at checkout
- **Booking confirmation** (`/booking/confirmation`) — receipt with confirmation code
- **Booking detail** (`/bookings/[id]`) — view/cancel individual booking

## 4. My Trips (`/trips`)
- **Upcoming bookings** — countdown, status badges, cancel option
- **Past bookings** — travel history with review prompts
- **Saved itineraries** — AI-generated trips stored locally or in Supabase
- **Saved places** — favorited listings (heart button)
- **Recently viewed** — auto-tracked browsing history

## 5. Auth & Accounts
- **Demo account** — one-click sign-in, no credentials needed (client-side Zustand)
- **Email/password login** (`/login`)
- **Google OAuth** — sign in with Google
- **Registration** (`/register`) — full form with password strength meter
- **Provider registration** (`/provider-register`) — business-specific signup
- **Account settings** (`/account`) — edit profile, preferences
- **Messages** (`/messages`) — tourist messaging inbox

## 6. RUTA Secure Transport (`/ruta`)
- **Landing page** with service tiers: Airport Transfer, Inter-City, Intra-City
- **Booking form** — origin/destination, date, passengers, vehicle class
- **Instant quote API** — real-time pricing based on distance + vehicle
- **Booking confirmation** (`/ruta/book/confirmation`)
- **7-language i18n** — EN, ES, FR, DE, PT, ZH, IT with language selector
- **Dispatch dashboard** (`/ruta/dispatch`) — assign drivers/vehicles to rides
- **Driver management** (`/ruta/dispatch/drivers`)
- **Vehicle management** (`/ruta/dispatch/vehicles`)
- **Live tracking** — rider GPS ping endpoint
- **Zelle payment confirmation** flow

## 7. Provider Dashboard (`/dashboard`)
- **Overview** — bookings, revenue, views at a glance
- **Listings CRUD** (`/dashboard/listings`) — create, edit, manage listings
- **New listing wizard** (`/dashboard/listings/new`) — multi-step form
- **Bookings management** (`/dashboard/bookings`) — accept, reject, manage
- **Availability calendar** (`/dashboard/calendar`) — block dates, import iCal
- **Guest management** (`/dashboard/guests`)
- **Messages** (`/dashboard/messages`) — guest communication
- **AI message assistant** (`/dashboard/messages/ai`) — AI-drafted replies
- **Provider brain** (`/dashboard/messages/brain`) — knowledge base for AI
- **Analytics** (`/dashboard/analytics`) — views, conversion, trends
- **Revenue** (`/dashboard/revenue`) — earnings tracking
- **Payouts** (`/dashboard/payouts`) — payout history and requests
- **Marketing tools** (`/dashboard/marketing`)
- **Settings** (`/dashboard/settings`) — business info, notifications, payment

## 8. Admin Panel (`/admin`)
- **Dashboard** — platform-wide metrics
- **Listings management** — approve/reject, bulk actions, AI assist, CSV export
- **Provider management** — onboarding status, verification
- **Bookings** — all platform bookings
- **Discover CMS** — curate collections, AI generation, Instagram import
- **Itineraries** — all user itineraries
- **Outreach** — email sequences, AI compose, classify leads, bulk send
- **Analytics** — platform-wide analytics
- **Payouts** — manage provider payouts
- **CMS** — content management
- **Safety zones** — manage safety zone boundaries and risk levels
- Password-gated access (SHA-256 hash)

## 9. Creator Portal (`/creator`)
- **Create itinerary** (`/creator/itineraries/new`) — build publishable trips
- **Review drafts** (`/creator/itineraries/review/[draftId]`)
- **Public profile** (`/creator/[username]`) — creator portfolio page
- **Publish itineraries** — share with referral tracking

## 10. WhatsApp AI Concierge (`/demo/whatsapp`)
- **Chat demo** — simulated WhatsApp conversation with AI bot (5 mock conversations, bilingual)
- **Conversation management** — AI, human, escalated, closed filters with stats strip
- **Conversation list** — auto-sorts by most recent message; unread badges
- **Message thread** — day dividers, translation toggles, sentiment flags, AI/human indicators
- **Mode switching** — AI auto-reply, human takeover, close conversation
- **Booking stage pipeline** — lead, quoted, confirmed, checked-in, closed
- **Knowledge base editor** (`/demo/whatsapp/brain`) — train the AI with 7 sections (overview, rooms, amenities, policies, FAQs, booking, local tips); localStorage fallback when no Supabase
- **Prompt preview** — see exactly what the AI reads from the knowledge base
- **AI Settings** (`/demo/whatsapp/settings`) — persona, communication style, smart rules, availability hours, custom instructions, WhatsApp connection
- **Shared sidebar navigation** — navigate between Messages, AI Brain, and AI Settings
- **Real WhatsApp webhook** (`/api/whatsapp/webhook`) — Meta Cloud API integration
- **Groq-powered AI** responses with human-in-the-loop escalation

## 11. Provider Onboarding
- **Onboard wizard** (`/onboard/[slug]`) — 6-step claim-your-listing flow
- **Join page** (`/join/[slug]`) — "Claim your listing" for scraped businesses
- **Invite page** (`/invite/[slug]`) — partner invitation with benefits
- **AI description generator** — auto-write listing descriptions

## 12. Safety & Intelligence
- **Safety Hub** (`/safety`) — safety zones, emergency contacts, risk levels
- **Safety zones API** — green/yellow/orange/red zones with polygon boundaries
- **Emergency contacts** per zone

## 13. Platform Demo (`/demo`)
- Marketing page showcasing the platform for posada owners
- How it works, booking categories, creator program, social proof
- Mobile app teaser

## 14. Notifications & Waitlist
- **Notifications API** — in-app notification system
- **Waitlist** — email capture for pre-launch interest

---

## Cross-Cutting Features

| Feature | Details |
|---------|---------|
| **Favorites** | Heart button on any listing, syncs to Supabase on login |
| **URL param routing** | `?tier=`, `?region=`, `?sector=` pre-fill forms across pages |
| **Mobile responsive** | All pages + bottom tab bar on mobile |
| **Framer Motion animations** | Scroll-triggered section animations |
| **Photo proxy** | SSRF-protected image proxy for external listing photos |
| **iCal sync** | Import/export calendar availability |
| **Referral tracking** | Track itinerary shares and conversions |
| **Rate limiting** | IP-based rate limiting on AI and sensitive endpoints |
