import { NextRequest, NextResponse } from 'next/server';
import { createContent } from '@/lib/discover-store';
import { requireAdmin } from '@/lib/api/require-auth';

export const runtime = 'nodejs';

interface OEmbedResponse {
  html: string;
  thumbnail_url?: string;
  author_name?: string;
  title?: string;
  width?: number;
  height?: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { url } = await request.json();
    if (!url || !url.includes('instagram.com')) {
      return NextResponse.json({ error: 'Valid Instagram URL required' }, { status: 400 });
    }

    // Fetch oEmbed data — no auth required for public posts
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true&maxwidth=600`;
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'VZTourism/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Instagram API error: ${res.status} — ${errText.slice(0, 200)}` },
        { status: 422 }
      );
    }

    const oembed: OEmbedResponse = await res.json();

    // Create the discover content item with data from oEmbed
    const caption = oembed.title || oembed.author_name || 'Instagram post';
    const item = createContent({
      type: 'instagram_embed',
      url: oembed.thumbnail_url ?? '',
      thumbnail_url: oembed.thumbnail_url ?? '',
      instagram_embed_html: oembed.html,
      instagram_post_url: url,
      creator_handle: oembed.author_name,
      caption,
      description: '',
      region: '',
      region_name: '',
      category: 'nature',
      tags: [],
      aspect: 1.0,
      featured: false,
      status: 'draft',
      source_type: 'instagram',
    });

    return NextResponse.json({ item, oembed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
