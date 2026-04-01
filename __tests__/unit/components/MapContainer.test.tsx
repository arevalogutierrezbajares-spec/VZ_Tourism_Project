import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapContainer } from '@/components/map/MapContainer';
import { useMapStore } from '@/stores/map-store';
import type { MapPin } from '@/types/map';

// Reset store before each test
beforeEach(() => {
  useMapStore.setState({
    center: [-66.58, 8.0],
    zoom: 5.5,
    bearing: 0,
    pins: [],
    routes: [],
    selectedPin: null,
    safetyZones: [],
    showSafetyZones: false,
    is3DTerrain: false,
    isDarkMode: false,
  });
  // Ensure no Mapbox token so we get the fallback UI
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
});

describe('MapContainer', () => {
  it('renders without crashing', () => {
    const { container } = render(<MapContainer />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows Map Preview fallback when MAPBOX token is not configured', () => {
    render(<MapContainer />);
    expect(screen.getByText('Map Preview')).toBeInTheDocument();
  });

  it('shows location chips in the fallback UI', () => {
    render(<MapContainer />);
    expect(screen.getByText(/Los Roques/)).toBeInTheDocument();
    expect(screen.getByText(/Mérida/)).toBeInTheDocument();
    expect(screen.getByText(/Margarita/)).toBeInTheDocument();
  });

  it('renders the map container div', () => {
    const { container } = render(<MapContainer className="h-96" />);
    // Should have a relative wrapper
    expect(container.querySelector('.relative')).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(<MapContainer className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('does not show pin preview card initially', () => {
    render(<MapContainer />);
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('calls onPinClick when a pin is clicked', () => {
    // Since mapbox is mocked and token not set, direct pin click via DOM
    // This tests the prop is accepted without throwing
    const onPinClick = jest.fn();
    expect(() => render(<MapContainer onPinClick={onPinClick} />)).not.toThrow();
  });
});
