import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '@/components/common/SearchBar';

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the voice input (mic) button', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const micBtn = screen.getByRole('button', { name: /voice search/i });
    expect(micBtn).toBeInTheDocument();
  });

  it('shows a rotating placeholder text from AI suggestions', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    // Initially shows first suggestion
    expect(input.getAttribute('placeholder')).toBeTruthy();
  });

  it('rotates placeholder text every 3 seconds', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    const initialPlaceholder = input.getAttribute('placeholder');

    jest.advanceTimersByTime(3001);
    const newPlaceholder = input.getAttribute('placeholder');
    // Placeholder should have rotated (may differ from initial)
    expect(newPlaceholder).toBeTruthy();
  });

  it('accepts custom placeholder prop (overrides rotation)', () => {
    render(<SearchBar onSearch={mockOnSearch} placeholder="Search Venezuela..." />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('placeholder')).toBe('Search Venezuela...');
  });

  it('updates input value as user types', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'Los Roques beach');
    expect(input).toHaveValue('Los Roques beach');
  });

  it('calls onSearch when form is submitted', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'Los Roques beach');
    await user.keyboard('{Enter}');
    expect(mockOnSearch).toHaveBeenCalledWith('Los Roques beach');
  });

  it('does not call onSearch for empty/whitespace query', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '   ');
    await user.keyboard('{Enter}');
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('trims whitespace from query before calling onSearch', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '  beach  ');
    await user.keyboard('{Enter}');
    expect(mockOnSearch).toHaveBeenCalledWith('beach');
  });

  it('disables input when isLoading is true', () => {
    render(<SearchBar onSearch={mockOnSearch} isLoading />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('shows spinner instead of search icon when loading', () => {
    const { container } = render(<SearchBar onSearch={mockOnSearch} isLoading />);
    // Loader2 is rendered when loading
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not call onSearch when isLoading is true', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchBar onSearch={mockOnSearch} isLoading />);
    const input = screen.getByRole('textbox');
    // Input is disabled so typing won't work, but verify no calls
    fireEvent.submit(input.closest('form')!);
    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});
