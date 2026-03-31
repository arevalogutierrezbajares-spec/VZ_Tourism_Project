'use client';

import { useCallback } from 'react';
import { useSearchStore } from '@/stores/search-store';
import { useMapStore } from '@/stores/map-store';
import type { Listing } from '@/types/database';
import toast from 'react-hot-toast';

export function useSearch() {
  const searchStore = useSearchStore();
  const mapStore = useMapStore();

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      searchStore.setQuery(query);
      searchStore.addMessage({ role: 'user', content: query });
      searchStore.startStreaming();
      searchStore.setHasSearched(true);

      try {
        const response = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            conversationHistory: searchStore.conversationHistory.slice(-10),
            filters: searchStore.filters,
          }),
        });

        if (!response.ok) throw new Error('Search failed');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'text') {
                  searchStore.appendStreamText(parsed.content);
                } else if (parsed.type === 'listings') {
                  const listings: Listing[] = parsed.data;
                  searchStore.setResults(listings);

                  // Update map pins
                  const pins = listings.map((l) => ({
                    id: l.id,
                    lat: l.latitude,
                    lng: l.longitude,
                    title: l.title,
                    price: l.price_usd,
                    currency: 'USD',
                    category: l.category,
                    rating: l.rating,
                    imageUrl: l.cover_image_url ?? undefined,
                    listingId: l.id,
                  }));
                  mapStore.setPins(pins);
                } else if (parsed.type === 'suggestions') {
                  searchStore.setSuggestions(parsed.data);
                }
              } catch {
                // Not JSON, skip
              }
            }
          }
        }

        searchStore.stopStreaming();
      } catch (error) {
        searchStore.stopStreaming();
        toast.error('Search failed. Please try again.');
        console.error('Search error:', error);
      }
    },
    [searchStore, mapStore]
  );

  const sendMessage = useCallback(
    (message: string) => {
      return search(message);
    },
    [search]
  );

  return {
    ...searchStore,
    search,
    sendMessage,
  };
}
