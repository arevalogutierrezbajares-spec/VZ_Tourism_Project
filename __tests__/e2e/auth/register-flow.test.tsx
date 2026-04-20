import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

// ── Mock the Checkbox component (base-ui checkbox doesn't work in jsdom) ──────
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, ...props }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      id={id}
      role="checkbox"
      checked={checked || false}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

// ── Supabase client mock ──────────────────────────────────────────────────────
const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

// ── Import the page AFTER mocks are set up ────────────────────────────────────
import RegisterPage from '@/app/(auth)/register/page';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fill the minimum required fields for a valid registration */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name *'), 'Carlos Rodriguez');
  await user.type(screen.getByLabelText('Email *'), 'carlos@example.com');
  await user.type(screen.getByLabelText('Password *'), 'Str0ngPass!');
  await user.type(screen.getByLabelText('Confirm *'), 'Str0ngPass!');
  // Click the checkbox to accept terms
  await user.click(screen.getByRole('checkbox'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Register Page', () => {
  it('renders all form fields', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText('Full name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Password *')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Nationality')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders Google OAuth signup button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Full name *'), 'Test User');
    await user.type(screen.getByLabelText('Email *'), 'bad@x');
    await user.type(screen.getByLabelText('Password *'), 'Str0ngPass!');
    await user.type(screen.getByLabelText('Confirm *'), 'Str0ngPass!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Full name *'), 'Test User');
    await user.type(screen.getByLabelText('Email *'), 'test@example.com');
    await user.type(screen.getByLabelText('Password *'), 'short');
    await user.type(screen.getByLabelText('Confirm *'), 'short');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows "passwords don\'t match" error', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Full name *'), 'Test User');
    await user.type(screen.getByLabelText('Email *'), 'test@example.com');
    await user.type(screen.getByLabelText('Password *'), 'Str0ngPass!');
    await user.type(screen.getByLabelText('Confirm *'), 'DifferentPass!1');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('validates full_name minimum length', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Full name *'), 'A');
    await user.type(screen.getByLabelText('Email *'), 'test@example.com');
    await user.type(screen.getByLabelText('Password *'), 'Str0ngPass!');
    await user.type(screen.getByLabelText('Confirm *'), 'Str0ngPass!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('requires acceptTerms to be checked', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Full name *'), 'Test User');
    await user.type(screen.getByLabelText('Email *'), 'test@example.com');
    await user.type(screen.getByLabelText('Password *'), 'Str0ngPass!');
    await user.type(screen.getByLabelText('Confirm *'), 'Str0ngPass!');
    // Do NOT click checkbox
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument();
    });
  });

  it('password strength meter shows "Weak" for simple password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Password *'), 'abcdefgh');

    await waitFor(() => {
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });
  });

  it('password strength meter shows "Fair" for medium password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Password *'), 'abcdefghijklm');

    await waitFor(() => {
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });
  });

  it('password strength meter shows "Good" for decent password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    // >= 8, >= 12, mixed case => score 3 => Good
    await user.type(screen.getByLabelText('Password *'), 'AbcDefGhIjklM');

    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('password strength meter shows "Strong" for strong password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    // >= 8, >= 12, mixed case, digit => score 4 => Strong
    await user.type(screen.getByLabelText('Password *'), 'AbcDefGh1jklM');

    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('password strength meter shows "Very strong" for excellent password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    // >= 8, >= 12, mixed case, digit, special => score 5 => Very strong
    await user.type(screen.getByLabelText('Password *'), 'AbcDefGh1jk!M');

    await waitFor(() => {
      expect(screen.getByText('Very strong')).toBeInTheDocument();
    });
  });

  it('successful registration calls signUp and shows success state', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: null });

    render(<RegisterPage />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'carlos@example.com',
        password: 'Str0ngPass!',
        options: {
          emailRedirectTo: expect.stringContaining('/callback'),
          data: {
            full_name: 'Carlos Rodriguez',
            phone: '',
            nationality: '',
          },
        },
      });
    });

    // After successful registration, the success state is shown
    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
    });
  });

  it('shows toast error when signUp fails', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      error: new Error('User already registered'),
    });

    render(<RegisterPage />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User already registered');
    });
  });

  it('Google OAuth signup calls signInWithOAuth with correct params', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<RegisterPage />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/callback?next=/'),
      },
    });
  });

  it('show/hide password toggle works for main password field', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText('Password *');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /^show password$/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /^hide password$/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('show/hide toggle works for confirm password field', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const confirmInput = screen.getByLabelText('Confirm *');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password confirmation/i }));
    expect(confirmInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password confirmation/i }));
    expect(confirmInput).toHaveAttribute('type', 'password');
  });

  it('has a link to the login page', () => {
    render(<RegisterPage />);

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('shows header text correctly', () => {
    render(<RegisterPage />);

    // The title and the submit button both say "Create account", so use
    // the card-title data-slot to disambiguate.
    const title = screen.getByText('Create account', { selector: '[data-slot="card-title"]' });
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/join vz explorer/i)).toBeInTheDocument();
  });
});
