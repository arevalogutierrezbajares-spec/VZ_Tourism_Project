'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Listing } from '@/types/database';
import type { CreateListingRequest, UpdateListingRequest, ListingsQueryParams } from '@/types/api';
import toast from 'react-hot-toast';

export function useListings(params?: ListingsQueryParams) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(key, v));
            } else {
              searchParams.set(key, String(value));
            }
          }
        });
      }

      const response = await fetch(`/api/listings?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch listings');

      const data = await response.json();
      setListings(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const createListing = useCallback(async (data: CreateListingRequest): Promise<Listing | null> => {
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create listing');
      }

      const result = await response.json();
      setListings((prev) => [result.data, ...prev]);
      toast.success('Listing created!');
      return result.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create listing');
      return null;
    }
  }, []);

  const updateListing = useCallback(
    async (id: string, data: UpdateListingRequest): Promise<Listing | null> => {
      try {
        const response = await fetch(`/api/listings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update listing');

        const result = await response.json();
        setListings((prev) => prev.map((l) => (l.id === id ? result.data : l)));
        toast.success('Listing updated!');
        return result.data;
      } catch (error) {
        toast.error('Failed to update listing');
        return null;
      }
    },
    []
  );

  const deleteListing = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete listing');

      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success('Listing deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete listing');
      return false;
    }
  }, []);

  const togglePublish = useCallback(
    async (id: string, isPublished: boolean) => {
      return updateListing(id, { is_published: isPublished });
    },
    [updateListing]
  );

  return {
    listings,
    isLoading,
    total,
    page,
    setPage,
    fetchListings,
    createListing,
    updateListing,
    deleteListing,
    togglePublish,
  };
}
