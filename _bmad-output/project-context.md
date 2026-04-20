---
project_name: 'VZ Explorer'
user_name: 'Tomas'
date: '2026-04-20'
sections_completed: ['technology_stack', 'architecture_modules', 'review_plan']
existing_patterns_found: 47
---

# Project Context for AI Agents

_This file contains critical rules, patterns, and modular architecture that AI agents must follow when implementing code in this project. Structured for agent-assignable modules with clear boundaries and interfaces._

---

## Technology Stack & Versions

### Runtime & Framework
- Next.js 16.2.1 (App Router, Turbopack enabled)
- React 19.2.4 + React DOM 19.2.4
- TypeScript 5.x (strict mode, bundler moduleResolution, `@/*` path alias)
- Node.js (target ES2017)

### Styling & UI
- Tailwind CSS 4 + @tailwindcss/postcss
- shadcn/ui (via `shadcn` 4.1.1) — OKLCH color system in globals.css
- Framer Motion 12.38 (animation)
- Lucide React 1.7 (icons)
- tw-animate-css 1.4, class-variance-authority 0.7, clsx 2.1, tailwind-merge 3.5

### Backend & Data
- Supabase (@supabase/supabase-js 2.101, @supabase/ssr 0.10) — auth, DB, storage, realtime
- 17 SQL migrations (001–016, two 013s)
- PostGIS for RUTA geospatial (tracker pings, zones)

### AI
- Anthropic Claude (@anthropic-ai/sdk 0.80) — itinerary generation, AI search, WhatsApp concierge
- Groq (groq-sdk 1.1) — fast inference path

### Payments
- Stripe (stripe 21.0 server, @stripe/stripe-js 9.0 client) — checkout sessions, webhooks
- Zelle (manual confirmation flow with admin verification)

### Maps
- Mapbox GL (mapbox-gl 3.20, @mapbox/mapbox-gl-geocoder 5.1) — pins, routes, safety zones, clusters, 3D terrain

### Forms & Validation
- React Hook Form 7.72 + @hookform/resolvers 5.2
- Zod 4.3

### State Management
- Zustand 5.0.12 (7 stores: auth, favorites, itinerary, map, provider, recently-viewed, search)

### Other
- Resend 6.12 (email)
- date-fns 4.1, uuid 13.0, isomorphic-dompurify 3.9
- react-hot-toast 2.6, recharts 3.8, react-day-picker 9.14
- vaul 1.1 (drawer), cmdk 1.1 (command palette), qrcode.react 4.2

### Testing
- Jest 30.3 + ts-jest 29.4 + @testing-library/react 16.3 (unit/integration)
- Playwright 1.58 (E2E, chromium + Mobile Chrome)
- MSW 2.12 (API mocking)

### Version Constraints
- Next.js 16 uses React 19 — no React 18 patterns (forwardRef removed, use ref prop directly)
- Zod 4 — API differs from Zod 3 (check docs for breaking changes)
- Tailwind CSS 4 — no tailwind.config.ts, theme configured via `@theme` in CSS
- shadcn/ui uses CSS variables mapped through `@theme inline` block, NOT direct Tailwind color classes

---

## Architecture — Agent-Assignable Modules

This project is a multi-portal tourism SuperApp with 6 route groups, each a distinct product surface.

### Module Map

| ID | Portal | Route Group | Layout | Auth |
|----|--------|-------------|--------|------|
| M01 | Landing | `app/page.tsx` | Root | None |
| M02 | Tourist | `app/(tourist)/` | Navbar+Footer+MobileTabBar+MyTripFab | Supabase (optional browse, required actions) |
| M03 | Provider | `app/(provider)/dashboard/` | ProviderSidebar | Supabase (role: provider\|admin) |
| M04 | Admin | `app/(admin)/admin/` | Admin sidebar + SHA-256 password gate | Client-side hash |
| M05 | RUTA | `app/(ruta)/ruta/` | Dark theme (#0a0a0a) | Supabase (varies) |
| M06 | Creator | `app/creator/` | Creator sidebar | Supabase (creator role) |
| M07 | Demo | `app/demo/` | Bare | None |
| M08 | Auth | `app/(auth)/` | Auth layout | Supabase auth flow |
| M09 | Onboarding | `app/onboard/[slug]/` | Standalone | Public |
| M10 | API | `app/api/` | N/A | Per-route |
| M11 | AI System | `lib/claude/`, `lib/groq.ts`, `lib/whatsapp-ai.ts` | N/A | Server-side |
| M12 | Map System | `components/map/`, `stores/map-store.ts`, `hooks/use-map.ts` | N/A | N/A |
| M13 | Design System | `components/ui/`, `components/common/`, `app/globals.css`, DESIGN.md | N/A | N/A |
| M14 | Testing | `__tests__/`, `e2e/` | N/A | N/A |
| M15 | Data Layer | `types/`, `stores/`, `hooks/`, `lib/supabase/` | N/A | N/A |
| M16 | Itinerary System | `components/itinerary/`, `stores/itinerary-store.ts`, `hooks/use-itinerary.ts` | N/A | N/A |
| M17 | Listing System | `components/listing/`, `hooks/use-listings.ts`, `hooks/use-favorites.ts` | N/A | N/A |
| M18 | WhatsApp | `lib/whatsapp*.ts`, `components/whatsapp/`, `app/api/whatsapp/` | N/A | WhatsApp Business API |

### Shared Infrastructure
- **Stores:** `stores/` — Zustand, 7 stores (auth, favorites, itinerary, map, provider, recently-viewed, search)
- **Hooks:** `hooks/` — 10 custom hooks (use-auth, use-booking, use-debounce, use-favorites, use-itinerary, use-listings, use-map, use-realtime, use-recently-viewed, use-search)
- **Types:** `types/` — 5 files (database.ts, api.ts, store.ts, map.ts, ruta.ts)
- **Common Components:** `components/common/` — Navbar, Footer, MobileTabBar, Logo, SearchBar, SearchOverlay, AuthModal, EmptyState, LoadingSpinner, HeroSection, SafetyBadge, StarRating, PriceDisplay, MotionDiv, MotionProvider, StoreHydration
- **UI Primitives:** `components/ui/` — 25+ shadcn components
