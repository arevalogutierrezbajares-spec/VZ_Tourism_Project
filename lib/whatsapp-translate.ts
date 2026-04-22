/**
 * Lightweight language detection + translation via Groq.
 * Used to maintain an English audit trail of every WhatsApp conversation
 * so providers can always understand what guests are saying — regardless of language.
 *
 * Cost: ~$0 (Groq free tier, ~80ms latency)
 */

import { z } from 'zod';
import { getGroqClient, GROQ_MODEL } from './groq';

const DetectResultSchema = z.object({
  language: z.string().default('es'),
  name: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

const DetectAndTranslateSchema = z.object({
  language: z.string().default('es'),
  languageName: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  english: z.string().nullable().default(null),
});

export interface DetectResult {
  language: string;   // BCP-47 tag e.g. "es", "en", "pt", "fr", "de", "it", "zh"
  languageName: string; // Human-readable e.g. "Spanish"
  isEnglish: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Languages we expect to see in Venezuelan tourism context
const COMMON_LANGUAGES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
  ja: 'Japanese',
  ru: 'Russian',
  ar: 'Arabic',
};

/**
 * Detect the language of a text snippet.
 * Returns early for very short messages (greetings) — defaults to Spanish.
 */
export async function detectLanguage(text: string): Promise<DetectResult> {
  // For very short messages, skip the API call
  if (text.trim().length < 4) {
    return { language: 'es', languageName: 'Spanish', isEnglish: false, confidence: 'low' };
  }

  const groq = getGroqClient();

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a language detector. Reply ONLY with a JSON object: {"language":"<BCP-47 code>","name":"<language name in English>","confidence":"high|medium|low"}. No markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Detect the language of this text:\n"${text.slice(0, 300)}"`,
        },
      ],
      max_tokens: 30,
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = DetectResultSchema.parse(JSON.parse(cleaned));

    const code = parsed.language.toLowerCase();
    const isEnglish = code === 'en' || code.startsWith('en-');

    return {
      language: code,
      languageName: parsed.name ?? COMMON_LANGUAGES[code] ?? code,
      isEnglish,
      confidence: parsed.confidence,
    };
  } catch {
    // Fallback: simple heuristic check for English words
    const englishWords = /\b(the|is|are|have|can|what|when|how|does|do|we|you|i|my|your|for|and|or|to|in|on|at)\b/i;
    const isEnglish = englishWords.test(text);
    return {
      language: isEnglish ? 'en' : 'es',
      languageName: isEnglish ? 'English' : 'Spanish',
      isEnglish,
      confidence: 'low',
    };
  }
}

/**
 * Translate text to English using Groq.
 * If text is already in English, returns it unchanged.
 * Preserves emoji, phone numbers, and URLs.
 */
export async function translateToEnglish(
  text: string,
  fromLanguage?: string
): Promise<string> {
  if (!text?.trim()) return text;

  // Skip translation if already English
  if (fromLanguage === 'en' || fromLanguage?.startsWith('en-')) return text;

  const groq = getGroqClient();

  try {
    const langHint = fromLanguage ? ` (from ${COMMON_LANGUAGES[fromLanguage] ?? fromLanguage})` : '';
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `Translate the following WhatsApp message to English${langHint}. Return ONLY the translation — no explanation, no quotes, no prefix. Preserve emoji, phone numbers, URLs, and proper nouns.`,
        },
        { role: 'user', content: text },
      ],
      max_tokens: 400,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content?.trim() ?? text;
  } catch {
    return text; // Fail silently — original text is still stored
  }
}

/**
 * Detect language AND produce English translation in a single Groq call.
 * More efficient than calling detectLanguage() + translateToEnglish() separately.
 */
export async function detectAndTranslate(text: string): Promise<{
  detected: DetectResult;
  english: string | null; // null if already English
}> {
  if (!text?.trim()) {
    return {
      detected: { language: 'en', languageName: 'English', isEnglish: true, confidence: 'low' },
      english: null,
    };
  }

  const groq = getGroqClient();

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a language detector and translator. Given a WhatsApp message, return a JSON object with:
- "language": BCP-47 language code (e.g. "es", "en", "pt")
- "languageName": language name in English (e.g. "Spanish")
- "confidence": "high" | "medium" | "low"
- "english": English translation of the message, or null if the message is already in English

Rules:
- Preserve emoji, phone numbers, URLs, and proper nouns in the translation
- Return ONLY valid JSON — no markdown, no explanation
- If the text is too short to detect confidently, use confidence: "low" and guess Spanish`,
        },
        {
          role: 'user',
          content: text.slice(0, 500),
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = DetectAndTranslateSchema.parse(JSON.parse(cleaned));

    const code = parsed.language.toLowerCase();
    const isEnglish = code === 'en' || code.startsWith('en-');

    return {
      detected: {
        language: code,
        languageName: parsed.languageName ?? COMMON_LANGUAGES[code] ?? code,
        isEnglish,
        confidence: parsed.confidence,
      },
      english: isEnglish ? null : parsed.english,
    };
  } catch {
    // Fallback
    const isEnglish = /\b(the|is|are|have|can|what|when|how)\b/i.test(text);
    return {
      detected: {
        language: isEnglish ? 'en' : 'es',
        languageName: isEnglish ? 'English' : 'Spanish',
        isEnglish,
        confidence: 'low',
      },
      english: null,
    };
  }
}
