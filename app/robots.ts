import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vz-explorer.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/dashboard',
          '/demo',
          '/api/',
          '/ruta',
          '/(ruta)',
          '/(admin)',
          '/(provider)',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
