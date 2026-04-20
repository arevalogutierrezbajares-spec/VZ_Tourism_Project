'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { pmsApi } from './api';
import type { PmsUser, PmsProperty, PropertyMembership } from './types';

interface PmsContextValue {
  user: PmsUser | null;
  property: PmsProperty | null;
  properties: PropertyMembership[];
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  switchProperty: (propertyId: string) => void;
  refresh: () => Promise<void>;
}

const PmsContext = createContext<PmsContextValue | null>(null);

export function PmsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PmsUser | null>(null);
  const [property, setProperty] = useState<PmsProperty | null>(null);
  const [properties, setProperties] = useState<PropertyMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get user info (this triggers bridge auth if needed)
      const me = await pmsApi.get<{
        id: string;
        email: string;
        name: string;
        defaultPropertyId?: string;
        propertyMemberships?: { propertyId: string; role: string }[];
      }>('auth/me');

      setUser({ id: me.id, email: me.email, name: me.name, defaultPropertyId: me.defaultPropertyId });

      // Load properties
      const props = await pmsApi.get<{ id: string; name: string }[]>('properties');
      const memberships: PropertyMembership[] = props.map((p) => ({
        id: p.id,
        name: p.name,
        role: (me.propertyMemberships?.find((m) => m.propertyId === p.id)?.role as PropertyMembership['role']) || 'owner',
      }));
      setProperties(memberships);

      // Store property context if not already set
      const storedPropId = localStorage.getItem('pms_property_id');
      if (!storedPropId && me.defaultPropertyId) {
        localStorage.setItem('pms_property_id', me.defaultPropertyId);
      }

      // Load current property details
      if (props.length > 0) {
        try {
          const currentProp = await pmsApi.get<PmsProperty>('properties/current');
          setProperty(currentProp);
        } catch {
          // Property may not be set up yet
          setProperty(null);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load PMS';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const switchProperty = useCallback((propertyId: string) => {
    localStorage.setItem('pms_property_id', propertyId);
    window.location.reload();
  }, []);

  const needsOnboarding = !isLoading && !error && properties.length === 0;

  const value = useMemo(
    () => ({
      user,
      property,
      properties,
      isLoading,
      error,
      needsOnboarding,
      switchProperty,
      refresh: loadContext,
    }),
    [user, property, properties, isLoading, error, needsOnboarding, switchProperty, loadContext],
  );

  return <PmsContext.Provider value={value}>{children}</PmsContext.Provider>;
}

export function usePms(): PmsContextValue {
  const ctx = useContext(PmsContext);
  if (!ctx) {
    throw new Error('usePms must be used within <PmsProvider>');
  }
  return ctx;
}
