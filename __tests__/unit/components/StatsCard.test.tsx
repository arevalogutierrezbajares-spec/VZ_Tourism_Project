import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/provider/StatsCard';
import { DollarSign, Users, Star } from 'lucide-react';

describe('StatsCard', () => {
  it('renders the stat title', () => {
    render(<StatsCard title="Total Revenue" value="$12,450" icon={DollarSign} />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('renders the stat value as string', () => {
    render(<StatsCard title="Total Revenue" value="$12,450" icon={DollarSign} />);
    expect(screen.getByText('$12,450')).toBeInTheDocument();
  });

  it('renders numeric stat value', () => {
    render(<StatsCard title="Bookings" value={42} icon={Users} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the icon component', () => {
    const { container } = render(<StatsCard title="Revenue" value="$100" icon={DollarSign} />);
    // Lucide icon renders as SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders TrendingUp icon and green color for positive change', () => {
    const { container } = render(
      <StatsCard title="Revenue" value="$100" icon={DollarSign} change={12.5} />
    );
    // Should have green color for positive change
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('renders TrendingDown icon and red color for negative change', () => {
    const { container } = render(
      <StatsCard title="Revenue" value="$100" icon={DollarSign} change={-5.3} />
    );
    // Should have red color for negative change
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });

  it('shows positive change percentage with + prefix', () => {
    render(<StatsCard title="Revenue" value="$100" icon={DollarSign} change={12.5} />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('shows negative change percentage without + prefix', () => {
    render(<StatsCard title="Revenue" value="$100" icon={DollarSign} change={-5.3} />);
    expect(screen.getByText('-5.3%')).toBeInTheDocument();
  });

  it('shows zero change as positive (green)', () => {
    const { container } = render(
      <StatsCard title="Revenue" value="$100" icon={DollarSign} change={0} />
    );
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('does not render change indicator when change is undefined', () => {
    const { container } = render(
      <StatsCard title="Revenue" value="$100" icon={DollarSign} />
    );
    expect(container.querySelector('.text-green-600')).toBeNull();
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders custom changeLabel', () => {
    render(
      <StatsCard
        title="Revenue"
        value="$100"
        icon={DollarSign}
        change={5}
        changeLabel="vs last week"
      />
    );
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('uses default changeLabel "vs last month"', () => {
    render(<StatsCard title="Revenue" value="$100" icon={DollarSign} change={5} />);
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });
});
