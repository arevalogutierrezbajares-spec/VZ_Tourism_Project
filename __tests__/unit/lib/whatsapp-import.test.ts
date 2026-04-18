/**
 * Unit tests for lib/whatsapp-import.ts
 *
 * These are pure function tests — no network, no DB, no mocking needed.
 * They cover the most critical data-integrity path: if parsing is wrong,
 * every lesson extracted from a WhatsApp history is wrong.
 */

import {
  parseWhatsAppExport,
  detectProviderName,
  buildConversationPairs,
} from '@/lib/whatsapp-import';

// ─── Test fixtures ────────────────────────────────────────────────────────

const IOS_CHAT = `
[15/03/2024, 10:23:45] Carlos: Hola! Bienvenidos a Posada Los Roques. ¿En qué puedo ayudarle?
[15/03/2024, 10:24:12] Guest: Buenos días, ¿tienen disponibilidad para el 20 de marzo?
[15/03/2024, 10:24:45] Carlos: Sí, tenemos habitaciones disponibles para esa fecha. ¿Cuántas noches planea quedarse?
[15/03/2024, 10:25:00] Guest: Tres noches, somos 2 personas.
[15/03/2024, 10:25:30] Carlos: Perfecto. El precio es de $80 por noche para dos personas, incluye desayuno.
[16/03/2024, 09:00:00] Carlos: ¿Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[16/03/2024, 09:01:00] Guest: Excelente, ¿cómo puedo confirmar la reserva?
`.trim();

const ANDROID_CHAT = `
15/03/2024, 10:23 - Carlos: Hola! Bienvenidos a Posada Los Roques. ¿En qué puedo ayudarle?
15/03/2024, 10:24 - Guest: Buenos días, ¿tienen disponibilidad para el 20 de marzo?
15/03/2024, 10:24 - Carlos: Sí, tenemos habitaciones disponibles para esa fecha. ¿Cuántas noches planea quedarse?
15/03/2024, 10:25 - Guest: Tres noches, somos 2 personas.
15/03/2024, 10:25 - Carlos: Perfecto. El precio es de $80 por noche para dos personas, incluye desayuno.
15/03/2024, 10:26 - Guest: Excelente, ¿cómo puedo confirmar la reserva?
`.trim();

const MULTILINE_IOS = `
[15/03/2024, 10:23:45] Guest: Hola, tengo algunas preguntas sobre la posada.
¿Aceptan mascotas?
¿Tienen estacionamiento?
[15/03/2024, 10:24:30] Carlos: Hola! Con mucho gusto le respondo. No aceptamos mascotas, lo sentimos. Sí contamos con estacionamiento gratuito para nuestros huéspedes.
`.trim();

const SYSTEM_MESSAGES_CHAT = `
[15/03/2024, 10:00:00] Carlos: Hola, bienvenido.
[15/03/2024, 10:00:05] +1234567890: Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[15/03/2024, 10:01:00] Guest: ¿Cuál es el precio?
[15/03/2024, 10:01:30] Carlos: El precio es $80 por noche.
[15/03/2024, 10:02:00] Carlos: <Media omitted>
[15/03/2024, 10:03:00] Guest: Gracias.
`.trim();

// ─── parseWhatsAppExport ──────────────────────────────────────────────────

describe('parseWhatsAppExport', () => {
  describe('iOS format', () => {
    it('parses all human messages from an iOS export', () => {
      const turns = parseWhatsAppExport(IOS_CHAT);
      // System message line should be excluded, 6 real turns remain
      expect(turns.length).toBeGreaterThanOrEqual(5);
    });

    it('extracts correct sender and content', () => {
      const turns = parseWhatsAppExport(IOS_CHAT);
      const first = turns[0];
      expect(first.sender).toBe('Carlos');
      expect(first.content).toContain('Bienvenidos');
    });

    it('extracts timestamps', () => {
      const turns = parseWhatsAppExport(IOS_CHAT);
      expect(turns[0].timestamp).toBe('15/03/2024');
    });
  });

  describe('Android format', () => {
    it('parses all messages from an Android export', () => {
      const turns = parseWhatsAppExport(ANDROID_CHAT);
      expect(turns.length).toBe(6);
    });

    it('correctly parses sender names with Android format', () => {
      const turns = parseWhatsAppExport(ANDROID_CHAT);
      const senders = new Set(turns.map((t) => t.sender));
      expect(senders).toContain('Carlos');
      expect(senders).toContain('Guest');
    });
  });

  describe('multi-line messages', () => {
    it('concatenates continuation lines into one turn', () => {
      const turns = parseWhatsAppExport(MULTILINE_IOS);
      const guestTurn = turns.find((t) => t.sender === 'Guest');
      expect(guestTurn).toBeDefined();
      // Multi-line content should be joined
      expect(guestTurn!.content).toContain('¿Aceptan mascotas?');
      expect(guestTurn!.content).toContain('¿Tienen estacionamiento?');
    });

    it('does not split a multi-line message into multiple turns', () => {
      const turns = parseWhatsAppExport(MULTILINE_IOS);
      const guestTurns = turns.filter((t) => t.sender === 'Guest');
      expect(guestTurns.length).toBe(1);
    });
  });

  describe('system message filtering', () => {
    it('excludes "end-to-end encrypted" system notice', () => {
      const turns = parseWhatsAppExport(SYSTEM_MESSAGES_CHAT);
      const systemTurns = turns.filter((t) =>
        t.content.includes('end-to-end encrypted')
      );
      expect(systemTurns.length).toBe(0);
    });

    it('excludes "<Media omitted>" lines', () => {
      const turns = parseWhatsAppExport(SYSTEM_MESSAGES_CHAT);
      const mediaTurns = turns.filter((t) => t.content === '<Media omitted>');
      expect(mediaTurns.length).toBe(0);
    });

    it('keeps real messages after filtering system messages', () => {
      const turns = parseWhatsAppExport(SYSTEM_MESSAGES_CHAT);
      const realTurns = turns.filter((t) =>
        t.content.includes('precio') || t.content.includes('Hola')
      );
      expect(realTurns.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      expect(parseWhatsAppExport('')).toEqual([]);
    });

    it('returns empty array for string with no valid lines', () => {
      expect(parseWhatsAppExport('not a whatsapp export\njust random text')).toEqual([]);
    });

    it('handles export with only system messages', () => {
      const onlySystem = '[15/03/2024, 10:00:00] System: Messages and calls are end-to-end encrypted.';
      const turns = parseWhatsAppExport(onlySystem);
      expect(turns.length).toBe(0);
    });
  });
});

// ─── detectProviderName ──────────────────────────────────────────────────

describe('detectProviderName', () => {
  const turns = parseWhatsAppExport(IOS_CHAT);

  it('returns hint directly when provided', () => {
    const name = detectProviderName(turns, 'Carlos');
    expect(name).toBe('Carlos');
  });

  it('trims whitespace from hint', () => {
    const name = detectProviderName(turns, '  Carlos  ');
    expect(name).toBe('Carlos');
  });

  it('detects most active sender when no hint given', () => {
    // In IOS_CHAT, Carlos has 3 messages and Guest has 3 messages
    // When equal, the first in sort order wins — either way the result should be a real sender
    const name = detectProviderName(turns);
    expect(['Carlos', 'Guest']).toContain(name);
  });

  it('auto-detects the provider when they have significantly more messages', () => {
    const biasedTurns = parseWhatsAppExport(
      Array.from({ length: 5 }, (_, i) =>
        `[15/03/2024, 10:0${i}:00] Carlos: Message ${i + 1} from Carlos with enough text here.`
      ).join('\n') +
      '\n[15/03/2024, 10:10:00] Guest: Only one guest message here.'
    );
    const name = detectProviderName(biasedTurns);
    expect(name).toBe('Carlos');
  });
});

// ─── buildConversationPairs ──────────────────────────────────────────────

describe('buildConversationPairs', () => {
  it('builds pairs from a standard guest-then-provider sequence', () => {
    const turns = parseWhatsAppExport(IOS_CHAT);
    const pairs = buildConversationPairs(turns, 'Carlos');
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('sets question from guest and answer from provider', () => {
    const turns = parseWhatsAppExport(IOS_CHAT);
    const pairs = buildConversationPairs(turns, 'Carlos');
    const pricePair = pairs.find((p) => p.question.includes('noches'));
    expect(pricePair).toBeDefined();
    expect(pricePair!.answer).toContain('precio');
  });

  it('skips provider replies shorter than 20 characters', () => {
    const shortReply = `
[15/03/2024, 10:00:00] Guest: ¿Tienen wifi?
[15/03/2024, 10:00:10] Carlos: Sí.
[15/03/2024, 10:01:00] Guest: ¿Cuánto cuesta la habitación doble?
[15/03/2024, 10:01:30] Carlos: La habitación doble cuesta $80 por noche incluyendo desayuno.
    `.trim();
    const turns = parseWhatsAppExport(shortReply);
    const pairs = buildConversationPairs(turns, 'Carlos');
    // "Sí." is < 20 chars, should be skipped
    // "$80 por noche incluyendo desayuno" is ≥ 20 chars, should be kept
    expect(pairs.length).toBe(1);
    expect(pairs[0].answer).toContain('$80');
  });

  it('skips guest messages shorter than 5 characters', () => {
    const tinyGuest = `
[15/03/2024, 10:00:00] Guest: Ok
[15/03/2024, 10:00:10] Carlos: Perfecto, quedamos así entonces. Nos vemos el lunes.
    `.trim();
    const turns = parseWhatsAppExport(tinyGuest);
    const pairs = buildConversationPairs(turns, 'Carlos');
    expect(pairs.length).toBe(0);
  });

  it('skips provider turns that open the conversation (no preceding guest)', () => {
    const turns = parseWhatsAppExport(IOS_CHAT);
    const pairs = buildConversationPairs(turns, 'Carlos');
    // No pair should have the greeting as the answer (it had no guest Q before it)
    const greetingAnswer = pairs.find((p) => p.answer.includes('Bienvenidos'));
    expect(greetingAnswer).toBeUndefined();
  });

  it('returns empty array when no provider turns exist', () => {
    const turns = parseWhatsAppExport(IOS_CHAT);
    const pairs = buildConversationPairs(turns, 'NonExistentProvider');
    expect(pairs).toEqual([]);
  });

  it('finds provider reply within 3-turn window (pairs each non-provider sender)', () => {
    // Guest asks, a second person chimes in, provider answers — both non-provider
    // senders get paired with the provider's reply because each is within 3 turns.
    const chat = `
[15/03/2024, 10:00:00] Guest: ¿Tienen piscina?
[15/03/2024, 10:00:05] OtherPerson: Yo también quiero saber.
[15/03/2024, 10:00:30] Carlos: Sí, contamos con piscina y área de relajación disponible para todos los huéspedes.
    `.trim();
    const turns = parseWhatsAppExport(chat);
    const pairs = buildConversationPairs(turns, 'Carlos');
    // Both Guest and OtherPerson are non-provider senders within the 3-turn window
    expect(pairs.length).toBe(2);
    expect(pairs.every((p) => p.answer.includes('piscina'))).toBe(true);
  });
});
