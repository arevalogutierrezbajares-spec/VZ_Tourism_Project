import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      // Scraped listing image hosts
      { protocol: 'https', hostname: 'static.cupid.travel' },
      { protocol: 'https', hostname: '*.bstatic.com' },
      { protocol: 'https', hostname: 'dynamic-media-cdn.tripadvisor.com' },
      { protocol: 'https', hostname: 'images.trvl-media.com' },
      { protocol: 'https', hostname: 'media.vrbo.com' },
      { protocol: 'https', hostname: 'photos.hotelbeds.com' },
      { protocol: 'https', hostname: 'p.fih.io' },
      { protocol: 'https', hostname: 'l.icdbcdn.com' },
      { protocol: 'https', hostname: 'd2hyz2bfif3cr8.cloudfront.net' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
