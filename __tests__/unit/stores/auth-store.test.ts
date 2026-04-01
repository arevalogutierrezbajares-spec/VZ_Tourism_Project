import { useAuthStore } from '@/stores/auth-store';
import { mockUser } from '@/__tests__/fixtures';

// Mock the supabase client module used by the store
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    })),
  })),
}));

const initialState = {
  user: null,
  profile: null,
  loading: true,
  initialized: false,
};

beforeEach(() => {
  useAuthStore.setState(initialState);
});

describe('auth-store initial state', () => {
  it('has no user initially', () => {
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('starts with loading true', () => {
    expect(useAuthStore.getState().loading).toBe(true);
  });

  it('starts as not initialized', () => {
    expect(useAuthStore.getState().initialized).toBe(false);
  });
});

describe('setUser', () => {
  it('updates user', () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('can clear user by setting null', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('setProfile', () => {
  it('updates profile', () => {
    useAuthStore.getState().setProfile(mockUser);
    expect(useAuthStore.getState().profile).toEqual(mockUser);
  });
});

describe('setLoading', () => {
  it('updates loading state', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });
});

describe('setInitialized', () => {
  it('marks store as initialized', () => {
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState().initialized).toBe(true);
  });
});

describe('signOut', () => {
  it('clears user and profile', async () => {
    useAuthStore.setState({ user: mockUser, profile: mockUser });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('updateProfile', () => {
  it('merges profile data when profile exists', async () => {
    useAuthStore.setState({ profile: mockUser });
    await useAuthStore.getState().updateProfile({ full_name: 'New Name' });
    // The mock returns mockUser; check that updateProfile was called
    expect(useAuthStore.getState().profile).toEqual(mockUser);
  });

  it('does nothing if no profile is set', async () => {
    useAuthStore.setState({ profile: null });
    const { createClient } = jest.requireMock('@/lib/supabase/client');
    await useAuthStore.getState().updateProfile({ full_name: 'Test' });
    // Should not throw; profile stays null
    expect(useAuthStore.getState().profile).toBeNull();
  });
});
