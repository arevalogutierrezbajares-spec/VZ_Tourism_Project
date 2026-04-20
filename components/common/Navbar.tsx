'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BookOpen, User, LayoutDashboard, Shield, Sparkles, Luggage, Heart, Search, Route } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from './Logo';
import { SearchOverlay } from './SearchOverlay';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isProvider, isAdmin, loading, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
    <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="navigation" aria-label="Main navigation">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/map"
            aria-current={pathname === '/map' ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname === '/map' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Map className="w-4 h-4" />
            Map
          </Link>
          <Link
            href="/explore"
            aria-current={pathname.startsWith('/explore') ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname.startsWith('/explore') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <BookOpen className="w-4 h-4" />
            Explore
          </Link>
          <Link
            href="/itineraries"
            aria-current={pathname === '/itineraries' ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname === '/itineraries' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Route className="w-4 h-4" />
            Itineraries
          </Link>
          <Link
            href="/discover"
            aria-current={pathname === '/discover' ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname === '/discover' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Sparkles className="w-4 h-4" />
            Discover
          </Link>
          <Link
            href="/safety"
            aria-current={pathname === '/safety' ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname === '/safety' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Shield className="w-4 h-4" />
            Safety
          </Link>
          {isProvider && (
            <Link
              href="/dashboard"
              aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1 py-0.5 ${pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* AI Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:block">Search</span>
          </button>

          {loading ? (
            /* Skeleton while session is being verified — prevents flash of "sign in" button */
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" aria-hidden="true" />
          ) : isAuthenticated ? (
            <>
              <Link
                href="/trips"
                className={`hidden md:flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/trips') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Luggage className="w-4 h-4" />
                My Trips
              </Link>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/account'}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/trips'}>
                    <Luggage className="mr-2 h-4 w-4" />
                    Trips
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/trips#saved'}>
                    <Heart className="mr-2 h-4 w-4" />
                    Saved
                  </DropdownMenuItem>
                  {isProvider && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label="Sign in">
              <User className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}
