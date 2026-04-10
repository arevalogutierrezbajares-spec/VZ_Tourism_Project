import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar, type Filters } from '@/app/(tourist)/itineraries/FilterBar';

const DEFAULT_FILTERS: Filters = {
  region: null,
  durationMin: null,
  durationMax: null,
  budgetMin: null,
  budgetMax: null,
  sort: 'popular',
};

describe('FilterBar', () => {
  const regions = ['Los Roques', 'Mérida', 'Canaima'];
  const onChange = jest.fn();

  beforeEach(() => onChange.mockClear());

  it('renders region chips', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    expect(screen.getByText('Los Roques')).toBeInTheDocument();
    expect(screen.getByText('Mérida')).toBeInTheDocument();
    expect(screen.getByText('Canaima')).toBeInTheDocument();
  });

  it('renders duration chips', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    expect(screen.getByText('3-5 days')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('10+ days')).toBeInTheDocument();
  });

  it('renders budget chips', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    expect(screen.getByText('Under $500')).toBeInTheDocument();
    expect(screen.getByText('$500-$1500')).toBeInTheDocument();
    expect(screen.getByText('Luxury')).toBeInTheDocument();
  });

  it('calls onChange when region chip is clicked', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    fireEvent.click(screen.getByText('Mérida'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Mérida' })
    );
  });

  it('toggles region off when active chip is clicked', () => {
    const activeFilters = { ...DEFAULT_FILTERS, region: 'Mérida' };
    render(<FilterBar regions={regions} filters={activeFilters} onChange={onChange} />);

    fireEvent.click(screen.getByText('Mérida'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ region: null })
    );
  });

  it('calls onChange when duration chip is clicked', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    fireEvent.click(screen.getByText('3-5 days'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ durationMin: 3, durationMax: 5 })
    );
  });

  it('calls onChange when budget chip is clicked', () => {
    render(<FilterBar regions={regions} filters={DEFAULT_FILTERS} onChange={onChange} />);

    fireEvent.click(screen.getByText('Luxury'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ budgetMin: 1500, budgetMax: null })
    );
  });
});
