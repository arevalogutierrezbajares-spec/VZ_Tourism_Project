'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PmsProvider, usePms } from '@/lib/pms/context';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Ticket,
  Banknote,
  Users,
  Settings,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const pmsNavItems = [
  { href: '/dashboard/pms', label: 'Calendario', icon: Calendar, exact: true },
  { href: '/dashboard/pms/reservations', label: 'Reservas', icon: Ticket },
  { href: '/dashboard/pms/payments', label: 'Pagos', icon: Banknote },
  { href: '/dashboard/pms/guests', label: 'Huéspedes', icon: Users },
  { href: '/dashboard/pms/settings', label: 'Configuración', icon: Settings },
];

function PmsNavTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-1 border-b px-1 overflow-x-auto"
      aria-label="PMS navigation"
    >
      {pmsNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PmsHeader() {
  const { property, properties, switchProperty } = usePms();

  return (
    <div className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold">
            {property?.name || 'Posada PMS'}
          </h1>
          <p className="text-xs text-muted-foreground">Property Management</p>
        </div>
      </div>
      {properties.length > 1 && (
        <select
          className="rounded-md border bg-background px-2 py-1 text-xs"
          value={property?.id || ''}
          onChange={(e) => switchProperty(e.target.value)}
          aria-label="Switch property"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function PmsLoadingState() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

function PmsErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold">Error loading PMS</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  );
}

function PmsLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading, error, needsOnboarding, refresh } = usePms();

  if (isLoading) return <PmsLoadingState />;
  if (error) return <PmsErrorState error={error} onRetry={refresh} />;

  // Redirect to onboarding if no properties
  if (needsOnboarding) {
    return (
      <>
        <PmsHeader />
        <div className="p-4">
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <PmsHeader />
      <PmsNavTabs />
      <div className="p-4 md:p-6">{children}</div>
    </>
  );
}

export default function PmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PmsProvider>
      <div className="flex flex-col min-h-full -m-4 md:-m-6">
        <PmsLayoutInner>{children}</PmsLayoutInner>
      </div>
    </PmsProvider>
  );
}
