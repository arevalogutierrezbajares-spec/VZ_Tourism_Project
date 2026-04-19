import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => {
  const Link = ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

import { Breadcrumb } from '@/components/ui/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders all items', () => {
    render(
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Explore', href: '/explore' }, { label: 'Hotels' }]} />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Hotels')).toBeInTheDocument();
  });

  it('renders first item as link', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Explore' }]} />);
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders last item as non-link span', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Explore' }]} />);
    // "Explore" is the last item — no <a> tag
    expect(screen.queryByRole('link', { name: 'Explore' })).not.toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('last item has font-medium class', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Explore' }]} />);
    const last = screen.getByText('Explore');
    expect(last.className).toContain('font-medium');
  });

  it('renders a single item without separator', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    // No separator chevron when there's only one item
    expect(document.querySelectorAll('svg').length).toBe(0);
  });

  it('renders separators between items', () => {
    render(<Breadcrumb items={[{ label: 'A', href: '/' }, { label: 'B', href: '/b' }, { label: 'C' }]} />);
    // 2 separators for 3 items
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('applies custom className', () => {
    const { container } = render(<Breadcrumb items={[{ label: 'Home' }]} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has accessible nav element', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Explore' }]} />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });
});
