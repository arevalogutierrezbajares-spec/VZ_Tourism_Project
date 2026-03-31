'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Map, BookOpen, User, LayoutDashboard, Shield } from 'lucide-react';
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
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isProvider, isAdmin, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Map className="w-4 h-4" />
            Explore
          </Link>
          <Link
            href="/library"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/library') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <BookOpen className="w-4 h-4" />
            Library
          </Link>
          <Link
            href="/safety"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${pathname === '/safety' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Shield className="w-4 h-4" />
            Safety
          </Link>
          {isProvider && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
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
                <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {isProvider && (
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Sign in</Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
