import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ReferralTracker } from '@/components/itinerary/ReferralTracker';

const mockSearchParams = new Map<string, string>();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// `Response` is a Web API not available in the jsdom test environment.
// Use a plain object cast instead of `new Response(...)`.
const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({ tracked: true }),
  text: jest.fn().mockResolvedValue(JSON.stringify({ tracked: true })),
} as unknown as Response);

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
