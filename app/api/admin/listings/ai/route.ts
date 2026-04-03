import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { updateListing, bulkUpdate, loadAll } from '@/lib/admin-store';

const MODEL = 'claude-opus-4-5';

interface ListingInput {
  id: string;
  name: string;
  type?: string;
  region?: string;
  city?: string;
  avg_rating?: number | null;
  review_count?: number;
  description?: string;
  category_tags?: string[];
  [key: string]: unknown;
}

async function generateDescription(listing: ListingInput): Promise<string> {
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Write a compelling 2-3 sentence tourism description for this Venezuelan listing:
Name: ${listing.name}
Type: ${listing.type || 'unknown'}
Region: ${listing.region || 'Venezuela'}
City: ${listing.city || ''}
Rating: ${listing.avg_rating || 'N/A'} (${listing.review_count || 0} reviews)

Write in English. Be vivid and specific. Focus on the experience. No generic filler.`,
      },
    ],
  });
  return (msg.content[0] as { type: string; text: string }).text.trim();
}

async function generateTags(listing: ListingInput): Promise<string[]> {
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Suggest 5-8 smart tags for this Venezuelan tourism listing. Return ONLY a JSON array of strings, no other text.
Name: ${listing.name}
Type: ${listing.type}
Region: ${listing.region}
Description: ${listing.description}`,
      },
    ],
  });
  const text = (msg.content[0] as { type: string; text: string }).text.trim();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Extract array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
    return [];
  }
}

async function autoCategorize(listing: ListingInput): Promise<{ type: string; reason: string }> {
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Categorize this Venezuelan tourism listing. Return ONLY valid JSON with keys "type" and "reason".
Valid types: hotel, posada, restaurante, cafe, bar, tours, experience, transfer, hospedaje
Name: ${listing.name}
Current type: ${listing.type}
Description: ${listing.description}`,
      },
    ],
  });
  const text = (msg.content[0] as { type: string; text: string }).text.trim();
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
    return { type: listing.type || 'other', reason: 'Could not auto-categorize' };
  }
}

async function commandQuery(query: string): Promise<{
  filter: {
    search?: string;
    category?: string;
    region?: string;
    status?: string;
    missingData?: string;
  };
  explanation: string;
}> {
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Convert this admin search query into filter parameters for a Venezuelan tourism listings database. Return ONLY valid JSON with keys: filter (object with optional keys: search, category, region, status, missingData) and explanation (string).

Valid categories: hotels, restaurants, experiences, other
Valid regions: caracas, margarita, merida, los-roques, canaima, gran-sabana, other
Valid statuses: published, draft, featured, archived
Valid missingData values: description, tags, phone, website, cover_image_url

Query: "${query}"`,
      },
    ],
  });
  const text = (msg.content[0] as { type: string; text: string }).text.trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
    return { filter: { search: query }, explanation: 'Searching for: ' + query };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, id, ids, listing, query, save } = body as {
    action: string;
    id?: string;
    ids?: string[];
    listing?: ListingInput;
    query?: string;
    save?: boolean;
  };

  try {
    switch (action) {
      case 'generate_description': {
        if (!listing) return NextResponse.json({ error: 'listing required' }, { status: 400 });
        const description = await generateDescription(listing);
        if (save && id) {
          await updateListing(id, { description });
        }
        return NextResponse.json({ description });
      }

      case 'improve_description': {
        if (!listing) return NextResponse.json({ error: 'listing required' }, { status: 400 });
        const original = listing.description || '';
        const anthropic = getAnthropicClient();
        const msg = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `Improve this Venezuelan tourism listing description. Make it more compelling, specific, and vivid. Keep similar length (2-3 sentences).

Name: ${listing.name}
Type: ${listing.type}
Region: ${listing.region}
Current description: ${original}

Return ONLY the improved description, nothing else.`,
            },
          ],
        });
        const improved = (msg.content[0] as { type: string; text: string }).text.trim();
        if (save && id) {
          await updateListing(id, { description: improved });
        }
        return NextResponse.json({ original, improved });
      }

      case 'generate_tags': {
        if (!listing) return NextResponse.json({ error: 'listing required' }, { status: 400 });
        const tags = await generateTags(listing);
        if (save && id) {
          await updateListing(id, { category_tags: tags });
        }
        return NextResponse.json({ tags });
      }

      case 'auto_categorize': {
        if (!listing) return NextResponse.json({ error: 'listing required' }, { status: 400 });
        const result = await autoCategorize(listing);
        if (save && id) {
          await updateListing(id, { type: result.type, category: result.type });
        }
        return NextResponse.json(result);
      }

      case 'improve_name': {
        if (!listing) return NextResponse.json({ error: 'listing required' }, { status: 400 });
        const anthropic = getAnthropicClient();
        const msg = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: `Clean up and improve this Venezuelan tourism listing name. Remove unnecessary caps, fix formatting. Return ONLY the improved name.
Current name: ${listing.name}
Type: ${listing.type}
City: ${listing.city}`,
            },
          ],
        });
        const improved = (msg.content[0] as { type: string; text: string }).text.trim();
        if (save && id) {
          await updateListing(id, { name: improved });
        }
        return NextResponse.json({ original: listing.name, improved });
      }

      case 'bulk_generate_descriptions': {
        if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 });
        const all = loadAll();
        const targets = all.filter((l) => ids.includes(l.id));
        const results: Array<{ id: string; name: string; description: string }> = [];

        for (const target of targets) {
          const description = await generateDescription(target as unknown as ListingInput);
          results.push({ id: target.id, name: target.name, description });
          if (save) {
            await updateListing(target.id, { description });
          }
        }
        return NextResponse.json({ results, saved: !!save });
      }

      case 'bulk_auto_tag': {
        if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 });
        const all = loadAll();
        const targets = all.filter((l) => ids.includes(l.id));
        const results: Array<{ id: string; name: string; tags: string[] }> = [];

        for (const target of targets) {
          const tags = await generateTags(target as unknown as ListingInput);
          results.push({ id: target.id, name: target.name, tags });
          if (save) {
            await updateListing(target.id, { category_tags: tags });
          }
        }
        return NextResponse.json({ results, saved: !!save });
      }

      case 'command_query': {
        if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
        const result = await commandQuery(query);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'AI request failed', detail: String(err) }, { status: 500 });
  }
}
