import Link from 'next/link';
import { Logo } from './Logo';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={`border-t bg-muted/30 ${className ?? ''}`}>
      <div className="container px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Discover the incredible beauty of Venezuela with AI-powered travel planning.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/library" className="hover:text-foreground transition-colors">All Experiences</Link></li>
              <li><Link href="/library/category/beaches" className="hover:text-foreground transition-colors">Beaches</Link></li>
              <li><Link href="/library/category/mountains" className="hover:text-foreground transition-colors">Mountains</Link></li>
              <li><Link href="/library/category/eco-tours" className="hover:text-foreground transition-colors">Eco-Tours</Link></li>
              <li><Link href="/explore" className="hover:text-foreground transition-colors">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Destinations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/library/region/los-roques" className="hover:text-foreground transition-colors">Los Roques</Link></li>
              <li><Link href="/library/region/merida" className="hover:text-foreground transition-colors">Mérida</Link></li>
              <li><Link href="/library/region/margarita" className="hover:text-foreground transition-colors">Margarita Island</Link></li>
              <li><Link href="/library/region/canaima" className="hover:text-foreground transition-colors">Canaima</Link></li>
              <li><Link href="/library/region/gran-sabana" className="hover:text-foreground transition-colors">Gran Sabana</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">For Providers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/provider-register" className="hover:text-foreground transition-colors">List Your Experience</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Provider Dashboard</Link></li>
              <li><Link href="/safety" className="hover:text-foreground transition-colors">Safety Guidelines</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VZ Explorer. Discover Venezuela.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
