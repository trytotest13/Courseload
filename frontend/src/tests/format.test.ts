import { describe, expect, it } from 'vitest';
import { deadlineLabel, formatRelative, initials, percent, pluralise } from '../lib/format';

const NOW = Date.parse('2026-09-22T10:00:00.000Z');

describe('formatting', () => {
  it('reads deadlines as time left', () => {
    expect(deadlineLabel(new Date(NOW + 3 * 3_600_000).toISOString(), NOW)).toBe('3 hours left');
    expect(deadlineLabel(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe('1 day left');
    expect(deadlineLabel(new Date(NOW + 3 * 86_400_000).toISOString(), NOW)).toBe('3 days left');
  });

  it('says past due once the moment has gone', () => {
    expect(deadlineLabel(new Date(NOW - 2 * 86_400_000).toISOString(), NOW)).toBe('Past due 2 days');
    expect(deadlineLabel(new Date(NOW - 90 * 60_000).toISOString(), NOW)).toBe('Past due 2 hours');
  });

  it('describes recent activity in relative terms', () => {
    expect(formatRelative(new Date(NOW - 30_000).toISOString(), NOW)).toBe('just now');
    expect(formatRelative(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5 minutes ago');
    expect(formatRelative(new Date(NOW + 2 * 3_600_000).toISOString(), NOW)).toBe('in 2 hours');
  });

  it('builds initials from a name', () => {
    expect(initials('Aarav Sharma')).toBe('AS');
    expect(initials('Meera')).toBe('M');
    expect(initials('  ')).toBe('?');
  });

  it('counts things without sounding like a machine', () => {
    expect(pluralise(1, 'assignment')).toBe('1 assignment');
    expect(pluralise(0, 'assignment')).toBe('0 assignments');
    expect(pluralise(4, 'group')).toBe('4 groups');
  });

  it('never reports more than a hundred percent', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(9, 4)).toBe(100);
    expect(percent(1, 0)).toBe(0);
  });
});
