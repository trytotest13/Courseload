import { describe, expect, it } from 'vitest';
import { accentClasses, statusMeta, statusSteps, typeBadgeClass } from '../lib/status';

describe('status presentation', () => {
  it('labels each status in plain words', () => {
    expect(statusMeta('pending').label).toBe('Not started');
    expect(statusMeta('submitted').label).toBe('Submitted');
    expect(statusMeta('acknowledged').label).toBe('Acknowledged');
  });

  it('calls out work handed in after the deadline', () => {
    expect(statusMeta('submitted', { isLate: true }).label).toBe('Submitted late');
    expect(statusMeta('acknowledged', { isLate: true }).label).toBe('Acknowledged late');
  });

  it('takes precedence when the deadline has passed with nothing on file', () => {
    const meta = statusMeta('pending', { overdue: true });
    expect(meta.label).toBe('Overdue');
    expect(meta.tone).toBe('overdue');
  });

  it('gives every tone a colour class of its own', () => {
    const classes = new Set(
      (['pending', 'submitted', 'acknowledged', 'overdue'] as const).map((tone) => statusMeta(tone === 'acknowledged' ? 'acknowledged' : tone === 'submitted' ? 'submitted' : 'pending', { overdue: tone === 'overdue' }).dot),
    );
    expect(classes.size).toBe(4);
  });

  it('maps group and individual work to different badges', () => {
    expect(typeBadgeClass('group')).not.toBe(typeBadgeClass('individual'));
  });

  it('falls back to the teal accent for an unknown course colour', () => {
    expect(accentClasses('something-new')).toEqual(accentClasses('teal'));
  });

  it('marks steps complete as the status moves forward', () => {
    expect(statusSteps('pending').map((step) => step.done)).toEqual([false, false, false]);
    expect(statusSteps('submitted').map((step) => step.done)).toEqual([true, true, false]);
    expect(statusSteps('acknowledged').map((step) => step.done)).toEqual([true, true, true]);
  });
});
