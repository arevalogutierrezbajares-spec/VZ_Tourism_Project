/**
 * Mock Anthropic / Claude streaming client.
 */

export type MockToolCallHandler = (name: string, input: Record<string, unknown>) => Promise<unknown>;

let mockStreamText = 'Here are some great options for you in Venezuela!';
let mockToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

export function setMockStreamText(text: string) {
  mockStreamText = text;
}

export function setMockToolCalls(calls: Array<{ name: string; input: Record<string, unknown> }>) {
  mockToolCalls = calls;
}

export function resetMockAnthropicState() {
  mockStreamText = 'Here are some great options for you in Venezuela!';
  mockToolCalls = [];
}

// Mock streamSearch that invokes onText then handles tool calls
export const mockStreamSearch = jest.fn(
  async (
    _messages: unknown[],
    onText: (t: string) => void,
    handleToolCall: MockToolCallHandler
  ) => {
    // Emit tool calls first
    for (const call of mockToolCalls) {
      await handleToolCall(call.name, call.input);
    }
    // Emit text
    onText(mockStreamText);
  }
);
