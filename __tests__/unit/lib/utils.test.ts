import {
  cn,
  formatCurrency,
  formatDate,
  slugify,
  truncate,
  calculateDistance,
  getInitials,
  pluralize,
  formatDuration,
  classifyRating,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
  });

  it('deduplicates tailwind conflicting classes', () => {
    // twMerge should keep the last conflicting class
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatCurrency', () => {
  it('formats USD correctly with two decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats compact large amounts', () => {
    expect(formatCurrency(5000, 'USD', { compact: true })).toBe('$5.0k');
  });

  it('does not compact small amounts', () => {
    expect(formatCurrency(999, 'USD', { compact: true })).toBe('$999.00');
  });

  it('formats VES currency', () => {
    const result = formatCurrency(50000, 'VES');
    expect(result).toContain('50');
  });

  it('respects custom decimal places', () => {
    expect(formatCurrency(10, 'USD', { decimals: 0 })).toBe('$10');
  });
});

describe('formatDate', () => {
  it('returns a human-readable date from ISO string', () => {
    // Use date-only string (no time) to avoid timezone shifting
    const result = formatDate('2026-04-15');
    expect(result).toMatch(/Apr 15, 2026/);
  });

  it('accepts a Date object', () => {
    // Use noon UTC to avoid date shifting across timezones
    const d = new Date('2026-04-15T12:00:00Z');
    const result = formatDate(d);
    expect(result).toMatch(/Apr 15, 2026/);
  });

  it('accepts a custom format string', () => {
    const result = formatDate('2026-04-15', 'yyyy/MM/dd');
    expect(result).toBe('2026/04/15');
  });
});

describe('slugify', () => {
  it('converts strings to URL slugs', () => {
    expect(slugify('Mérida Mountain Trek')).toBe('merida-mountain-trek');
  });

  it('removes accented characters', () => {
    expect(slugify('Ángel Falls')).toBe('angel-falls');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Los Roques Beach')).toBe('los-roques-beach');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World? #1')).toBe('hello-world-1');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo   bar')).toBe('foo-bar');
  });
});

describe('truncate', () => {
  it('does not truncate short text', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates at correct length with ellipsis', () => {
    const result = truncate('Hello World', 8);
    expect(result).toBe('Hello...');
    expect(result.length).toBe(8);
  });

  it('truncates exactly at maxLength', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });

  it('handles text exactly at boundary', () => {
    const result = truncate('Hello World', 11);
    expect(result).toBe('Hello World');
  });

  it('returns empty string for null input', () => {
    expect(truncate(null, 100)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(truncate(undefined, 100)).toBe('');
  });

  it('returns the text unchanged when under the limit', () => {
    expect(truncate('hello', 100)).toBe('hello');
  });

  it('truncates and appends ellipsis when over the limit', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('uses custom ellipsis', () => {
    expect(truncate('hello world', 8, '…')).toBe('hello w…');
  });
});

describe('calculateDistance', () => {
  it('returns 0 for same coordinates', () => {
    expect(calculateDistance(8.6, -71.15, 8.6, -71.15)).toBeCloseTo(0);
  });

  it('returns correct km between two known points', () => {
    // Caracas to Mérida approx 400-600 km (straight line ~512 km)
    const dist = calculateDistance(10.48, -66.88, 8.6, -71.15);
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(600);
  });

  it('returns a positive number', () => {
    const dist = calculateDistance(11.85, -66.75, 10.07, -69.32);
    expect(dist).toBeGreaterThan(0);
  });
});

describe('getInitials', () => {
  it('returns initials for a full name', () => {
    expect(getInitials('Maria García')).toBe('MG');
  });

  it('returns single initial for one-word name', () => {
    expect(getInitials('Carlos')).toBe('C');
  });

  it('returns only first two initials for long names', () => {
    expect(getInitials('Juan Carlos Rodríguez Díaz')).toBe('JC');
  });
});

describe('pluralize', () => {
  it('uses singular for count of 1', () => {
    expect(pluralize(1, 'guest')).toBe('1 guest');
  });

  it('uses plural for count of 0', () => {
    expect(pluralize(0, 'guest')).toBe('0 guests');
  });

  it('uses plural for count > 1', () => {
    expect(pluralize(3, 'guest')).toBe('3 guests');
  });

  it('uses custom plural form when provided', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });
});

describe('formatDuration', () => {
  it('formats hours as minutes when < 1', () => {
    expect(formatDuration(0.5)).toBe('30 min');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDuration(1)).toBe('1 hour');
  });

  it('formats integer hours', () => {
    expect(formatDuration(4)).toBe('4 hours');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(2.5)).toBe('2h 30min');
  });
});

describe('classifyRating', () => {
  it('classifies 4.8+ as Exceptional', () => {
    expect(classifyRating(4.9)).toBe('Exceptional');
  });

  it('classifies 4.5-4.7 as Excellent', () => {
    expect(classifyRating(4.6)).toBe('Excellent');
  });

  it('classifies 4.0-4.4 as Very Good', () => {
    expect(classifyRating(4.2)).toBe('Very Good');
  });

  it('classifies 3.0-3.4 as Average', () => {
    expect(classifyRating(3.1)).toBe('Average');
  });

  it('classifies below 3 as Below Average', () => {
    expect(classifyRating(2.5)).toBe('Below Average');
  });
});
