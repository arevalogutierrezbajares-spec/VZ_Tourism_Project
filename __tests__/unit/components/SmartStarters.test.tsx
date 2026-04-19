import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartStarters } from '@/components/itinerary/SmartStarters';

describe('SmartStarters', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders all 6 vibe buttons', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    expect(screen.getByText('Beach & Chill')).toBeInTheDocument();
    expect(screen.getByText('Mountain Adventure')).toBeInTheDocument();
    expect(screen.getByText('Angel Falls')).toBeInTheDocument();
    expect(screen.getByText('Food & Culture')).toBeInTheDocument();
    expect(screen.getByText('City & Nightlife')).toBeInTheDocument();
    expect(screen.getByText('Nature & Wildlife')).toBeInTheDocument();
  });

  it('renders all 4 duration chips', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('1 week')).toBeInTheDocument();
    expect(screen.getByText('10 days')).toBeInTheDocument();
  });

  it('renders "What kind of trip?" label', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    expect(screen.getByText('What kind of trip?')).toBeInTheDocument();
  });

  it('renders "How long?" label', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    expect(screen.getByText('How long?')).toBeInTheDocument();
  });

  // ─── Auto-send: vibe then duration ────────────────────────────────────────

  it('does not call onSend when only a vibe is selected', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('Beach & Chill'));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when only a duration is selected', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('5 days'));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('calls onSend when vibe is selected then duration is clicked', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('Beach & Chill'));
    fireEvent.click(screen.getByText('5 days'));
    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith(
      'I want a 5-day trip focused on beach and relaxation in Venezuela.'
    );
  });

  it('calls onSend when duration is selected then vibe is clicked', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    // '1 week' maps to 7 days
    fireEvent.click(screen.getByText('1 week'));
    fireEvent.click(screen.getByText('Angel Falls'));
    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith(
      'I want a 7-day trip focused on visiting Angel Falls and Canaima in Venezuela.'
    );
  });

  it('sends correct prompt for Mountain + 10 days', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('10 days'));
    fireEvent.click(screen.getByText('Mountain Adventure'));
    expect(mockOnSend).toHaveBeenCalledWith(
      'I want a 10-day trip focused on mountain adventure and hiking in Venezuela.'
    );
  });

  it('sends correct prompt for Nature + 3 days', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('Nature & Wildlife'));
    fireEvent.click(screen.getByText('3 days'));
    expect(mockOnSend).toHaveBeenCalledWith(
      'I want a 3-day trip focused on nature, wildlife, and eco-tours in Venezuela.'
    );
  });

  // ─── State: only one selection each ───────────────────────────────────────

  it('sends only once even if user clicks vibe multiple times', () => {
    render(<SmartStarters onSend={mockOnSend} />);
    fireEvent.click(screen.getByText('Beach & Chill'));
    fireEvent.click(screen.getByText('City & Nightlife')); // changes vibe, still no duration
    expect(mockOnSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('3 days'));
    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith(
      'I want a 3-day trip focused on city exploration and nightlife in Venezuela.'
    );
  });
});
