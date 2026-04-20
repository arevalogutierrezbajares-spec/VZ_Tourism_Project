import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Hotel,
  UtensilsCrossed,
  Compass,
  Camera,
  MapPin,
  ListChecks,
  ArrowRight,
  Sparkles,
  Download,
  RefreshCw,
} from 'lucide-react';
import { getAllListings, mapTypeToCategory, getRegionCounts } from '@/lib/local-listings';

export const metadata: Metadata = { title: 'VZ Admin — Dashboard' };

export default function AdminPage() {
  const all = getAllListings();

  const hotels = all.filter((l) => mapTypeToCategory(l.type) === 'stays').length;
  const restaurants = all.filter((l) => mapTypeToCategory(l.type) === 'dining').length;
  const experiences = all.filter((l) => mapTypeToCategory(l.type) === 'experiences').length;
  const withPhotos = all.filter((l) => l.cover_image_url).length;
  const regionCounts = getRegionCounts();
  const regionCount = Object.keys(regionCounts).length;
  const withoutDesc = all.filter((l) => !l.description || l.description.length < 30).length;
  const withoutTags = all.filter((l) => !l.category_tags || l.category_tags.length === 0).length;

  const recent = [...all]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 8);

  const statCards = [
    { label: 'Total Listings', value: all.length.toLocaleString(), icon: ListChecks, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Hotels & Stays', value: hotels.toLocaleString(), icon: Hotel, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Restaurants', value: restaurants.toLocaleString(), icon: UtensilsCrossed, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Experiences', value: experiences.toLocaleString(), icon: Compass, color: '#10B981', bg: '#ECFDF5' },
    { label: 'With Photos', value: withPhotos.toLocaleString(), icon: Camera, color: '#EC4899', bg: '#FDF2F8' },
    { label: 'Regions', value: regionCount.toString(), icon: MapPin, color: '#6366F1', bg: '#EEF2FF' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Venezuela Tourism — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/listings/export"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            aria-label="Export all listings as CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </a>
          <Link
            href="/admin/listings"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium transition-colors"
          >
            <ListChecks className="w-4 h-4" />
            Manage Listings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-background rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-2xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Opportunities */}
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">AI Opportunities</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div>
                <div className="text-sm font-medium text-amber-900">{withoutDesc} missing descriptions</div>
                <div className="text-xs text-amber-600 mt-0.5">AI can generate instantly</div>
              </div>
              <Link
                href="/admin/listings?missingData=description"
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
              >
                Fix →
              </Link>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div>
                <div className="text-sm font-medium text-blue-900">{withoutTags} without tags</div>
                <div className="text-xs text-blue-600 mt-0.5">Auto-tag with AI</div>
              </div>
              <Link
                href="/admin/listings?missingData=tags"
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                Fix →
              </Link>
            </div>
          </div>
        </div>

        {/* Region Breakdown */}
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">By Region</h2>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(regionCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 7)
              .map(([region, count]) => {
                const pct = Math.round((count / all.length) * 100);
                return (
                  <div key={region} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize text-foreground">{region}</span>
                      <span className="text-muted-foreground">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Review New Scrapes', icon: RefreshCw, href: '/admin/scraper' },
              { label: 'Run AI Categorization', icon: Sparkles, href: '/admin/listings?action=ai_categorize' },
              { label: 'Export All CSV', icon: Download, href: '/api/admin/listings/export', external: true },
              { label: 'Manage Discover Feed', icon: Compass, href: '/admin/discover' },
            ].map(({ label, icon: Icon, href, external }) => (
              <Link
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted transition-all group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium flex-1">{label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Recently Added</h2>
          <Link href="/admin/listings" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recent.map((l) => (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted transition-colors">
              {l.cover_image_url ? (
                <img
                  src={l.cover_image_url}
                  alt={l.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{l.type} · {l.region}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground">
                  {l.avg_rating ? `★ ${l.avg_rating}` : '—'}
                </div>
                <span
                  className={`text-2xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block font-medium ${
                    l.status === 'published'
                      ? 'bg-status-confirmed/10 text-status-confirmed'
                      : 'bg-status-pending/10 text-status-pending'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
