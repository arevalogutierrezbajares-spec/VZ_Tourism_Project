import Link from 'next/link';
import { Logo } from './Logo';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={`border-t bg-muted/30 ${className ?? ''}`} role="contentinfo">
      <div className="container px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty">
              Discover the incredible beauty of Venezuela with AI-powered travel planning.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-foreground transition-[color]">All Experiences</Link></li>
              <li><Link href="/explore/category/beaches" className="hover:text-foreground transition-[color]">Beaches</Link></li>
              <li><Link href="/explore/category/mountains" className="hover:text-foreground transition-[color]">Mountains</Link></li>
              <li><Link href="/explore/category/eco-tours" className="hover:text-foreground transition-[color]">Eco-Tours</Link></li>
              <li><Link href="/discover" className="hover:text-foreground transition-[color]">Inspiration</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Destinations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore/region/los-roques" className="hover:text-foreground transition-[color]">Los Roques</Link></li>
              <li><Link href="/explore/region/merida" className="hover:text-foreground transition-[color]">Merida</Link></li>
              <li><Link href="/explore/region/margarita" className="hover:text-foreground transition-[color]">Margarita Island</Link></li>
              <li><Link href="/explore/region/canaima" className="hover:text-foreground transition-[color]">Canaima</Link></li>
              <li><Link href="/explore/region/gran-sabana" className="hover:text-foreground transition-[color]">Gran Sabana</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">For Providers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/provider-register" className="hover:text-foreground transition-[color]">List Your Experience</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-[color]">Provider Dashboard</Link></li>
              <li><Link href="/safety" className="hover:text-foreground transition-[color]">Safety Guidelines</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VZ Explorer. Discover Venezuela.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-[color] focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-[color] focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-[color] focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
