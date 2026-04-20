import { NextRequest, NextResponse } from 'next/server';
import { autocomplete } from '@/lib/google-places';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimit(getClientIp(request), 30);
  if (rateLimitRes) return rateLimitRes;

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'Places service not configured' }, { status: 503 });
  }

  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const regionCode = request.nextUrl.searchParams.get('region') || 'VE';
  const lang = request.nextUrl.searchParams.get('lang') || 'es';

  try {
    const results = await autocomplete(query, {
      regionCode,
      languageCode: lang,
    });
    return NextResponse.json({ suggestions: results });
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}
