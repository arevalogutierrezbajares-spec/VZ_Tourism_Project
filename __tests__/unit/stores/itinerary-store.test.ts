import { useItineraryStore } from '@/stores/itinerary-store';
import { mockItinerary } from '@/__tests__/fixtures';

const initialState = {
  current: null,
  days: [],
  totalCost: 0,
  isDirty: false,
  isSaving: false,
  isOpen: false,
};

beforeEach(() => {
  useItineraryStore.setState(initialState);
  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();
});

describe('itinerary-store initial state', () => {
  it('has correct initial state', () => {
    const state = useItineraryStore.getState();
    expect(state.current).toBeNull();
    expect(state.days).toEqual([]);
    expect(state.totalCost).toBe(0);
    expect(state.isDirty).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.isOpen).toBe(false);
  });
});

describe('setItinerary', () => {
  it('builds days from stops and sorts them', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    const { days, current } = useItineraryStore.getState();
    expect(current).toBe(mockItinerary);
    expect(days.length).toBeGreaterThan(0);
    // Day 1 should contain the stop
    expect(days[0].stops).toHaveLength(1);
    expect(days[0].stops[0].id).toBe('stop-uuid-1');
  });

  it('sets isDirty to false after loading', () => {
    useItineraryStore.setState({ isDirty: true });
    useItineraryStore.getState().setItinerary(mockItinerary);
    expect(useItineraryStore.getState().isDirty).toBe(false);
  });

  it('calculates total cost from stops', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    // mockItinerary has one stop with cost_usd: 85
    expect(useItineraryStore.getState().totalCost).toBe(85);
  });
});

describe('panel actions', () => {
  it('openPanel sets isOpen to true', () => {
    useItineraryStore.getState().openPanel();
    expect(useItineraryStore.getState().isOpen).toBe(true);
  });

  it('closePanel sets isOpen to false', () => {
    useItineraryStore.setState({ isOpen: true });
    useItineraryStore.getState().closePanel();
    expect(useItineraryStore.getState().isOpen).toBe(false);
  });

  it('togglePanel flips isOpen', () => {
    useItineraryStore.getState().togglePanel();
    expect(useItineraryStore.getState().isOpen).toBe(true);
    useItineraryStore.getState().togglePanel();
    expect(useItineraryStore.getState().isOpen).toBe(false);
  });
});

describe('addDay', () => {
  it('creates a new day', () => {
    useItineraryStore.getState().addDay();
    const { days } = useItineraryStore.getState();
    expect(days).toHaveLength(1);
    expect(days[0].day).toBe(1);
    expect(days[0].title).toBe('Day 1');
    expect(days[0].stops).toEqual([]);
  });

  it('increments day number', () => {
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    const { days } = useItineraryStore.getState();
    expect(days).toHaveLength(2);
    expect(days[1].day).toBe(2);
  });

  it('sets isDirty to true', () => {
    useItineraryStore.getState().addDay();
    expect(useItineraryStore.getState().isDirty).toBe(true);
  });
});

describe('removeDay', () => {
  it('removes the specified day', () => {
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().removeDay(2);
    const { days } = useItineraryStore.getState();
    expect(days).toHaveLength(2);
  });

  it('renumbers remaining days after removal', () => {
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().removeDay(1);
    const { days } = useItineraryStore.getState();
    expect(days[0].day).toBe(1);
    expect(days[1].day).toBe(2);
  });

  it('sets isDirty to true', () => {
    useItineraryStore.getState().addDay();
    useItineraryStore.setState({ isDirty: false });
    useItineraryStore.getState().removeDay(1);
    expect(useItineraryStore.getState().isDirty).toBe(true);
  });
});

describe('addStop', () => {
  beforeEach(() => {
    useItineraryStore.getState().addDay();
    useItineraryStore.setState({ isDirty: false });
  });

  const stopData = {
    itinerary_id: 'itinerary-uuid-1',
    listing_id: 'listing-uuid-1',
    day: 1,
    order: 0,
    title: 'Beach Visit',
    description: null,
    latitude: null,
    longitude: null,
    location_name: 'Los Roques',
    start_time: null,
    end_time: null,
    duration_hours: null,
    cost_usd: 50,
    transport_to_next: null,
    transport_duration_minutes: null,
    notes: null,
  };

  it('adds stop to the correct day', () => {
    useItineraryStore.getState().addStop(stopData);
    const { days } = useItineraryStore.getState();
    expect(days[0].stops).toHaveLength(1);
    expect(days[0].stops[0].title).toBe('Beach Visit');
  });

  it('assigns a unique id to the stop', () => {
    useItineraryStore.getState().addStop(stopData);
    const stop = useItineraryStore.getState().days[0].stops[0];
    expect(stop.id).toBeTruthy();
    expect(stop.id).toMatch(/^stop-/);
  });

  it('sets isDirty to true', () => {
    useItineraryStore.getState().addStop(stopData);
    expect(useItineraryStore.getState().isDirty).toBe(true);
  });

  it('updates total cost', () => {
    useItineraryStore.getState().addStop(stopData);
    expect(useItineraryStore.getState().totalCost).toBe(50);
  });
});

describe('removeStop', () => {
  beforeEach(() => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    useItineraryStore.setState({ isDirty: false });
  });

  it('removes stop from its day', () => {
    const stopId = 'stop-uuid-1';
    useItineraryStore.getState().removeStop(stopId);
    const { days } = useItineraryStore.getState();
    const allStops = days.flatMap((d) => d.stops);
    expect(allStops.find((s) => s.id === stopId)).toBeUndefined();
  });

  it('sets isDirty to true', () => {
    useItineraryStore.getState().removeStop('stop-uuid-1');
    expect(useItineraryStore.getState().isDirty).toBe(true);
  });

  it('recalculates cost after removal', () => {
    useItineraryStore.getState().removeStop('stop-uuid-1');
    expect(useItineraryStore.getState().totalCost).toBe(0);
  });
});

describe('moveStop', () => {
  it('moves stop to a different day', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    // Add a second day
    useItineraryStore.getState().addDay();

    useItineraryStore.getState().moveStop('stop-uuid-1', 2, 0);
    const { days } = useItineraryStore.getState();
    expect(days[0].stops).toHaveLength(0);
    expect(days[1].stops).toHaveLength(1);
    expect(days[1].stops[0].day).toBe(2);
  });

  it('sets isDirty to true', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    useItineraryStore.getState().addDay();
    useItineraryStore.setState({ isDirty: false });
    useItineraryStore.getState().moveStop('stop-uuid-1', 2, 0);
    expect(useItineraryStore.getState().isDirty).toBe(true);
  });
});

describe('calculateCost', () => {
  it('sums cost from all stops across all days', () => {
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addDay();
    useItineraryStore.getState().addStop({
      itinerary_id: 'x', listing_id: null, day: 1, order: 0, title: 'A',
      description: null, latitude: null, longitude: null, location_name: null,
      start_time: null, end_time: null, duration_hours: null, cost_usd: 100,
      transport_to_next: null, transport_duration_minutes: null, notes: null,
    });
    useItineraryStore.getState().addStop({
      itinerary_id: 'x', listing_id: null, day: 2, order: 0, title: 'B',
      description: null, latitude: null, longitude: null, location_name: null,
      start_time: null, end_time: null, duration_hours: null, cost_usd: 50,
      transport_to_next: null, transport_duration_minutes: null, notes: null,
    });
    expect(useItineraryStore.getState().totalCost).toBe(150);
  });
});

describe('save', () => {
  it('resets isDirty on successful save', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    useItineraryStore.setState({
      current: { ...mockItinerary },
      isDirty: true,
    });
    await useItineraryStore.getState().save();
    expect(useItineraryStore.getState().isDirty).toBe(false);
  });

  it('does nothing if current is null', async () => {
    await useItineraryStore.getState().save();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sets isSaving while saving', async () => {
    let resolveFetch: (v: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise((res) => { resolveFetch = res; })
    );
    useItineraryStore.setState({ current: mockItinerary });

    const savePromise = useItineraryStore.getState().save();
    expect(useItineraryStore.getState().isSaving).toBe(true);

    resolveFetch!({ ok: true });
    await savePromise;
    expect(useItineraryStore.getState().isSaving).toBe(false);
  });
});

describe('clear', () => {
  it('resets all state', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    useItineraryStore.getState().openPanel();
    useItineraryStore.getState().clear();
    const state = useItineraryStore.getState();
    expect(state.current).toBeNull();
    expect(state.days).toEqual([]);
    expect(state.totalCost).toBe(0);
    expect(state.isDirty).toBe(false);
    expect(state.isOpen).toBe(false);
  });
});
