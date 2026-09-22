import { useEffect, useState } from 'react';
import { deadlineLabel } from '../lib/format';

export interface Countdown {
  label: string;
  overdue: boolean;
  dueSoon: boolean;
}

export function useCountdown(dueAt: string | null | undefined): Countdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!dueAt) return null;

  const due = new Date(dueAt).getTime();
  return {
    label: deadlineLabel(dueAt, now),
    overdue: due < now,
    dueSoon: due - now > 0 && due - now < 48 * 3_600_000,
  };
}
