'use client';

import Link from 'next/link';
import { Logo } from '@/components/common/Logo';

export function DemoFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              The all-in-one platform connecting international travelers with
              authentic Venezuelan experiences.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/explore"
                  className="hover:text-foreground transition-colors"
                >
                  Browse Experiences
                </Link>
              </li>
              <li>
                <Link
                  href="/itineraries"
                  className="hover:text-foreground transition-colors"
                >
                  Itineraries
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="hover:text-foreground transition-colors"
                >
                  Map
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="hover:text-foreground transition-colors"
                >
                  Safety Zones
                </Link>
              </li>
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="font-semibold text-sm mb-4">For Providers</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/provider-register"
                  className="hover:text-foreground transition-colors"
                >
                  List Your Posada
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Provider Dashboard
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-foreground transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="mailto:team@vzexplorer.com"
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VZ Explorer. Discover Venezuela.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
