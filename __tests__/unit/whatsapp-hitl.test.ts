/**
 * Unit tests for the HITL (Human-in-the-Loop) escalation tag parsing.
 * The regex must reliably detect and strip [NEEDS_HUMAN: reason] from AI replies
 * so the webhook can escalate the conversation for human review.
 */

// The regex from webhook/route.ts — keep in sync
const NEEDS_HUMAN_RE = /\[NEEDS_HUMAN:\s*([^\]]+)\]/;

function parseHitlTag(rawReply: string): { reply: string; needsHuman: boolean; reason: string | null } {
  const match = rawReply.match(NEEDS_HUMAN_RE);
  // Collapse double-spaces left behind when tag was mid-reply
  const reply = rawReply.replace(NEEDS_HUMAN_RE, '').replace(/\s{2,}/g, ' ').trim();
  return {
    reply,
    needsHuman: !!match,
    reason: match?.[1]?.trim() ?? null,
  };
}

// ─── Detection ────────────────────────────────────────────────────────────────

test('detects tag at end of reply', () => {
  const raw = 'Déjame verificar y te confirmo. [NEEDS_HUMAN: Guest asking about specific dates]';
  const { needsHuman, reason } = parseHitlTag(raw);
  expect(needsHuman).toBe(true);
  expect(reason).toBe('Guest asking about specific dates');
});

test('detects tag mid-reply (LLM may not follow instructions exactly)', () => {
  const raw = 'Voy a revisar. [NEEDS_HUMAN: special group request] ¡Con gusto!';
  const { needsHuman } = parseHitlTag(raw);
  expect(needsHuman).toBe(true);
});

test('detects tag with extra whitespace inside', () => {
  const raw = 'Un momento. [NEEDS_HUMAN:   price negotiation   ]';
  const { needsHuman, reason } = parseHitlTag(raw);
  expect(needsHuman).toBe(true);
  expect(reason).toBe('price negotiation');
});

test('no false positive on normal reply', () => {
  const raw = 'El precio es $120 por noche. ¿Para cuándo planeas viajar?';
  const { needsHuman } = parseHitlTag(raw);
  expect(needsHuman).toBe(false);
});

test('no false positive on reply containing brackets', () => {
  const raw = 'Habitaciones disponibles [Suite, Estándar]. ¿Cuál prefieres?';
  const { needsHuman } = parseHitlTag(raw);
  expect(needsHuman).toBe(false);
});

// ─── Stripping ────────────────────────────────────────────────────────────────

test('strips tag cleanly from end', () => {
  const raw = 'Te confirmo en breve. [NEEDS_HUMAN: availability check needed]';
  const { reply } = parseHitlTag(raw);
  expect(reply).toBe('Te confirmo en breve.');
  expect(reply).not.toContain('[NEEDS_HUMAN');
});

test('strips tag cleanly from mid-reply', () => {
  const raw = 'Voy a revisar. [NEEDS_HUMAN: reason] ¡Hasta pronto!';
  const { reply } = parseHitlTag(raw);
  expect(reply.trim()).toBe('Voy a revisar. ¡Hasta pronto!');
});

test('stripped reply has no trailing whitespace', () => {
  const raw = 'OK. [NEEDS_HUMAN: test]';
  const { reply } = parseHitlTag(raw);
  expect(reply).toBe('OK.');
});
