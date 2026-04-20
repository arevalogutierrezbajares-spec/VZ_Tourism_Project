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
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Venezuela Tourism — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/listings/export"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            aria-label="Export all listings as CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </a>
          <Link
            href="/admin/listings"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white font-medium transition-colors"
            style={{ background: '#3B82F6' }}
          >
            <ListChecks className="w-4 h-4" />
            Manage Listings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Opportunities */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900 text-sm">AI Opportunities</h2>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">By Region</h2>
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
                      <span className="capitalize text-gray-700">{region}</span>
                      <span className="text-gray-400">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3B82F6' }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Review New Scrapes', icon: RefreshCw, href: '/admin/scraper', color: '#6366F1' },
              { label: 'Run AI Categorization', icon: Sparkles, href: '/admin/listings?action=ai_categorize', color: '#3B82F6' },
              { label: 'Export All CSV', icon: Download, href: '/api/admin/listings/export', color: '#10B981', external: true },
              { label: 'Manage Discover Feed', icon: Compass, href: '/admin/discover', color: '#F59E0B' },
            ].map(({ label, icon: Icon, href, color, external }) => (
              <Link
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-sm text-gray-700 font-medium flex-1">{label}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Recently Added</h2>
          <Link href="/admin/listings" className="text-xs text-blue-500 hover:text-blue-700">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.map((l) => (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
              {l.cover_image_url ? (
                <img
                  src={l.cover_image_url}
                  alt={l.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{l.name}</div>
                <div className="text-xs text-gray-400 capitalize">{l.type} · {l.region}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-500">
                  {l.avg_rating ? `★ ${l.avg_rating}` : '—'}
                </div>
                <div
                  className="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                  style={{
                    background: l.status === 'published' ? '#DCFCE7' : '#FEF3C7',
                    color: l.status === 'published' ? '#166534' : '#92400E',
                  }}
                >
                  {l.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
