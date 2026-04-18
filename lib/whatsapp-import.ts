/**
 * WhatsApp Export Import Pipeline
 *
 * Parses WhatsApp chat exports (.txt) and extracts:
 * - Q&A pairs (stored as wa_lessons)
 * - Tone profile (stored in posada_knowledge.tone_profile)
 *
 * Supports both iOS and Android export formats.
 */

import { getGroqClient, GROQ_MODEL } from './groq';
import type { ToneProfile } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ParsedTurn {
  timestamp: string;
  sender: string;
  content: string;
}

export interface ConversationPair {
  question: string;  // guest message
  answer: string;    // provider reply
}

export interface ExtractedLesson {
  question_text: string;
  answer_text: string;
  context_tags: string[];
}

export interface ImportResult {
  turns_parsed: number;
  pairs_found: number;
  lessons_extracted: number;
  tone_profile: ToneProfile | null;
  provider_name_detected: string;
}

// ─── System messages to filter out ───────────────────────────────────────

const SYSTEM_MESSAGE_PATTERNS = [
  /Messages and calls are end-to-end encrypted/i,
  /^<Media omitted>$/i,
  /^This message was deleted$/i,
  /changed the subject to/i,
  /added you/i,
  /changed their phone number/i,
  /changed the group/i,
  /You created group/i,
  /left$/i,
  /joined using/i,
  /^null$/i,
  /^\s*$/,
];

function isSystemMessage(content: string): boolean {
  return SYSTEM_MESSAGE_PATTERNS.some((p) => p.test(content.trim()));
}

// ─── Parser ───────────────────────────────────────────────────────────────
//
// WhatsApp iOS:    [03/15/2024, 10:23:45] Name: message
// WhatsApp Android: 03/15/2024, 10:23 - Name: message
// Both can have multi-line messages (continuation lines have no timestamp)

const IOS_LINE = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+[\d:]+(?:\s*[APMapm]{2})?]\s+([^:]+):\s+(.+)$/;
const ANDROID_LINE = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+\d{1,2}:\d{2}(?:\s*[APMapm]{2})?\s+-\s+([^:]+):\s+(.+)$/;

export function parseWhatsAppExport(text: string): ParsedTurn[] {
  const lines = text.split('\n');
  const turns: ParsedTurn[] = [];
  let current: ParsedTurn | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const iosMatch = IOS_LINE.exec(line);
    const androidMatch = !iosMatch ? ANDROID_LINE.exec(line) : null;
    const match = iosMatch ?? androidMatch;

    if (match) {
      // Save previous turn
      if (current && !isSystemMessage(current.content)) {
        turns.push(current);
      }
      current = {
        timestamp: match[1],
        sender: match[2].trim(),
        content: match[3].trim(),
      };
    } else if (current) {
      // Continuation of previous message
      current.content += '\n' + line;
    }
  }

  if (current && !isSystemMessage(current.content)) {
    turns.push(current);
  }

  return turns;
}

// ─── Identify provider vs guest turns ────────────────────────────────────
//
// Provider name can be specified explicitly, or we auto-detect by finding
// the sender who has the most turns (most active in the export).

export function detectProviderName(turns: ParsedTurn[], hint?: string): string {
  if (hint?.trim()) return hint.trim();

  const counts = turns.reduce<Record<string, number>>((acc, t) => {
    acc[t.sender] = (acc[t.sender] ?? 0) + 1;
    return acc;
  }, {});

  // The provider (posada) is usually the most active sender
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Provider';
}

// ─── Build conversation pairs (guest Q → provider A) ─────────────────────
//
// We look for pairs where a guest message is immediately followed (within
// the next 3 turns) by a provider reply. This handles cases where the
// provider sends multiple messages in a row.

export function buildConversationPairs(
  turns: ParsedTurn[],
  providerName: string
): ConversationPair[] {
  const pairs: ConversationPair[] = [];
  const MIN_ANSWER_LENGTH = 20; // skip very short replies

  for (let i = 0; i < turns.length - 1; i++) {
    const guest = turns[i];
    if (guest.sender === providerName) continue;
    if (guest.content.length < 5) continue;

    // Find next provider reply within 3 turns
    for (let j = i + 1; j < Math.min(i + 4, turns.length); j++) {
      const provider = turns[j];
      if (provider.sender !== providerName) continue;
      if (provider.content.length < MIN_ANSWER_LENGTH) break;
      if (isSystemMessage(provider.content)) break;

      pairs.push({
        question: guest.content.trim(),
        answer: provider.content.trim(),
      });
      break;
    }
  }

  return pairs;
}

// ─── Groq extraction ──────────────────────────────────────────────────────
//
// Sends batches of conversation pairs to Groq and extracts clean Q&A lessons
// + infers the provider's tone profile from their messages.

const BATCH_SIZE = 25;
const MAX_PAIRS = 150;  // cap to stay within reasonable Groq token limits

export async function extractLessonsAndTone(
  pairs: ConversationPair[],
  providerTurns: ParsedTurn[]
): Promise<{ lessons: ExtractedLesson[]; tone_profile: ToneProfile | null }> {
  const allLessons: ExtractedLesson[] = [];
  const workingPairs = pairs.slice(0, MAX_PAIRS);

  // ─── Extract Q&A in batches ───────────────────────────────────────

  for (let i = 0; i < workingPairs.length; i += BATCH_SIZE) {
    const batch = workingPairs.slice(i, i + BATCH_SIZE);

    const conversationText = batch
      .map((p, idx) =>
        `[${idx + 1}]\nGUEST: ${p.question}\nPROVIDER: ${p.answer}`
      )
      .join('\n\n');

    const prompt = `You are analyzing WhatsApp conversations from a Venezuelan tourism posada (guesthouse).

Extract Q&A pairs that would be useful for training an AI assistant. Focus on:
- Specific questions about availability, pricing, amenities, location, check-in/out
- Answers that give concrete, reusable information
- Skip simple greetings, "ok", "thanks", confirmations without substance

For each useful pair, return:
- A clean, generalized question (remove specific dates/names, keep it universal)
- The ideal answer based on what the provider said
- 1-3 relevant tags from: pricing, availability, amenities, location, booking, cancellation, check-in, check-out, meals, parking, wifi, pets, transport, safety, groups

CONVERSATIONS:
${conversationText}

Return ONLY valid JSON:
{
  "qa_pairs": [
    {
      "question": "clean generalized question",
      "answer": "ideal answer text",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

    try {
      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2048,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as { qa_pairs?: ExtractedLesson[] };

      if (Array.isArray(parsed.qa_pairs)) {
        allLessons.push(...parsed.qa_pairs.filter(
          (l) => (l.question_text?.length ?? 0) > 0 || ((l as unknown as { question?: string }).question?.length ?? 0) > 0
        ).map((l) => {
          // Normalize field names (Groq sometimes uses question/answer instead of question_text/answer_text)
          const raw = l as unknown as Record<string, unknown>;
          return {
            question_text: (raw.question_text ?? raw.question ?? '') as string,
            answer_text: (raw.answer_text ?? raw.answer ?? '') as string,
            context_tags: (raw.tags ?? raw.context_tags ?? []) as string[],
          };
        }));
      }
    } catch (err) {
      console.error(`[whatsapp-import] batch ${i / BATCH_SIZE + 1} extraction error:`, err);
    }
  }

  // ─── Extract tone profile from provider messages ──────────────────

  const toneProfile = await extractToneProfile(providerTurns);

  return { lessons: deduplicateLessons(allLessons), tone_profile: toneProfile };
}

// ─── Tone profile extraction ──────────────────────────────────────────────

async function extractToneProfile(
  providerTurns: ParsedTurn[]
): Promise<ToneProfile | null> {
  if (providerTurns.length < 5) return null;

  // Sample up to 40 provider messages for tone analysis
  const sample = providerTurns
    .filter((t) => t.content.length > 15)
    .slice(0, 40)
    .map((t) => t.content)
    .join('\n---\n');

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{
        role: 'user',
        content: `Analyze the communication style of this WhatsApp business owner (posada/guesthouse).

MESSAGES:
${sample}

Return ONLY valid JSON describing their tone:
{
  "formality": "formal|warm-informal|casual",
  "emoji_usage": "none|minimal|moderate|heavy",
  "avg_response_length": "1 sentence|2-3 sentences|detailed paragraphs",
  "language": "Spanish only|Spanish with occasional English|bilingual",
  "typical_greeting": "their most common greeting phrase (exact text if found)"
}`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 256,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as Partial<ToneProfile>;

    return {
      formality: (['formal', 'warm-informal', 'casual'].includes(parsed.formality ?? '')
        ? parsed.formality
        : 'warm-informal') as ToneProfile['formality'],
      emoji_usage: (['none', 'minimal', 'moderate', 'heavy'].includes(parsed.emoji_usage ?? '')
        ? parsed.emoji_usage
        : 'minimal') as ToneProfile['emoji_usage'],
      avg_response_length: parsed.avg_response_length ?? '2-3 sentences',
      language: parsed.language ?? 'Spanish only',
      typical_greeting: parsed.typical_greeting ?? 'Hola!',
    };
  } catch {
    return null;
  }
}

// ─── Deduplicate lessons by question text ─────────────────────────────────

export function deduplicateLessons(lessons: ExtractedLesson[]): ExtractedLesson[] {
  const seen = new Set<string>();
  return lessons.filter((l) => {
    // Normalize: lowercase, trim punctuation for comparison
    const key = l.question_text.toLowerCase().replace(/[^\w\s]/g, '').trim().slice(0, 80);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return l.answer_text.length >= 15; // filter out empty/trivial answers
  });
}
