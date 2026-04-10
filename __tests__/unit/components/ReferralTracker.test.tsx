import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ReferralTracker } from '@/components/itinerary/ReferralTracker';

const mockSearchParams = new Map<string, string>();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
  new Response(JSON.stringify({ tracked: true }), { status: 200 })
);

beforeEach(() => {
  fetchSpy.mockClear();
  mockSearchParams.clear();
});

describe('ReferralTracker', () => {
  it('fires POST when ref param is present', async () => {
    mockSearchParams.set('ref', 'test-code');

    render(<ReferralTracker itineraryId="itin-123" />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/itineraries/itin-123/track-referral',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ referral_code: 'test-code' }),
        })
      );
    });
  });

  it('does not fire POST when ref param is absent', () => {
    render(<ReferralTracker itineraryId="itin-123" />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders nothing', () => {
    mockSearchParams.set('ref', 'test-code');
    const { container } = render(<ReferralTracker itineraryId="itin-123" />);

    expect(container.innerHTML).toBe('');
  });
});
