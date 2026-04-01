import { useMapStore } from '@/stores/map-store';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';
import type { MapPin, MapRoute } from '@/types/map';

const initialState = {
  center: VENEZUELA_CENTER,
  zoom: VENEZUELA_DEFAULT_ZOOM,
  bearing: 0,
  pins: [],
  routes: [],
  selectedPin: null,
  safetyZones: [],
  showSafetyZones: false,
  is3DTerrain: false,
  isDarkMode: false,
};

beforeEach(() => {
  useMapStore.setState(initialState);
});

const mockPin: MapPin = {
  id: 'pin-1',
  lat: 8.6,
  lng: -71.15,
  title: 'Mérida Trek',
  price: 85,
  category: 'mountains',
  listingId: 'listing-uuid-1',
  isSelected: false,
};

const mockRoute: MapRoute = {
  id: 'route-1',
  coordinates: [[-71.15, 8.6], [-66.88, 10.48]],
  color: '#3B82F6',
  width: 3,
};

describe('map-store initial state', () => {
  it('is centered on Venezuela', () => {
    const state = useMapStore.getState();
    expect(state.center).toEqual(VENEZUELA_CENTER);
    expect(state.zoom).toBe(VENEZUELA_DEFAULT_ZOOM);
  });

  it('has correct defaults', () => {
    const state = useMapStore.getState();
    expect(state.bearing).toBe(0);
    expect(state.pins).toEqual([]);
    expect(state.routes).toEqual([]);
    expect(state.selectedPin).toBeNull();
    expect(state.showSafetyZones).toBe(false);
    expect(state.is3DTerrain).toBe(false);
    expect(state.isDarkMode).toBe(false);
  });
});

describe('setCenter', () => {
  it('updates center coordinates', () => {
    useMapStore.getState().setCenter([11.85, -66.75]);
    expect(useMapStore.getState().center).toEqual([11.85, -66.75]);
  });
});

describe('setZoom', () => {
  it('updates zoom level', () => {
    useMapStore.getState().setZoom(10);
    expect(useMapStore.getState().zoom).toBe(10);
  });
});

describe('addPin', () => {
  it('adds a pin to the map', () => {
    useMapStore.getState().addPin(mockPin);
    expect(useMapStore.getState().pins).toHaveLength(1);
    expect(useMapStore.getState().pins[0]).toEqual(mockPin);
  });

  it('replaces pin with same id (no duplicates)', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().addPin({ ...mockPin, title: 'Updated Title' });
    expect(useMapStore.getState().pins).toHaveLength(1);
    expect(useMapStore.getState().pins[0].title).toBe('Updated Title');
  });
});

describe('removePin', () => {
  it('removes the specified pin', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().removePin('pin-1');
    expect(useMapStore.getState().pins).toHaveLength(0);
  });

  it('clears selectedPin if the removed pin was selected', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.setState({ selectedPin: mockPin });
    useMapStore.getState().removePin('pin-1');
    expect(useMapStore.getState().selectedPin).toBeNull();
  });

  it('does not clear selectedPin if a different pin is removed', () => {
    const pin2 = { ...mockPin, id: 'pin-2' };
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().addPin(pin2);
    useMapStore.setState({ selectedPin: mockPin });
    useMapStore.getState().removePin('pin-2');
    expect(useMapStore.getState().selectedPin).not.toBeNull();
  });
});

describe('setSelectedPin', () => {
  it('sets the selected pin', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().setSelectedPin(mockPin);
    expect(useMapStore.getState().selectedPin).toEqual(mockPin);
  });

  it('marks the pin as selected in the pins array', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().setSelectedPin(mockPin);
    const pin = useMapStore.getState().pins.find((p) => p.id === 'pin-1');
    expect(pin?.isSelected).toBe(true);
  });

  it('clears selection when set to null', () => {
    useMapStore.getState().addPin(mockPin);
    useMapStore.getState().setSelectedPin(mockPin);
    useMapStore.getState().setSelectedPin(null);
    expect(useMapStore.getState().selectedPin).toBeNull();
  });
});

describe('toggleSafetyZones', () => {
  it('toggles showSafetyZones', () => {
    expect(useMapStore.getState().showSafetyZones).toBe(false);
    useMapStore.getState().toggleSafetyZones();
    expect(useMapStore.getState().showSafetyZones).toBe(true);
    useMapStore.getState().toggleSafetyZones();
    expect(useMapStore.getState().showSafetyZones).toBe(false);
  });
});

describe('addRoute / clearRoutes', () => {
  it('adds a route', () => {
    useMapStore.getState().addRoute(mockRoute);
    expect(useMapStore.getState().routes).toHaveLength(1);
  });

  it('replaces route with same id', () => {
    useMapStore.getState().addRoute(mockRoute);
    useMapStore.getState().addRoute({ ...mockRoute, color: '#FF0000' });
    expect(useMapStore.getState().routes).toHaveLength(1);
    expect(useMapStore.getState().routes[0].color).toBe('#FF0000');
  });

  it('clearRoutes empties the routes array', () => {
    useMapStore.getState().addRoute(mockRoute);
    useMapStore.getState().clearRoutes();
    expect(useMapStore.getState().routes).toEqual([]);
  });
});

describe('toggle3DTerrain', () => {
  it('toggles is3DTerrain', () => {
    useMapStore.getState().toggle3DTerrain();
    expect(useMapStore.getState().is3DTerrain).toBe(true);
    useMapStore.getState().toggle3DTerrain();
    expect(useMapStore.getState().is3DTerrain).toBe(false);
  });
});

describe('toggleDarkMode', () => {
  it('toggles isDarkMode', () => {
    useMapStore.getState().toggleDarkMode();
    expect(useMapStore.getState().isDarkMode).toBe(true);
    useMapStore.getState().toggleDarkMode();
    expect(useMapStore.getState().isDarkMode).toBe(false);
  });
});
