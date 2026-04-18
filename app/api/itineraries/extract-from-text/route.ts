import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { matchSpotsBatch } from '@/lib/match-spots';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET_MODEL = 'claude-sonnet-4-5-20241022';

export interface ExtractedSpot {
  extracted_name: string;
  matched_listing_id: string | null;
  matched_listing_title: string | null;
  confidence: 'high' | 'medium' | 'low';
  region: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ExtractedDay {
  day: number;
  title: string;
  spots: ExtractedSpot[];
}

/**
 * POST /api/itineraries/extract-from-text
 *
 * Takes plain text (trip notes, Google Doc paste, etc.) and uses Sonnet to
 * extract an ordered list of spots with day structure. Batch-matches against DB.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') || '';
  let text = '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pastedText = formData.get('text') as string | null;
    if (file) {
      text = await file.text();
    } else if (pastedText) {
      text = pastedText;
    }
  } else {
    const body = await request.json();
    text = body.text || '';
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
  }

  if (text.length > 50000) {
    return NextResponse.json({ error: 'Text too long (max 50,000 characters)' }, { status: 400 });
  }

  const prompt = `You are analyzing trip notes or travel plans for Venezuela. Extract every specific place, destination, hotel, restaurant, attraction, beach, or point of interest mentioned.

Here are the trip notes:

---
${text}
---

Extract all places into a day-by-day structure. If the notes don't specify days, group logically by geography.

Return ONLY a JSON array (no markdown, no code fences) with this structure:
[
  {
    "day": 1,
    "title": "Caracas Arrival",
    "spots": [
      {
        "extracted_name": "Hotel Humboldt",
        "region": "capital",
        "description": "Iconic hotel on top of El Ávila mountain"
      }
    ]
  }
]

Rules:
- region should be the Venezuelan state in lowercase with underscores
- Be specific with place names — use the exact name from the notes
- If the text mentions timing hints, note them in the description
- If no day structure is obvious, create logical groupings by geography
- Don't invent places not mentioned — only extract what's in the text`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content.find((c) => c.type === 'text')?.text || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ days: [], message: 'Could not extract any places from the text' });
    }

    const rawDays: {
      day: number;
      title: string;
      spots: { extracted_name: string; region: string | null; description: string | null }[];
    }[] = JSON.parse(jsonMatch[0]);

    // Flatten all spots for batch matching (single DB query instead of N+1)
    const allRawSpots = rawDays.flatMap((d) =>
      d.spots.map((s) => ({ extracted_name: s.extracted_name, region: s.region }))
    );

    const allMatches = await matchSpotsBatch(allRawSpots);

    // Re-assemble into day structure with matches
    let matchIdx = 0;
    const days: ExtractedDay[] = rawDays.map((rawDay) => ({
      day: rawDay.day,
      title: rawDay.title,
      spots: rawDay.spots.map((spot) => {
        const match = allMatches[matchIdx++];
        return {
          extracted_name: spot.extracted_name,
          matched_listing_id: match?.listing_id || null,
          matched_listing_title: match?.listing_title || null,
          confidence: match?.confidence || 'low',
          region: spot.region,
          description: spot.description,
          latitude: match?.latitude || null,
          longitude: match?.longitude || null,
        };
      }),
    }));

    return NextResponse.json({ days });
  } catch (err) {
    console.error('Extract from text error:', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
