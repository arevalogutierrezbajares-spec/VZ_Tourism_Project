import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vz-explorer.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/itineraries`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Category pages
  const categories = [
    'beaches',
    'mountains',
    'cities',
    'eco-tours',
    'gastronomy',
    'adventure',
    'wellness',
    'cultural',
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/explore/category/${category}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Region pages
  const regions = [
    'los-roques',
    'merida',
    'canaima',
    'margarita',
    'caracas',
    'los-llanos',
    'delta-del-orinoco',
  ];

  const regionRoutes: MetadataRoute.Sitemap = regions.map((region) => ({
    url: `${BASE_URL}/explore/region/${region}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // TODO: Add dynamic listing URLs by querying Supabase:
  // const { data: listings } = await supabase.from('listings').select('slug, updated_at').eq('is_published', true);
  // const listingRoutes = listings?.map(l => ({ url: `${BASE_URL}/listing/${l.slug}`, lastModified: new Date(l.updated_at), priority: 0.6 })) ?? [];

  return [...staticRoutes, ...categoryRoutes, ...regionRoutes];
}
