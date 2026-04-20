import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s — VZ Admin' } };

/**
 * Admin layout — authentication is enforced server-side by middleware.ts.
 * Unauthenticated requests never reach this layout (redirected to /login).
 * No auth logic or secrets belong here.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto md:ml-0" id="main" role="main">
        {/* Spacer for mobile hamburger */}
        <div className="h-14 md:h-0" />
        {children}
      </main>
    </div>
  );
}
