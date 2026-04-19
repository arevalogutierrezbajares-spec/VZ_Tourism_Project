import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ShareButton } from '@/components/itinerary/ShareButton';

describe('ShareButton', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('renders share button', () => {
    render(<ShareButton title="My Itinerary" />);
    expect(screen.getByRole('button', { name: /share itinerary/i })).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('uses navigator.share when available', async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, share: mockShare },
      configurable: true,
    });

    render(<ShareButton title="My Itinerary" url="https://example.com/itinerary/1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /share itinerary/i }));
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: 'My Itinerary',
      url: 'https://example.com/itinerary/1',
    });
  });

  it('falls back to clipboard copy when navigator.share is unavailable', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { clipboard: { writeText: mockWriteText } },
      configurable: true,
    });

    render(<ShareButton title="My Itinerary" url="https://example.com/itinerary/1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /share itinerary/i }));
    });

    expect(mockWriteText).toHaveBeenCalledWith('https://example.com/itinerary/1');
  });

  it('shows "Link copied!" after clipboard copy', async () => {
    jest.useFakeTimers();
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { clipboard: { writeText: mockWriteText } },
      configurable: true,
    });

    render(<ShareButton title="My Itinerary" url="https://example.com/itinerary/1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(await screen.findByText('Link copied!')).toBeInTheDocument();

    // Reverts after timeout
    act(() => jest.advanceTimersByTime(2100));
    expect(screen.queryByText('Link copied!')).not.toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('falls back to clipboard when navigator.share throws', async () => {
    const mockShare = jest.fn().mockRejectedValue(new Error('AbortError'));
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { share: mockShare, clipboard: { writeText: mockWriteText } },
      configurable: true,
    });

    render(<ShareButton title="My Itinerary" url="https://example.com/1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(mockWriteText).toHaveBeenCalled();
  });
});
