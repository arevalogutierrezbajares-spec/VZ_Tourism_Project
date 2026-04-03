import { NextRequest, NextResponse } from 'next/server';
import { getListingBySlug } from '@/lib/local-listings';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude/client';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const listing = getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  try {
    const anthropic = getAnthropicClient();

    const businessType = listing.type || 'posada';
    const region = listing.city || listing.region || 'Venezuela';
    const rating = listing.avg_rating ?? 0;
    const reviews = listing.review_count ?? 0;
    const name = listing.name;

    const prompt = `You are a travel copywriter for VZ Explorer, a platform showcasing Venezuela's best hotels and posadas. Write a compelling 3-paragraph listing description in English for this business.

Business details:
- Name: ${name}
- Type: ${businessType}
- Location: ${region}, Venezuela
- Google rating: ${rating}/5 based on ${reviews} reviews
- Website: ${listing.website ?? 'not provided'}

Requirements:
- Paragraph 1: Welcoming intro that captures the essence and unique charm of this place (2-3 sentences)
- Paragraph 2: Highlight the location, what guests can experience nearby, and why travelers choose this area of Venezuela (2-3 sentences)
- Paragraph 3: Call to action mentioning value, the Venezuelan hospitality, and what makes this a memorable stay (1-2 sentences)
- Tone: Warm, trustworthy, aspirational — not generic
- Do NOT invent specific amenities or features you don't know about
- Keep it under 200 words total
- Output only the description text, no labels or headers`;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((b) => ('text' in b ? b.text : ''))
      .join('');

    return NextResponse.json({ description: text });
  } catch (err) {
    console.error('[ai-description] Error generating description:', err);
    // Fallback description
    const fallback = `${listing.name} is a wonderful place to stay in ${listing.city ?? listing.region}, Venezuela. With a rating of ${listing.avg_rating ?? 'N/A'}/5 from ${listing.review_count} travelers, it has established itself as a trusted choice for visitors exploring this beautiful region.\n\nNestled in the heart of Venezuela, guests enjoy easy access to local attractions, authentic cuisine, and the warm hospitality that this country is known for. The surrounding area offers unique experiences that make every stay memorable.\n\nBook your stay and discover why travelers keep coming back to experience the best of Venezuelan hospitality at ${listing.name}.`;
    return NextResponse.json({ description: fallback });
  }
}
