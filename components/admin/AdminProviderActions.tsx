'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

interface Props {
  providerId: string;
  isVerified: boolean;
}

export function AdminProviderActions({ providerId, isVerified }: Props) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(isVerified);

  async function toggleVerify() {
    setLoading(true);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !verified }),
      });
      if (!res.ok) throw new Error('Failed to update provider');
      setVerified(!verified);
      toast.success(verified ? 'Provider unverified' : 'Provider verified!');
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={verified ? 'outline' : 'default'}
      disabled={loading}
      onClick={toggleVerify}
    >
      {loading ? '...' : verified ? 'Revoke' : 'Verify'}
    </Button>
  );
}
