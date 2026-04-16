/**
 * Extracts metadata from social media URLs (YouTube, TikTok, Instagram Reels).
 * Uses oEmbed endpoints + OpenGraph tag fallback.
 * Includes in-memory cache to avoid re-fetching the same URL within a request batch.
 */

const metadataCache = new Map<string, { data: SocialMetadata; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'unknown';

export interface SocialMetadata {
  url: string;
  platform: SocialPlatform;
  title: string;
  description: string;
  author: string;
  thumbnail_url: string | null;
  embed_html: string | null;
  embed_url: string | null;
}

/**
 * Detect which platform a URL belongs to.
 */
export function detectPlatform(url: string): SocialPlatform {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '').replace('m.', '');

    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('instagram.com')) return 'instagram';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Extract metadata from a single social media URL.
 */
export async function extractMetadata(url: string): Promise<SocialMetadata> {
  // Check cache first
  const cached = metadataCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const platform = detectPlatform(url);

  const base: SocialMetadata = {
    url,
    platform,
    title: '',
    description: '',
    author: '',
    thumbnail_url: null,
    embed_html: null,
    embed_url: null,
  };

  try {
    // Try oEmbed first (works for YouTube and TikTok without auth)
    const oembedData = await fetchOembed(url, platform);
    if (oembedData) {
      base.title = oembedData.title || '';
      base.author = oembedData.author_name || '';
      base.thumbnail_url = oembedData.thumbnail_url || null;
      base.embed_html = oembedData.html || null;
    }

    // Supplement with OpenGraph tags (gets description, better title)
    const ogData = await fetchOpenGraph(url);
    if (ogData) {
      if (!base.title && ogData.title) base.title = ogData.title;
      base.description = ogData.description || base.title;
      if (!base.thumbnail_url && ogData.image) base.thumbnail_url = ogData.image;
    }

    // Build embed URL for inline players
    base.embed_url = buildEmbedUrl(url, platform);

    // Cache the result
    metadataCache.set(url, { data: base, ts: Date.now() });

    return base;
  } catch (error) {
    console.error(`Failed to extract metadata for ${url}:`, error);
    return base;
  }
}

/**
 * Extract metadata from multiple URLs in parallel.
 */
export async function extractMetadataBatch(
  urls: string[]
): Promise<SocialMetadata[]> {
  return Promise.all(urls.map(extractMetadata));
}

// --- Internal helpers ---

interface OembedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  html?: string;
  type?: string;
}

async function fetchOembed(
  url: string,
  platform: SocialPlatform
): Promise<OembedResponse | null> {
  const endpoints: Record<string, string> = {
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  };

  const endpoint = endpoints[platform];
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'VZTourism/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
}

async function fetchOpenGraph(url: string): Promise<OpenGraphData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; VZTourismBot/1.0; +https://vzexplorer.com)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Parse OpenGraph meta tags with regex (lightweight, no DOM dependency)
    const getOgTag = (property: string): string | undefined => {
      const patterns = [
        new RegExp(
          `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
          'i'
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`,
          'i'
        ),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return decodeHtmlEntities(match[1]);
      }
      return undefined;
    };

    return {
      title: getOgTag('title'),
      description: getOgTag('description'),
      image: getOgTag('image'),
    };
  } catch {
    return null;
  }
}

function buildEmbedUrl(url: string, platform: SocialPlatform): string | null {
  try {
    const u = new URL(url);

    if (platform === 'youtube') {
      // Extract video ID
      let videoId: string | null = null;
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (platform === 'tiktok') {
      // TikTok embed URL format
      const match = url.match(/\/video\/(\d+)/);
      if (match?.[1]) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
    }

    if (platform === 'instagram') {
      // Instagram embed
      const cleanUrl = url.split('?')[0];
      return `${cleanUrl}embed/`;
    }
  } catch {
    // ignore
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
