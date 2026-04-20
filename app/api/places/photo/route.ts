import { NextRequest } from 'next/server';

/**
 * GET /api/places/photo
 *
 * Server-side proxy for Google Places photos.
 * Keeps the API key on the server and caches responses for 24 hours.
 */
export async function GET(request: NextRequest) {
  const photoName = request.nextUrl.searchParams.get('ref');
  const rawMaxWidth = parseInt(request.nextUrl.searchParams.get('maxWidth') || '800', 10);
  const maxWidth = String(Math.min(Math.max(isNaN(rawMaxWidth) ? 800 : rawMaxWidth, 100), 2000));

  if (!photoName) {
    return new Response('Missing photo reference', { status: 400 });
  }

  // SSRF guard: only allow valid Google Places photo references
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(photoName)) {
    return new Response('Invalid photo reference', { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response('Service unavailable', { status: 503 });
  }

  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) {
      return new Response('Photo not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const body = response.body;

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Failed to fetch photo', { status: 502 });
  }
}
