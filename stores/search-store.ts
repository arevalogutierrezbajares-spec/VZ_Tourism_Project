import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Listing } from '@/types/database';
import type { AIMessage } from '@/types/api';

interface SearchFilters {
  category?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  safetyLevel?: string;
  tags?: string[];
}

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: Listing[];
  conversationHistory: AIMessage[];
  isStreaming: boolean;
  streamingText: string;
  suggestions: string[];
  isFilterOpen: boolean;
  hasSearched: boolean;
}

interface SearchActions {
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  resetFilters: () => void;
  addMessage: (message: AIMessage) => void;
  setResults: (results: Listing[]) => void;
  startStreaming: () => void;
  appendStreamText: (text: string) => void;
  stopStreaming: () => void;
  setSuggestions: (suggestions: string[]) => void;
  clearConversation: () => void;
  toggleFilterPanel: () => void;
  setHasSearched: (hasSearched: boolean) => void;
}

type SearchStore = SearchState & SearchActions;

export const useSearchStore = create<SearchStore>()(
  devtools(
    (set) => ({
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

      setQuery: (query) => set({ query }),

      setFilters: (filters) => set({ filters }),

      resetFilters: () => set({ filters: {} }),

      addMessage: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        })),

      setResults: (results) => set({ results }),

      startStreaming: () => set({ isStreaming: true, streamingText: '' }),

      appendStreamText: (text) =>
        set((state) => ({ streamingText: state.streamingText + text })),

      stopStreaming: () =>
        set((state) => ({
          isStreaming: false,
          conversationHistory: [
            ...state.conversationHistory,
            { role: 'assistant', content: state.streamingText },
          ],
          streamingText: '',
        })),

      setSuggestions: (suggestions) => set({ suggestions }),

      clearConversation: () =>
        set({
          conversationHistory: [],
          streamingText: '',
          isStreaming: false,
          results: [],
          hasSearched: false,
        }),

      toggleFilterPanel: () =>
        set((state) => ({ isFilterOpen: !state.isFilterOpen })),

      setHasSearched: (hasSearched) => set({ hasSearched }),
    }),
    { name: 'search-store' }
  )
);
