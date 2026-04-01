import '@testing-library/jest-dom';

// ─── next/navigation ───────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
}));

// ─── @supabase/ssr ──────────────────────────────────────────────────────────
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({}),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(),
  })),
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(),
  })),
}));

// ─── mapbox-gl ──────────────────────────────────────────────────────────────
jest.mock('mapbox-gl', () => ({
  default: {
    accessToken: '',
    Map: jest.fn(() => ({
      on: jest.fn(),
      addControl: jest.fn(),
      remove: jest.fn(),
      setStyle: jest.fn(),
      flyTo: jest.fn(),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getCenter: jest.fn(() => ({ lng: -66.58, lat: 8.0 })),
    })),
    NavigationControl: jest.fn(),
    Marker: jest.fn(() => ({
      setLngLat: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    })),
  },
  Map: jest.fn(),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
}));

// ─── @anthropic-ai/sdk ──────────────────────────────────────────────────────
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn(() => ({
    messages: {
      create: jest.fn(),
      stream: jest.fn(),
    },
  })),
  Anthropic: jest.fn(() => ({
    messages: {
      create: jest.fn(),
      stream: jest.fn(),
    },
  })),
}));

// ─── next/image ─────────────────────────────────────────────────────────────
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, fill, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const React = require('react');
    return React.createElement('img', { src, alt, 'data-testid': 'next-image', ...props });
  },
}));

// ─── react-hot-toast ────────────────────────────────────────────────────────
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

// ─── Global fetch mock ──────────────────────────────────────────────────────
global.fetch = jest.fn();

// ─── Browser globals (jsdom environment only) ───────────────────────────────
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // ─── ResizeObserver stub ─────────────────────────────────────────────────
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}
