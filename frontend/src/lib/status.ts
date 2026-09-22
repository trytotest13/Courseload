import type { EffectiveStatus, SubmissionType } from '../api/types';

export type Tone = 'pending' | 'submitted' | 'acknowledged' | 'overdue';

export interface StatusMeta {
  label: string;
  tone: Tone;
  pill: string;
  dot: string;
  bar: string;
  hint: string;
}

/* Tailwind removes classes it cannot see, so every tone keeps its full class name here. */
const tones: Record<Tone, { pill: string; dot: string; bar: string }> = {
  pending: {
    pill: 'bg-status-pending-tint text-status-pending border-status-pending/25',
    dot: 'bg-status-pending',
    bar: 'bg-status-pending',
  },
  submitted: {
    pill: 'bg-status-submitted-tint text-status-submitted border-status-submitted/25',
    dot: 'bg-status-submitted',
    bar: 'bg-status-submitted',
  },
  acknowledged: {
    pill: 'bg-status-acknowledged-tint text-status-acknowledged border-status-acknowledged/25',
    dot: 'bg-status-acknowledged',
    bar: 'bg-status-acknowledged',
  },
  overdue: {
    pill: 'bg-status-overdue-tint text-status-overdue border-status-overdue/25',
    dot: 'bg-status-overdue',
    bar: 'bg-status-overdue',
  },
};

export function statusMeta(
  status: EffectiveStatus,
  options: { isLate?: boolean; overdue?: boolean } = {},
): StatusMeta {
  if (options.overdue) {
    return {
      label: 'Overdue',
      tone: 'overdue',
      ...tones.overdue,
      hint: 'The deadline has passed. You can still hand work in.',
    };
  }

  if (status === 'acknowledged') {
    return {
      label: options.isLate ? 'Acknowledged late' : 'Acknowledged',
      tone: 'acknowledged',
      ...tones.acknowledged,
      hint: 'You have confirmed the submitted work.',
    };
  }

  if (status === 'submitted') {
    return {
      label: options.isLate ? 'Submitted late' : 'Submitted',
      tone: 'submitted',
      ...tones.submitted,
      hint: 'Handed in. Acknowledge it to close the loop.',
    };
  }

  return {
    label: 'Not started',
    tone: 'pending',
    ...tones.pending,
    hint: 'Nothing handed in yet.',
  };
}

export function assignmentTypeLabel(type: SubmissionType): string {
  return type === 'group' ? 'Group work' : 'Individual work';
}

export function typeBadgeClass(type: SubmissionType): string {
  return type === 'group'
    ? 'bg-accent-tint text-accent border-accent/30'
    : 'bg-primary-tint text-primary border-primary/25';
}

/** Course cards keep a colour of their own so a grid of them is not a wall of white. */
const accents: Record<string, { bar: string; chip: string; text: string }> = {
  teal: { bar: 'bg-course-teal', chip: 'bg-primary-tint', text: 'text-primary' },
  ochre: { bar: 'bg-course-ochre', chip: 'bg-accent-tint', text: 'text-course-ochre' },
  plum: { bar: 'bg-course-plum', chip: 'bg-[#F6EAF2]', text: 'text-course-plum' },
  moss: { bar: 'bg-course-moss', chip: 'bg-[#EDF3E4]', text: 'text-course-moss' },
  slate: { bar: 'bg-course-slate', chip: 'bg-[#E9EDF4]', text: 'text-course-slate' },
};

export function accentClasses(accent: string) {
  return accents[accent] ?? accents.teal;
}

export function statusSteps(status: EffectiveStatus) {
  return [
    { key: 'start', label: 'Not started', done: status !== 'pending' },
    { key: 'submitted', label: 'Submitted', done: status !== 'pending' },
    { key: 'acknowledged', label: 'Acknowledged', done: status === 'acknowledged' },
  ];
}
