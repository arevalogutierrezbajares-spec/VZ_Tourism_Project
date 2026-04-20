/**
 * E2E Store Test: Itinerary lifecycle
 *
 * Exercises the full lifecycle of the itinerary Zustand store:
 *   create -> add days -> add stops -> move stops -> calculate cost -> save -> clear
 */
import { useItineraryStore } from '@/stores/itinerary-store';
import { mockItinerary, mockItineraryStop } from '@/__tests__/fixtures';
import type { Itinerary, ItineraryStop } from '@/types/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getState = () => useItineraryStore.getState();

const initialState = {
  current: null,
  days: [],
  totalCost: 0,
  isDirty: false,
  isSaving: false,
  isOpen: false,
};

/** Creates a minimal stop payload (without id/created_at). */
function makeStopPayload(
  overrides: Partial<Omit<ItineraryStop, 'id' | 'created_at'>> = {}
): Omit<ItineraryStop, 'id' | 'created_at'> {
  return {
    itinerary_id: 'itinerary-uuid-1',
    listing_id: null,
    day: 1,
    order: 0,
    title: 'Test Stop',
    description: null,
    latitude: null,
    longitude: null,
    location_name: null,
    start_time: null,
    end_time: null,
    duration_hours: null,
    cost_usd: 0,
    transport_to_next: null,
    transport_duration_minutes: null,
    notes: null,
    ...overrides,
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  useItineraryStore.setState(initialState);
  (global.fetch as jest.Mock).mockReset();
});

// ─── 1. Full lifecycle (golden path) ────────────────────────────────────────

describe('Full itinerary lifecycle (golden path)', () => {
  it('creates itinerary -> adds days/stops -> moves stop -> costs -> saves -> clears', async () => {
    const store = getState;

    // Step 1: Load an itinerary
    store().setItinerary(mockItinerary);
    expect(store().current?.id).toBe('itinerary-uuid-1');
    expect(store().days.length).toBeGreaterThanOrEqual(1);
    expect(store().isDirty).toBe(false);

    // Step 2: Add an extra day
    store().addDay();
    const dayCount = store().days.length;
    expect(dayCount).toBeGreaterThanOrEqual(2);
    expect(store().isDirty).toBe(true);

    // Step 3: Add stops to different days
    const stopA = makeStopPayload({
      day: 1,
      order: 1,
      title: 'Caracas City Tour',
      cost_usd: 40,
    });
    const stopB = makeStopPayload({
      day: dayCount,
      order: 0,
      title: 'Los Roques Beach',
      cost_usd: 120,
    });
    store().addStop(stopA);
    store().addStop(stopB);

    // Verify stops exist in the right days
    const day1Stops = store().days.find((d) => d.day === 1)?.stops ?? [];
    expect(day1Stops.some((s) => s.title === 'Caracas City Tour')).toBe(true);
    const lastDayStops =
      store().days.find((d) => d.day === dayCount)?.stops ?? [];
    expect(lastDayStops.some((s) => s.title === 'Los Roques Beach')).toBe(true);

    // Step 4: Move stopB to day 1
    const stopBId = lastDayStops.find((s) => s.title === 'Los Roques Beach')!.id;
    store().moveStop(stopBId, 1, 2);
    const day1After = store().days.find((d) => d.day === 1)?.stops ?? [];
    expect(day1After.some((s) => s.id === stopBId)).toBe(true);

    // Step 5: Verify cost is recalculated correctly
    // Original stop 85 + 40 + 120 = 245
    store().calculateCost();
    expect(store().totalCost).toBe(245);

    // Step 6: Save (remote itinerary)
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    await store().save();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(store().isDirty).toBe(false);
    expect(store().isSaving).toBe(false);

    // Step 7: Clear everything
    store().clear();
    expect(store().current).toBeNull();
    expect(store().days).toEqual([]);
    expect(store().totalCost).toBe(0);
    expect(store().isDirty).toBe(false);
    expect(store().isOpen).toBe(false);
  });
});

// ─── 2. setItinerary with multi-day stops ───────────────────────────────────

describe('setItinerary with multi-day stops', () => {
  it('distributes stops across multiple days and sorts by order', () => {
    const multiDayItinerary: Itinerary = {
      ...mockItinerary,
      total_days: 3,
      stops: [
        { ...mockItineraryStop, id: 's1', day: 2, order: 1, cost_usd: 50 },
        { ...mockItineraryStop, id: 's2', day: 1, order: 0, cost_usd: 30 },
        { ...mockItineraryStop, id: 's3', day: 2, order: 0, cost_usd: 70 },
        { ...mockItineraryStop, id: 's4', day: 3, order: 0, cost_usd: 100 },
      ],
    };

    getState().setItinerary(multiDayItinerary);
    const { days, totalCost } = getState();

    expect(days).toHaveLength(3);
    // Day 1 has one stop
    expect(days[0].stops).toHaveLength(1);
    expect(days[0].stops[0].id).toBe('s2');
    // Day 2 has two stops sorted by order
    expect(days[1].stops).toHaveLength(2);
    expect(days[1].stops[0].id).toBe('s3'); // order 0
    expect(days[1].stops[1].id).toBe('s1'); // order 1
    // Day 3 has one stop
    expect(days[2].stops).toHaveLength(1);
    expect(days[2].stops[0].id).toBe('s4');
    // Total cost
    expect(totalCost).toBe(250);
  });

  it('handles itinerary with no stops gracefully', () => {
    const emptyItinerary: Itinerary = {
      ...mockItinerary,
      total_days: 1,
      stops: [],
    };
    getState().setItinerary(emptyItinerary);
    const { days, totalCost } = getState();
    expect(days).toHaveLength(1);
    expect(days[0].stops).toEqual([]);
    expect(totalCost).toBe(0);
  });
});

// ─── 3. Day management edge cases ──────────────────────────────────────────

describe('Day management edge cases', () => {
  it('removing the only day results in empty days', () => {
    getState().addDay();
    expect(getState().days).toHaveLength(1);
    getState().removeDay(1);
    expect(getState().days).toHaveLength(0);
  });

  it('removing a middle day renumbers stops inside remaining days', () => {
    // Set up 3 days with a stop on day 3
    getState().addDay();
    getState().addDay();
    getState().addDay();
    getState().addStop(makeStopPayload({ day: 3, order: 0, title: 'Late stop', cost_usd: 10 }));

    // Remove day 2
    getState().removeDay(2);

    const { days } = getState();
    expect(days).toHaveLength(2);
    // The stop that was on day 3 is now on day 2
    expect(days[1].day).toBe(2);
    expect(days[1].stops[0].day).toBe(2);
    expect(days[1].stops[0].title).toBe('Late stop');
  });

  it('adding many days increments correctly', () => {
    for (let i = 0; i < 10; i++) {
      getState().addDay();
    }
    expect(getState().days).toHaveLength(10);
    expect(getState().days[9].day).toBe(10);
    expect(getState().days[9].title).toBe('Day 10');
  });
});

// ─── 4. Stop edge cases ────────────────────────────────────────────────────

describe('Stop edge cases', () => {
  beforeEach(() => {
    getState().addDay();
    getState().addDay();
  });

  it('adding a stop with $0 cost does not change totalCost', () => {
    getState().addStop(makeStopPayload({ day: 1, order: 0, cost_usd: 0 }));
    expect(getState().totalCost).toBe(0);
  });

  it('adding multiple stops to the same day sorts by order', () => {
    getState().addStop(makeStopPayload({ day: 1, order: 2, title: 'Third' }));
    getState().addStop(makeStopPayload({ day: 1, order: 0, title: 'First' }));
    getState().addStop(makeStopPayload({ day: 1, order: 1, title: 'Second' }));

    const stops = getState().days[0].stops;
    expect(stops[0].title).toBe('First');
    expect(stops[1].title).toBe('Second');
    expect(stops[2].title).toBe('Third');
  });

  it('removing a non-existent stop does not crash', () => {
    getState().addStop(makeStopPayload({ day: 1, order: 0, title: 'Only' }));
    expect(() => getState().removeStop('non-existent-id')).not.toThrow();
    expect(getState().days[0].stops).toHaveLength(1);
  });

  it('moving a non-existent stop returns unchanged state', () => {
    getState().addStop(
      makeStopPayload({ day: 1, order: 0, title: 'Stays put' })
    );
    const before = getState().days;
    getState().moveStop('non-existent', 2, 0);
    expect(getState().days[0].stops).toHaveLength(1);
    expect(getState().days[0].stops[0].title).toBe('Stays put');
  });

  it('updateStop updates only the targeted stop', () => {
    getState().addStop(
      makeStopPayload({ day: 1, order: 0, title: 'Original', cost_usd: 10 })
    );
    const stopId = getState().days[0].stops[0].id;
    getState().updateStop(stopId, { title: 'Updated', cost_usd: 99 });

    const stop = getState().days[0].stops[0];
    expect(stop.title).toBe('Updated');
    expect(stop.cost_usd).toBe(99);
    expect(getState().totalCost).toBe(99);
    expect(getState().isDirty).toBe(true);
  });
});

// ─── 5. Cost calculation edge cases ────────────────────────────────────────

describe('Cost calculation edge cases', () => {
  it('calculates zero when no days exist', () => {
    getState().calculateCost();
    expect(getState().totalCost).toBe(0);
  });

  it('calculates zero when all stops have null/0 cost', () => {
    getState().addDay();
    getState().addStop(makeStopPayload({ day: 1, order: 0, cost_usd: 0 }));
    expect(getState().totalCost).toBe(0);
  });

  it('recalculates after removing the only stop with cost', () => {
    getState().addDay();
    getState().addStop(makeStopPayload({ day: 1, order: 0, cost_usd: 200 }));
    expect(getState().totalCost).toBe(200);

    const stopId = getState().days[0].stops[0].id;
    getState().removeStop(stopId);
    expect(getState().totalCost).toBe(0);
  });

  it('handles a large number of stops', () => {
    getState().addDay();
    for (let i = 0; i < 50; i++) {
      getState().addStop(
        makeStopPayload({ day: 1, order: i, title: `Stop ${i}`, cost_usd: 10 })
      );
    }
    expect(getState().totalCost).toBe(500);
    expect(getState().days[0].stops).toHaveLength(50);
  });
});

// ─── 6. Save behavior ──────────────────────────────────────────────────────

describe('Save behavior', () => {
  it('skips network call for local-prefixed IDs (anonymous user)', async () => {
    useItineraryStore.setState({
      current: { ...mockItinerary, id: 'local-abc123' },
      isDirty: true,
      days: [],
    });
    await getState().save();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(getState().isDirty).toBe(false);
  });

  it('does not reset isDirty on failed save', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    useItineraryStore.setState({
      current: mockItinerary,
      isDirty: true,
      days: [{ day: 1, title: 'Day 1', stops: [] }],
    });

    await expect(getState().save()).rejects.toThrow('Save failed (500)');
    expect(getState().isDirty).toBe(true);
    expect(getState().isSaving).toBe(false);
  });

  it('sends correct payload shape to the API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    getState().setItinerary(mockItinerary);
    getState().addDay();
    getState().addStop(
      makeStopPayload({ day: 2, order: 0, title: 'Extra', cost_usd: 55 })
    );

    await getState().save();

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`/api/itineraries/${mockItinerary.id}`);
    expect(options.method).toBe('PATCH');
    const body = JSON.parse(options.body);
    expect(body).toHaveProperty('total_days');
    expect(body).toHaveProperty('estimated_cost_usd');
    expect(body).toHaveProperty('stops');
    expect(Array.isArray(body.stops)).toBe(true);
  });

  it('isSaving transitions to true during save and false afterwards', async () => {
    let resolveFetch!: (v: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise((res) => {
        resolveFetch = res;
      })
    );
    useItineraryStore.setState({ current: mockItinerary, isDirty: true });

    const savePromise = getState().save();
    expect(getState().isSaving).toBe(true);

    resolveFetch({ ok: true });
    await savePromise;
    expect(getState().isSaving).toBe(false);
  });
});

// ─── 7. Panel state ────────────────────────────────────────────────────────

describe('Panel open/close/toggle', () => {
  it('openPanel -> closePanel -> togglePanel produces expected states', () => {
    expect(getState().isOpen).toBe(false);
    getState().openPanel();
    expect(getState().isOpen).toBe(true);
    getState().closePanel();
    expect(getState().isOpen).toBe(false);
    getState().togglePanel();
    expect(getState().isOpen).toBe(true);
    getState().togglePanel();
    expect(getState().isOpen).toBe(false);
  });

  it('clear resets isOpen to false', () => {
    getState().openPanel();
    getState().clear();
    expect(getState().isOpen).toBe(false);
  });
});

// ─── 8. isDirty tracking across multiple operations ────────────────────────

describe('isDirty tracking', () => {
  it('setItinerary clears isDirty even when previously true', () => {
    useItineraryStore.setState({ isDirty: true });
    getState().setItinerary(mockItinerary);
    expect(getState().isDirty).toBe(false);
  });

  it('multiple mutations keep isDirty true until save', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    getState().setItinerary(mockItinerary);
    expect(getState().isDirty).toBe(false);

    getState().addDay();
    expect(getState().isDirty).toBe(true);

    getState().addStop(makeStopPayload({ day: 1, order: 1, cost_usd: 10 }));
    expect(getState().isDirty).toBe(true);

    await getState().save();
    expect(getState().isDirty).toBe(false);
  });
});
