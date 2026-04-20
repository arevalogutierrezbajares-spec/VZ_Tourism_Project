# Design System — VZ Explorer

## Product Context
- **What this is:** Venezuela tourism marketplace with curated itineraries, listing discovery, safety zones, and influencer commission tracking
- **Who it's for:** International adventure travelers with zero local knowledge, discovering Venezuela through social media
- **Space/industry:** Travel marketplace, niche destination (Venezuela), influencer-driven trust model
- **Project type:** Web app (Next.js) with marketplace + editorial hybrid

## Aesthetic Direction
- **Direction:** Organic/Natural with editorial touches
- **Decoration level:** Intentional (photography-forward, subtle grain textures on hero sections, no decorative blobs)
- **Mood:** Warm, earthy, adventurous. Feels like a curated travel magazine, not a tech marketplace. Trust is earned through curation and real photography, not through polish and volume.
- **Anti-patterns:** No purple gradients, no 3-column icon grids, no centered-everything layouts, no decorative blobs/waves

## Typography
- **Body/UI:** Inter (current, loaded via next/font in layout.tsx)
- **Display/Hero:** Fraunces (recommended upgrade, variable serif, editorial warmth)
- **Target body:** Plus Jakarta Sans (recommended upgrade, pairs with Fraunces)
- **Data/Tables:** JetBrains Mono or Geist Mono (tabular-nums support)
- **Code:** JetBrains Mono
- **Loading:** next/font/google (current: Inter), future: add Fraunces + Plus Jakarta Sans
- **Scale:**
  - xs: 12px (captions, metadata)
  - sm: 14px (secondary text, card descriptions)
  - base: 16px (body text)
  - lg: 18px (lead paragraphs, subtitles)
  - xl: 20px (section headings)
  - 2xl: 24px (page headings)
  - 3xl: 32px (hero subheadings)
  - 4xl: 48px (hero headlines)

## Color
- **Approach:** Balanced (primary + secondary + accent, semantic colors for hierarchy)
- **System:** OKLCH (already in globals.css)
- **Primary:** oklch(0.55 0.18 220) — Tropical teal-blue. CTAs, interactive elements, links, focus rings.
- **Secondary:** oklch(0.65 0.15 142) — Venezuelan green. Success states, nature/eco badges, verified status.
- **Accent:** oklch(0.7 0.15 75) — Warm gold. Influencer picks, premium content, highlights. Use sparingly.
- **Neutrals:** Warm grays (oklch with slight warm shift at hue 75)
  - Text: oklch(0.145 0 0) / oklch(0.15 0.01 75)
  - Text muted: oklch(0.556 0 0) / oklch(0.45 0.01 75)
  - Border: oklch(0.922 0 0) / oklch(0.92 0.005 75)
  - Background: oklch(1 0 0) / oklch(0.995 0.002 75)
  - Surface: oklch(1 0 0)
- **Semantic:**
  - Success: oklch(0.65 0.15 142) — same as secondary (green)
  - Warning: oklch(0.7 0.15 75) — same as accent (gold)
  - Error: oklch(0.577 0.245 27) — warm red
  - Info: oklch(0.55 0.18 220) — same as primary (blue)
- **Dark mode:** Defined in globals.css. Strategy: darken surfaces, reduce saturation, boost primary lightness.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Component padding:** Cards 16px, modals 24px, page sections 32-48px
- **Grid gap:** Cards 16-20px, chip lists 8px

## Layout
- **Approach:** Hybrid (grid-disciplined for marketplace grids, editorial for heroes/profiles)
- **Grid:** 1 col mobile, 2 col tablet, 3 col desktop for card grids
- **Max content width:** 1100px (6xl), narrow content: 768px (3xl)
- **Border radius:**
  - sm: 6px (badges, chips, small buttons)
  - md: 10px (cards, inputs, buttons)
  - lg: 14px (large cards, modals)
  - xl: 20px (hero sections, featured cards)
  - full: 9999px (avatars, pills)
- **Base radius:** 0.625rem (10px) — defined as --radius in globals.css

## Motion
- **Approach:** Intentional (subtle animations that aid comprehension, not decorative)
- **Easing:**
  - Enter: ease-out (elements appearing)
  - Exit: ease-in (elements leaving)
  - Move: ease-in-out (position changes)
- **Duration:**
  - Micro: 50-100ms (button hover, focus ring)
  - Short: 150-200ms (card hover shadow, chip toggle)
  - Medium: 300ms (modal enter, skeleton fade)
  - Long: 500ms (image zoom on hover, page transitions)
- **Existing patterns:**
  - Card hover: shadow transition + image scale-105 (500ms)
  - Chip active: background/color transition
  - Skeleton: animate-pulse

## Component Patterns
- **Cards:** shadcn/ui Card with rounded-2xl (16px radius), 1px border, hover shadow
- **Buttons:** shadcn/ui Button, primary (teal bg), outline (border), ghost (transparent)
- **Badges:** shadcn/ui Badge, variants: default (primary), secondary, outline, destructive
- **Avatars:** shadcn/ui Avatar with ring-2 ring-primary for verified creators
- **Filter chips:** Custom pill buttons with border, active state swaps to primary bg
- **Empty states:** Search icon + descriptive text + primary action CTA. Never just "No items found."

## Visual Language
- **Influencer/Creator content:** Gold accent badge, teal ring on avatar, "Creator" secondary badge
- **Regular user content:** No special treatment, standard card
- **Safety indicators:** Green (safe) / Yellow (caution) / Orange (elevated) / Red (avoid) — maps to safety_zones data
- **Social proof:** "{N} recommend" in primary color, derived from saves + likes

## Status Colors (added v0.3.5 design review)
- **Confirmed/Success:** oklch(0.65 0.15 142) — `bg-status-confirmed`, `text-status-confirmed`
- **Pending/Warning:** oklch(0.7 0.15 75) — `bg-status-pending`, `text-status-pending`
- **Cancelled/Error:** oklch(0.577 0.245 27) — `bg-status-cancelled`, `text-status-cancelled`
- **Info:** oklch(0.55 0.18 220) — `bg-status-info`, `text-status-info`
- **All status indicators must use icon + color, never color alone (WCAG)**

## Radius Differentiation (added v0.3.5 design review)
- **Cards:** rounded-2xl (16px)
- **Modals:** rounded-xl (14px)
- **Buttons:** rounded-lg (12px)
- **Inputs:** rounded-md (10px)
- **Badges/chips:** rounded-md (8px) or rounded-full (pills)
- **Avatars:** rounded-full

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Initial design system created | Created by /design-consultation during itineraries marketplace build |
| 2026-04-07 | Keep Inter as body font for now | Aligns with existing platform, Fraunces + Plus Jakarta Sans noted as upgrade path |
| 2026-04-07 | OKLCH color system formalized | Already in globals.css, documented for consistency |
| 2026-04-07 | Warm gold accent for influencer content | Differentiates creator-curated from community content |
| 2026-04-07 | Editorial aesthetic direction | Curated travel magazine feel matches influencer-first positioning |
| 2026-04-19 | Three-font system: Fraunces + Plus Jakarta Sans + Inter | Design review: Inter-only makes platform look like SaaS. Fraunces for editorial headlines, PJS for body, Inter for data. |
| 2026-04-19 | Semantic status color tokens | Design review: 8+ files use hardcoded Tailwind colors. Tokens enable dark mode and theme changes. |
| 2026-04-19 | Radius differentiation | Design review: rounded-xl on everything is AI slop pattern #5. Different radii for different component types. |
| 2026-04-19 | Separate landing page at / | Design review: redirect to /library is a hard rejection (no value prop, no trust bridge). |
| 2026-04-19 | Merge browse into single /explore | Design review: /library + /explore + /discover overlap. One browse surface. |
| 2026-04-19 | Unified ListingCard with variant prop | Design review: two competing card components causes divergence. Single source of truth. |
| 2026-04-19 | Sticky booking card on listing detail | Design review: Airbnb-style price-first sidebar. Price buried below fold currently. |
| 2026-04-19 | Fraunces wordmark brand mark | Design review: generic map pin SVG is invisible. Serif wordmark in warm gold. |
| 2026-04-19 | Scraped listings: Preview tier | Design review: fake prices + "Not on platform" dead end destroys trust. Clear labeling. |
| 2026-04-19 | Full interaction state library | Design review: zero error states, blank trips page, emoji empty states. Production blocker. |
| 2026-04-19 | Mobile bottom tab bar (consumer) | Design review: no mobile nav exists. 5-item bar: Home/Explore/Plan/Trips/Profile. |
| 2026-04-19 | Collapsible provider sidebar | Design review: fixed 256px sidebar breaks on tablet/mobile. 3-tier responsive. |
| 2026-04-19 | Dark mode: implement properly | Design review: .dark theme defined but components hardcode light colors. Color audit enables it. |
