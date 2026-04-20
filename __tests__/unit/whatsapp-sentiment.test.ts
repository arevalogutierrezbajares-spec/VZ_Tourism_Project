/**
 * Unit tests for analyzeMessage() — lightweight bilingual sentiment filter.
 * Validates that abusive/threatening content is flagged while normal
 * conversational language (including words like "lawyer" or "damn" in
 * non-abusive context) does NOT trigger false positives.
 */

import { analyzeMessage, type SentimentResult } from '@/lib/sentiment';

// ─── Clear abuse → flagged ──────────────────────────────────────────────────

test('clear abuse in Spanish with multiple rude words is flagged', () => {
  // Multiple rude words push score below 0.45 threshold → flagged = true
  const result = analyzeMessage('eres un idiota, maldito estupido');
  expect(result.flagged).toBe(true);
  expect(result.flag_reason).toBe('abusive_language');
});

test('single rude word sets flag_reason but does not hard-flag', () => {
  // Using "basura" which matches only one list entry (no substring overlap)
  const result = analyzeMessage('esto es basura');
  expect(result.flagged).toBe(false);
  expect(result.flag_reason).toBe('rude_language');
});

test('multiple rude words in English are flagged as abusive', () => {
  const result = analyzeMessage('you stupid idiot scam artist');
  expect(result.flagged).toBe(true);
  expect(result.flag_reason).toBe('abusive_language');
});

// ─── Clear threat → flagged ─────────────────────────────────────────────────

test('threat in Spanish: "te voy a denunciar" is flagged', () => {
  const result = analyzeMessage('te voy a denunciar');
  expect(result.flagged).toBe(true);
  expect(result.flag_reason).toBe('threatening_language');
});

test('threat in English: "I will sue you" is flagged', () => {
  const result = analyzeMessage('I will sue you for this');
  expect(result.flagged).toBe(true);
  expect(result.flag_reason).toBe('threatening_language');
});

// ─── False positives (context-aware filtering) ─────────────────────────────

test('"my lawyer recommended this place" should NOT be flagged', () => {
  const result = analyzeMessage('my lawyer recommended this place');
  expect(result.flagged).toBe(false);
});

test('"that\'s damn good service" should have no flag_reason', () => {
  const result = analyzeMessage("that's damn good service");
  expect(result.flag_reason).toBeNull();
});

test('"the police station is nearby" should NOT be flagged', () => {
  const result = analyzeMessage('the police station is nearby');
  expect(result.flagged).toBe(false);
});

// ─── Bot questions ──────────────────────────────────────────────────────────

test('English bot question: "are you a bot" detected', () => {
  const result = analyzeMessage('are you a bot?');
  expect(result.is_bot_question).toBe(true);
  // Bot questions themselves should not be flagged as abusive
  expect(result.flag_reason).toBeNull();
});

test('Spanish bot question: "eres un bot" detected', () => {
  const result = analyzeMessage('eres un bot?');
  expect(result.is_bot_question).toBe(true);
});

test('non-bot question is not flagged as bot question', () => {
  const result = analyzeMessage('Hola, quiero reservar una habitacion');
  expect(result.is_bot_question).toBe(false);
});

// ─── Clean messages → not flagged ───────────────────────────────────────────

test('clean Spanish message is not flagged', () => {
  const result = analyzeMessage('Hola, quiero reservar una habitacion');
  expect(result.flagged).toBe(false);
  expect(result.flag_reason).toBeNull();
  expect(result.score).toBeGreaterThanOrEqual(0.7);
});

test('clean English message is not flagged', () => {
  const result = analyzeMessage('Hello, I would like to book a room for next weekend');
  expect(result.flagged).toBe(false);
  expect(result.flag_reason).toBeNull();
});

test('friendly compliment is not flagged', () => {
  const result = analyzeMessage('Me encanta la posada, todo perfecto!');
  expect(result.flagged).toBe(false);
  expect(result.score).toBeGreaterThanOrEqual(0.7);
});

// ─── Score range ────────────────────────────────────────────────────────────

test('score is always between 0 and 1', () => {
  // Extreme abuse should still produce a valid score
  const extreme = analyzeMessage('idiota estupido maldito basura asco pendejo');
  expect(extreme.score).toBeGreaterThanOrEqual(0);
  expect(extreme.score).toBeLessThanOrEqual(1);

  // Clean message should also be in range
  const clean = analyzeMessage('Buenos dias');
  expect(clean.score).toBeGreaterThanOrEqual(0);
  expect(clean.score).toBeLessThanOrEqual(1);
});
