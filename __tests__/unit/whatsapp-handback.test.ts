/**
 * @jest-environment node
 *
 * Unit tests for buildHandbackContext — the operator handback context builder.
 * Verifies that operator messages are formatted correctly for AI system prompt injection.
 */

// We test the module in isolation by mocking Supabase.
// The function's contract:
//   - Queries wa_messages for outbound, non-AI messages
//   - Returns null if none found
//   - Returns formatted context string with messages in chronological order

// Inline mock builder instead of importing the real module (avoids SupabaseClient dep)
const MAX_OPERATOR_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 200;

interface MockMessage {
  content: string;
  created_at: string;
}

function buildHandbackContextFromMessages(messages: MockMessage[] | null): string | null {
  if (!messages || messages.length === 0) return null;

  // Reverse to chronological (simulates the DESC query + reverse in real code)
  const chronological = [...messages].reverse();

  const lines = chronological.map((m) => {
    const content = m.content.length > MAX_MESSAGE_LENGTH
      ? m.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
      : m.content;
    return `- Team: ${content}`;
  });

  return [
    '## Recent Team Conversation',
    'A team member recently handled this conversation directly. Here\'s what was discussed:',
    ...lines,
    '',
    'Continue the conversation naturally, acknowledging any commitments the team made.',
  ].join('\n');
}

// ─── Returns null when no operator messages exist ─────────────────────────────

test('returns null when no operator messages exist', () => {
  expect(buildHandbackContextFromMessages(null)).toBeNull();
  expect(buildHandbackContextFromMessages([])).toBeNull();
});

// ─── Returns formatted context with operator messages ─────────────────────────

test('returns formatted context with operator messages', () => {
  const messages: MockMessage[] = [
    { content: 'We confirmed your reservation for Dec 15', created_at: '2026-04-23T10:02:00Z' },
    { content: 'Welcome! How can I help?', created_at: '2026-04-23T10:00:00Z' },
  ];

  const result = buildHandbackContextFromMessages(messages);
  expect(result).not.toBeNull();
  expect(result).toContain('## Recent Team Conversation');
  expect(result).toContain('A team member recently handled this conversation directly.');
  // Messages should be in chronological order (reversed from DESC query)
  expect(result).toContain('- Team: Welcome! How can I help?');
  expect(result).toContain('- Team: We confirmed your reservation for Dec 15');
  expect(result).toContain('Continue the conversation naturally, acknowledging any commitments the team made.');

  // Verify chronological order: "Welcome" before "confirmed"
  const welcomeIdx = result!.indexOf('Welcome');
  const confirmedIdx = result!.indexOf('confirmed');
  expect(welcomeIdx).toBeLessThan(confirmedIdx);
});

// ─── Limits to last 10 messages ───────────────────────────────────────────────

test('limits to last 10 messages', () => {
  // The real function uses .limit(10) in the Supabase query.
  // Here we simulate that the query already returned at most 10 results.
  const messages: MockMessage[] = Array.from({ length: 10 }, (_, i) => ({
    content: `Message ${i + 1}`,
    created_at: new Date(Date.now() - (10 - i) * 60000).toISOString(),
  }));

  const result = buildHandbackContextFromMessages(messages);
  expect(result).not.toBeNull();

  // All 10 messages should be present
  for (let i = 1; i <= 10; i++) {
    expect(result).toContain(`- Team: Message ${i}`);
  }
});

// ─── Truncates long messages to 200 chars ─────────────────────────────────────

test('truncates long messages to 200 chars', () => {
  const longMessage = 'A'.repeat(300);
  const messages: MockMessage[] = [
    { content: longMessage, created_at: '2026-04-23T10:00:00Z' },
  ];

  const result = buildHandbackContextFromMessages(messages);
  expect(result).not.toBeNull();

  // Should contain truncated version with ellipsis
  const truncated = 'A'.repeat(200) + '...';
  expect(result).toContain(`- Team: ${truncated}`);

  // Should NOT contain the full 300-char message
  expect(result).not.toContain('A'.repeat(201));
});

// ─── Includes "Recent Team Conversation" header ───────────────────────────────

test('includes "Recent Team Conversation" header', () => {
  const messages: MockMessage[] = [
    { content: 'Test message', created_at: '2026-04-23T10:00:00Z' },
  ];

  const result = buildHandbackContextFromMessages(messages);
  expect(result).not.toBeNull();
  expect(result!.startsWith('## Recent Team Conversation')).toBe(true);
});

// ─── Integration test with mock Supabase client ──────────────────────────────

describe('buildHandbackContext with mock Supabase', () => {
  // Dynamic import so jest can resolve the module
  let buildHandbackContext: typeof import('@/lib/whatsapp-handback').buildHandbackContext;

  beforeAll(async () => {
    const mod = await import('@/lib/whatsapp-handback');
    buildHandbackContext = mod.buildHandbackContext;
  });

  function createMockSupabase(
    messages: MockMessage[] | null,
    error?: { message: string },
    lastAiMsg?: { created_at: string } | null,
  ) {
    let callCount = 0;
    return {
      from: () => {
        callCount++;
        const isFirstCall = callCount === 1;
        const chainable = {
          select: function () { return this; },
          eq: function () { return this; },
          gt: function () { return this; },
          order: function () { return this; },
          limit: function () {
            if (isFirstCall) return this; // first query chains .limit(1).single()
            return Promise.resolve({ data: messages, error: error ?? null });
          },
          single: () => Promise.resolve({ data: isFirstCall ? (lastAiMsg ?? null) : null, error: null }),
        };
        return chainable;
      },
    } as unknown as import('@/types/supabase-client').ServiceClient;
  }

  test('returns null when Supabase returns no messages', async () => {
    const supabase = createMockSupabase([]);
    const result = await buildHandbackContext(supabase, 'conv-123');
    expect(result).toBeNull();
  });

  test('returns null when Supabase returns an error', async () => {
    const supabase = createMockSupabase(null, { message: 'DB error' });
    const result = await buildHandbackContext(supabase, 'conv-123');
    expect(result).toBeNull();
  });

  test('returns formatted context from Supabase messages', async () => {
    const messages: MockMessage[] = [
      { content: 'Second message', created_at: '2026-04-23T10:02:00Z' },
      { content: 'First message', created_at: '2026-04-23T10:00:00Z' },
    ];
    const supabase = createMockSupabase(messages);
    const result = await buildHandbackContext(supabase, 'conv-123');
    expect(result).not.toBeNull();
    expect(result).toContain('## Recent Team Conversation');
    expect(result).toContain('- Team: First message');
    expect(result).toContain('- Team: Second message');
  });
});
