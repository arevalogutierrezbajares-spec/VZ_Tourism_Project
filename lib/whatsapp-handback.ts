/**
 * Builds context from operator messages during a human takeover session.
 * Injected into the AI system prompt when conversation switches back to AI mode,
 * so the AI knows what the operator discussed with the guest.
 */

import type { ServiceClient } from '@/types/supabase-client';

const MAX_OPERATOR_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 200;

export async function buildHandbackContext(
  supabase: ServiceClient,
  conversationId: string
): Promise<string | null> {
  // Find the last AI outbound message — only operator messages after it
  // belong to the most recent human takeover session
  const { data: lastAiMsg } = await supabase
    .from('wa_messages')
    .select('created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'outbound')
    .eq('is_ai', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Query operator messages from the most recent human session only
  let query = supabase
    .from('wa_messages')
    .select('content, created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'outbound')
    .eq('is_ai', false);

  if (lastAiMsg?.created_at) {
    query = query.gt('created_at', lastAiMsg.created_at);
  }

  const { data: messages, error } = await query
    .order('created_at', { ascending: false })
    .limit(MAX_OPERATOR_MESSAGES);

  if (error) {
    console.warn('[handback] Failed to query operator messages:', error.message);
    return null;
  }

  if (!messages || messages.length === 0) {
    return null;
  }

  // Reverse to chronological order (query was DESC for limit purposes)
  const chronological = messages.reverse();

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
