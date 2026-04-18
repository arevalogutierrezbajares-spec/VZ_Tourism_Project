import { getGroqClient, GROQ_MODEL } from './groq';
import type { PosadaWhatsappConfig, WaMessage } from '@/types/database';

const MAX_HISTORY_MESSAGES = 20;

interface BuildReplyOptions {
  config: PosadaWhatsappConfig;
  providerName: string;      // business_name from providers table
  providerDescription: string;
  providerRegion: string;
  inboundText: string;
  history: WaMessage[];      // chronological, most recent last
  availabilityNote?: string; // e.g. "Available: Jun 1-15, Jul 3-10"
}

function buildSystemPrompt(opts: BuildReplyOptions): string {
  const { config, providerName, providerDescription, providerRegion } = opts;

  const formalityGuide =
    config.tone_formality === 'formal'
      ? 'Use formal, professional language. Use "usted" in Spanish.'
      : config.tone_formality === 'casual'
      ? 'Use warm, friendly, conversational language. Use "tú" in Spanish.'
      : 'Use neutral, polite language. Match the guest\'s register.';

  const langGuide =
    config.tone_language === 'es'
      ? 'Always respond in Spanish only.'
      : config.tone_language === 'en'
      ? 'Always respond in English only.'
      : 'Detect the guest\'s language and respond in the same language (Spanish or English).';

  const lengthGuide =
    config.response_length === 'brief'
      ? 'Keep replies short — 1-3 sentences max. WhatsApp messages should be concise.'
      : config.response_length === 'detailed'
      ? 'Provide thorough, complete information. Use line breaks for readability.'
      : 'Use 2-4 sentences. Enough to be helpful, not overwhelming.';

  const pressureGuide =
    config.booking_pressure === 'direct'
      ? 'When appropriate, clearly invite the guest to book: ask for dates, party size, and confirm availability.'
      : 'Gently suggest booking when natural. Never be pushy.';

  const upsellGuide = config.upsell_enabled
    ? 'If relevant, briefly mention additional services or upgrades the posada offers.'
    : '';

  const customBlock = config.custom_instructions
    ? `\nSpecial instructions from the posada owner:\n${config.custom_instructions}\n`
    : '';

  const availBlock = opts.availabilityNote
    ? `\nCurrent availability: ${opts.availabilityNote}\n`
    : '';

  return `You are ${config.persona_name}, a guest relations assistant at ${providerName} in ${providerRegion}, Venezuela.
${config.persona_bio ? `About you: ${config.persona_bio}` : ''}

About the property:
${providerDescription}
${availBlock}
Your role:
- Warmly welcome guests and answer their questions about the property.
- Help guests plan their visit and understand what is included.
- Facilitate bookings by collecting key info (dates, number of guests, room preference).
- Handle FAQs about check-in, amenities, location, and policies.
- If you don't know the answer, say you'll check and get back to them — never invent details.

Tone & style:
- ${formalityGuide}
- ${langGuide}
- ${lengthGuide}
- ${pressureGuide}
${upsellGuide}

Critical rules:
- You are ${config.persona_name} from the property team. Do not refer to yourself as an AI, bot, or assistant system.
- If a guest directly and sincerely asks whether they are speaking with a human or a bot, say: "Soy el asistente digital de ${providerName}. Si prefieres hablar con alguien del equipo directamente, con gusto te comunico." — then flag the conversation for human review. Never claim to be human.
- Never discuss pricing you are not sure about. Say you'll confirm.
- Never make commitments about bookings until a human confirms.
- Keep responses natural and warm — this is a WhatsApp conversation, not a formal email.
${customBlock}`;
}

function buildHistoryMessages(history: WaMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  return recent.map((m) => ({
    role: m.role === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));
}

export async function generateReply(opts: BuildReplyOptions): Promise<string> {
  const groq = getGroqClient();

  const systemPrompt = buildSystemPrompt(opts);
  const historyMessages = buildHistoryMessages(opts.history);

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: opts.inboundText },
  ];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    max_tokens: opts.config.response_length === 'brief' ? 150 : 400,
    temperature: 0.7,
    top_p: 0.9,
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response from Groq');

  return reply;
}

// Bot-question auto-response — consistent across posadas
export function getBotQuestionResponse(personaName: string, businessName: string, language: string): string {
  if (language === 'en') {
    return `I'm the digital assistant for ${businessName}. If you'd prefer to speak with someone from our team directly, I'm happy to connect you!`;
  }
  return `Soy el asistente digital de ${businessName}. Si prefieres hablar directamente con alguien del equipo, con gusto te comunico. 😊`;
}
