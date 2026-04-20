import { getGroqClient, GROQ_MODEL } from './groq';
import type { PosadaWhatsappConfig, PosadaKnowledge, WaMessage } from '@/types/database';

const MAX_HISTORY_MESSAGES = 20;

interface BuildReplyOptions {
  config: PosadaWhatsappConfig;
  providerName: string;
  providerDescription: string;
  providerRegion: string;
  inboundText: string;
  history: WaMessage[];
  knowledge?: PosadaKnowledge | null;
  availabilityNote?: string;
  liveContext?: string;
}

// ─── Knowledge base formatter ─────────────────────────────────────────────────
// Converts structured DB rows into clean readable text for the system prompt.

function formatKnowledge(k: PosadaKnowledge, providerName: string): string {
  const lines: string[] = [];

  if (k.property_description) {
    lines.push(`## About ${providerName}\n${k.property_description}`);
  }

  if (k.location_details) {
    lines.push(`## Location & How to Get Here\n${k.location_details}`);
  }

  if (k.room_types?.length) {
    lines.push('## Rooms & Rates');
    for (const room of k.room_types) {
      const roomLines = [
        `**${room.name}** — $${room.price_usd}/night · Up to ${room.capacity} guests`,
      ];
      if (room.description) roomLines.push(room.description);
      if (room.amenities?.length) roomLines.push(`Includes: ${room.amenities.join(', ')}`);
      lines.push(roomLines.join('\n'));
    }
  }

  if (k.amenities?.length) {
    lines.push(`## Amenities\n${k.amenities.join(' · ')}`);
  }

  if (Object.keys(k.policies ?? {}).length) {
    const p = k.policies;
    const policyLines: string[] = [];
    if (p.check_in)         policyLines.push(`Check-in: ${p.check_in}`);
    if (p.check_out)        policyLines.push(`Check-out: ${p.check_out}`);
    if (p.min_stay_nights)  policyLines.push(`Minimum stay: ${p.min_stay_nights} night${p.min_stay_nights > 1 ? 's' : ''}`);
    if (p.cancellation)     policyLines.push(`Cancellation: ${p.cancellation}`);
    if (p.deposit_percent)  policyLines.push(`Deposit: ${p.deposit_percent}% required`);
    if (p.pets)             policyLines.push(`Pets: ${p.pets}`);
    if (p.smoking)          policyLines.push(`Smoking: ${p.smoking}`);
    if (p.extra_guest_fee)  policyLines.push(`Extra guest fee: ${p.extra_guest_fee}`);
    if (policyLines.length) lines.push(`## Policies\n${policyLines.join('\n')}`);
  }

  if (k.booking_process) {
    lines.push(`## How to Book\n${k.booking_process}`);
  }

  if (k.payment_methods?.length) {
    lines.push(`## Payment Methods\n${k.payment_methods.join(', ')}`);
  }

  if (k.nearby_attractions) {
    lines.push(`## Nearby & Local Tips\n${k.nearby_attractions}`);
  }

  if (k.languages_spoken?.length) {
    lines.push(`## Languages Spoken\n${k.languages_spoken.join(', ')}`);
  }

  if (k.faqs?.length) {
    lines.push('## Frequently Asked Questions');
    for (const faq of k.faqs) {
      lines.push(`Q: ${faq.question}\nA: ${faq.answer}`);
    }
  }

  if (k.special_notes) {
    lines.push(`## Additional Notes\n${k.special_notes}`);
  }

  return lines.join('\n\n');
}

// ─── Custom instructions sanitizer ───────────────────────────────────────────
// Strips prompt-injection patterns and enforces a 2,000 character max.

const INJECTION_PATTERNS = [
  /\[NEEDS_HUMAN:[^\]]*\]/gi,          // our own HITL tag
  /##\s/g,                             // markdown H2 headers used as role dividers
  /<\|/g,                              // token boundary markers (e.g. <|im_start|>)
  /\|>/g,                              // closing token boundary markers
  /ignore\s+(?:all\s+)?previous\s+instructions?/gi,
  /you\s+are\s+now\b/gi,
  /pretend\s+you\s+are\b/gi,
  /disregard\s+(?:all\s+)?(?:previous\s+)?instructions?/gi,
  /act\s+as\s+(?:if\s+you\s+are\b)?/gi,
];

function sanitizeCustomInstructions(raw: string): string {
  let sanitized = raw;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  // Collapse excess whitespace created by removals
  sanitized = sanitized.replace(/\s{3,}/g, '\n\n').trim();
  // Enforce 2,000 character max
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000);
  }
  return sanitized;
}

// ─── System prompt builder ────────────────────────────────────────────────────

export function buildSystemPrompt(opts: BuildReplyOptions): string {
  const { config, providerName, providerDescription, providerRegion, knowledge } = opts;

  const formalityGuide =
    config.tone_formality === 'formal'
      ? 'Use formal, professional language. Use "usted" in Spanish.'
      : config.tone_formality === 'casual'
      ? 'Use warm, friendly, conversational language. Use "tú" in Spanish.'
      : "Use neutral, polite language. Match the guest's register.";

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
    ? `\nSpecial instructions from the posada owner:\n${sanitizeCustomInstructions(config.custom_instructions)}\n`
    : '';

  const availBlock = opts.availabilityNote
    ? `\nCurrent availability: ${opts.availabilityNote}\n`
    : '';

  // Knowledge base block — rich structured context
  const knowledgeBlock = knowledge
    ? `\n---\n# Property Knowledge Base\n\n${formatKnowledge(knowledge, providerName)}\n---\n`
    : knowledge === null
    ? `\nAbout the property:\n${providerDescription}\n`
    : `\nAbout the property:\n${providerDescription}\n`;

  // Live context block (availability + dynamic pricing)
  const liveBlock = opts.liveContext
    ? `\n---\n${opts.liveContext}\n---\n`
    : '';

  return `You are ${config.persona_name}, a guest relations assistant at ${providerName} in ${providerRegion}, Venezuela.
${config.persona_bio ? `About you: ${config.persona_bio}` : ''}
${knowledgeBlock}${liveBlock}${availBlock}
Your role:
- Warmly welcome guests and answer their questions using the property knowledge base above.
- If the knowledge base contains the answer, use it precisely — prices, policies, room names.
- For pricing questions, use the Live Property Data section above — it contains today's adjusted prices.
- Help guests plan their visit and understand what is included.
- Facilitate bookings by collecting key info (dates, number of guests, room preference).
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
- Quote prices and policies from the knowledge base exactly. If uncertain, say you'll confirm.
- Never make firm booking commitments — collect the info and say the team will confirm.
- Keep responses natural and warm — this is a WhatsApp conversation, not a formal email.
${customBlock}
Human-in-the-loop escalation:
When you are NOT confident you can answer accurately, you MUST:
1. Give the guest a warm holding response (e.g. "Déjame verificar eso con el equipo y te confirmo en breve.")
2. Append this exact tag at the very end of your message (the system will strip it before sending to the guest):
   [NEEDS_HUMAN: <brief reason in English, max 15 words>]

Escalate when:
- Guest asks for availability/pricing for specific dates you cannot confirm from Live Property Data
- Guest wants to negotiate price, request a special deal, or asks about corporate rates
- Large group inquiry (8+ guests) or special event (wedding, corporate retreat, birthday)
- Guest has a complaint or issue about a past stay
- Guest asks for something not covered in the knowledge base
- Guest explicitly asks to speak with a team member or manager
- You are genuinely unsure and guessing would risk misleading the guest

Do NOT append the tag for routine questions you can answer confidently from the knowledge base.`;
}

function buildHistoryMessages(history: WaMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
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
    temperature: 0.3,
    top_p: 0.9,
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response from Groq');
  return reply;
}

// Exported for testing / preview
export { formatKnowledge };

// Bot-question auto-response
export function getBotQuestionResponse(personaName: string, businessName: string, language: string): string {
  if (language === 'en') {
    return `I'm the digital assistant for ${businessName}. If you'd prefer to speak with someone from our team directly, I'm happy to connect you!`;
  }
  return `Soy el asistente digital de ${businessName}. Si prefieres hablar directamente con alguien del equipo, con gusto te comunico. 😊`;
}
