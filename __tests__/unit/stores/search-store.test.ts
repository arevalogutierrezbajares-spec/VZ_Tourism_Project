import { useSearchStore } from '@/stores/search-store';

// Reset store state before each test
beforeEach(() => {
  useSearchStore.setState({
    query: '',
    filters: {},
    results: [],
    conversationHistory: [],
    isStreaming: false,
    streamingText: '',
    suggestions: [
      'Beaches near Los Roques',
      'Adventure in Mérida',
      'Family eco-tour',
      'Best waterfalls',
      'Food tour Caracas',
    ],
    isFilterOpen: false,
    hasSearched: false,
  });
});

describe('search-store initial state', () => {
  it('has correct initial state', () => {
    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.filters).toEqual({});
    expect(state.results).toEqual([]);
    expect(state.conversationHistory).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.streamingText).toBe('');
    expect(state.isFilterOpen).toBe(false);
    expect(state.hasSearched).toBe(false);
  });

  it('has default suggestions', () => {
    const state = useSearchStore.getState();
    expect(state.suggestions.length).toBeGreaterThan(0);
  });
});

describe('setQuery', () => {
  it('updates query', () => {
    useSearchStore.getState().setQuery('Beaches in Los Roques');
    expect(useSearchStore.getState().query).toBe('Beaches in Los Roques');
  });

  it('can set empty query', () => {
    useSearchStore.getState().setQuery('something');
    useSearchStore.getState().setQuery('');
    expect(useSearchStore.getState().query).toBe('');
  });
});

describe('setFilters', () => {
  it('updates filters', () => {
    useSearchStore.getState().setFilters({ category: 'beaches', region: 'Los Roques' });
    const { filters } = useSearchStore.getState();
    expect(filters.category).toBe('beaches');
    expect(filters.region).toBe('Los Roques');
  });

  it('can set price range filters', () => {
    useSearchStore.getState().setFilters({ minPrice: 50, maxPrice: 200 });
    const { filters } = useSearchStore.getState();
    expect(filters.minPrice).toBe(50);
    expect(filters.maxPrice).toBe(200);
  });
});

describe('resetFilters', () => {
  it('resets filters to empty object', () => {
    useSearchStore.getState().setFilters({ category: 'beaches' });
    useSearchStore.getState().resetFilters();
    expect(useSearchStore.getState().filters).toEqual({});
  });
});

describe('addMessage', () => {
  it('appends message to conversationHistory', () => {
    useSearchStore.getState().addMessage({ role: 'user', content: 'Find me beaches' });
    const { conversationHistory } = useSearchStore.getState();
    expect(conversationHistory).toHaveLength(1);
    expect(conversationHistory[0]).toEqual({ role: 'user', content: 'Find me beaches' });
  });

  it('appends multiple messages in order', () => {
    useSearchStore.getState().addMessage({ role: 'user', content: 'Hello' });
    useSearchStore.getState().addMessage({ role: 'assistant', content: 'Hi there!' });
    const { conversationHistory } = useSearchStore.getState();
    expect(conversationHistory).toHaveLength(2);
    expect(conversationHistory[0].role).toBe('user');
    expect(conversationHistory[1].role).toBe('assistant');
  });
});

describe('streaming', () => {
  it('startStreaming sets isStreaming to true and clears streamingText', () => {
    useSearchStore.setState({ streamingText: 'old text' });
    useSearchStore.getState().startStreaming();
    const state = useSearchStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.streamingText).toBe('');
  });

  it('appendStreamText accumulates text', () => {
    useSearchStore.getState().startStreaming();
    useSearchStore.getState().appendStreamText('Hello ');
    useSearchStore.getState().appendStreamText('World');
    expect(useSearchStore.getState().streamingText).toBe('Hello World');
  });

  it('stopStreaming clears streaming state and saves text as assistant message', () => {
    useSearchStore.getState().startStreaming();
    useSearchStore.getState().appendStreamText('Here are some results...');
    useSearchStore.getState().stopStreaming();

    const state = useSearchStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingText).toBe('');

    const lastMessage = state.conversationHistory[state.conversationHistory.length - 1];
    expect(lastMessage?.role).toBe('assistant');
    expect(lastMessage?.content).toBe('Here are some results...');
  });
});

describe('clearConversation', () => {
  it('resets all conversation-related state', () => {
    useSearchStore.getState().addMessage({ role: 'user', content: 'Hello' });
    useSearchStore.setState({ streamingText: 'partial', isStreaming: true, hasSearched: true });
    useSearchStore.getState().clearConversation();

    const state = useSearchStore.getState();
    expect(state.conversationHistory).toEqual([]);
    expect(state.streamingText).toBe('');
    expect(state.isStreaming).toBe(false);
    expect(state.results).toEqual([]);
    expect(state.hasSearched).toBe(false);
  });
});

describe('toggleFilterPanel', () => {
  it('toggles isFilterOpen', () => {
    expect(useSearchStore.getState().isFilterOpen).toBe(false);
    useSearchStore.getState().toggleFilterPanel();
    expect(useSearchStore.getState().isFilterOpen).toBe(true);
    useSearchStore.getState().toggleFilterPanel();
    expect(useSearchStore.getState().isFilterOpen).toBe(false);
  });
});

describe('setHasSearched', () => {
  it('updates hasSearched flag', () => {
    useSearchStore.getState().setHasSearched(true);
    expect(useSearchStore.getState().hasSearched).toBe(true);
  });
});

describe('setSuggestions', () => {
  it('replaces suggestions array', () => {
    const newSuggestions = ['Tip 1', 'Tip 2'];
    useSearchStore.getState().setSuggestions(newSuggestions);
    expect(useSearchStore.getState().suggestions).toEqual(newSuggestions);
  });
});
