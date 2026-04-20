import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth-store';

// ── Supabase client mock ──────────────────────────────────────────────────────
const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockGetSession = jest.fn();
const mockResend = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      getSession: mockGetSession,
      resend: mockResend,
    },
  })),
}));

// ── Import the page AFTER mocks are set up ────────────────────────────────────
import LoginPage from '@/app/(auth)/login/page';

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockPush = jest.fn();

function setupRouter(searchParams: Record<string, string> = {}) {
  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  });
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(searchParams));
}

const initialStoreState = {
  user: null,
  profile: null,
  loading: true,
  initialized: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState(initialStoreState);
  setupRouter();
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login Page', () => {
  it('renders the login form with email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders Google OAuth, Demo, and email sign-in sections', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try demo account/i })).toBeInTheDocument();
    expect(screen.getByText(/or sign in with email/i)).toBeInTheDocument();
  });

  it('shows validation error for empty email on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Password'), 'validpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Use "bad@x" which passes HTML5 type="email" validation (has an @)
    // but fails zod's stricter email regex (requires domain with TLD).
    await user.type(screen.getByLabelText('Email'), 'bad@x');
    await user.type(screen.getByLabelText('Password'), 'validpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click "Show password" button
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click "Hide password" button
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays error from URL params (?error=auth_callback_failed)', () => {
    setupRouter({ error: 'auth_callback_failed' });
    render(<LoginPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed. Please try again.');
  });

  it('displays generic error for unknown error param', () => {
    setupRouter({ error: 'some_other_error' });
    render(<LoginPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('An error occurred during sign-in.');
  });

  it('successful email/password login calls supabase, sets store, and redirects', async () => {
    const user = userEvent.setup();
    const fakeUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'validpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validpassword',
      });
    });

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    await waitFor(() => {
      const storeState = useAuthStore.getState();
      expect(storeState.user).not.toBeNull();
      expect(storeState.user?.id).toBe('user-123');
      expect(storeState.user?.email).toBe('test@example.com');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome back!');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows toast error when signInWithPassword fails', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid login credentials');
    });
  });

  it('demo login sets DEMO_USER in store, shows toast, and redirects', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /try demo account/i }));

    const storeState = useAuthStore.getState();
    expect(storeState.user).not.toBeNull();
    expect(storeState.user?.id).toBe('demo-user-001');
    expect(storeState.user?.email).toBe('demo@vzexplorer.com');
    expect(storeState.user?.full_name).toBe('Alex Demo');
    expect(storeState.profile).not.toBeNull();
    expect(storeState.profile?.id).toBe('demo-user-001');
    expect(storeState.loading).toBe(false);
    expect(storeState.initialized).toBe(true);

    expect(toast.success).toHaveBeenCalledWith('Signed in as Alex Demo!');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('Google OAuth calls signInWithOAuth with correct provider and redirectTo', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/callback?next=/'),
      },
    });
  });

  it('respects redirectTo search param after login', async () => {
    setupRouter({ redirectTo: '/dashboard' });
    const user = userEvent.setup();

    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {},
            created_at: '2025-01-01T00:00:00Z',
          },
        },
      },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'validpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('respects "next" search param as alternative redirect', async () => {
    setupRouter({ next: '/explore' });
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /try demo account/i }));

    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  it('Google OAuth includes redirectTo param in callback URL', async () => {
    setupRouter({ redirectTo: '/my-trips' });
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/callback?next=/my-trips'),
      },
    });
  });

  it('has links to register and forgot-password', () => {
    render(<LoginPage />);

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    expect(signUpLink).toHaveAttribute('href', '/register');

    const forgotLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });

  it('has a link to provider registration', () => {
    render(<LoginPage />);

    const providerLink = screen.getByRole('link', { name: /list your experience/i });
    expect(providerLink).toHaveAttribute('href', '/provider-register');
  });

  it('resend confirmation email button calls supabase resend', async () => {
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ error: null });

    render(<LoginPage />);

    // Type an email first
    await user.type(screen.getByLabelText('Email'), 'test@example.com');

    // Click "Resend it"
    await user.click(screen.getByRole('button', { name: /resend it/i }));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        options: { emailRedirectTo: expect.stringContaining('/callback') },
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Confirmation email resent — check your inbox');
  });

  it('resend confirmation shows error when no email entered', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /resend it/i }));

    expect(toast.error).toHaveBeenCalledWith('Enter your email first');
    expect(mockResend).not.toHaveBeenCalled();
  });
});
