import { redirect } from 'next/navigation';

/**
 * Admin login — forwards to the main Supabase login page.
 * Access to /admin/* is controlled by middleware.ts via ADMIN_USER_ID env var.
 * Log in at /login with your admin Supabase account, then return to /admin.
 */
export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const destination = searchParams.redirectTo || '/admin';
  redirect(`/login?redirectTo=${encodeURIComponent(destination)}`);
}
