/**
 * Tourist-layout wrapper for the map page.
 * Moving the map under app/(tourist) ensures Navbar and MobileTabBar
 * are rendered by the shared tourist layout (Fix P1-TRS-003).
 * The original app/map/page.tsx is kept as a redirect target for
 * any hard-coded links while this canonical version lives in the layout.
 */
export { default } from '@/app/map/page';
