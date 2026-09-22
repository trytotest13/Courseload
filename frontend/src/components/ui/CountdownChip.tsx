import { formatDateTime } from '../../lib/format';
import { cx } from '../../lib/cx';
import { useCountdown } from '../../hooks/useCountdown';

export function CountdownChip({
  dueAt,
  className,
  withDate = false,
}: {
  dueAt: string;
  className?: string;
  withDate?: boolean;
}) {
  const countdown = useCountdown(dueAt);

  const tone = countdown?.overdue
    ? 'border-status-overdue/25 bg-status-overdue-tint text-status-overdue'
    : countdown?.dueSoon
      ? 'border-status-pending/25 bg-status-pending-tint text-status-pending'
      : 'border-line bg-surface text-ink-soft';

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.74rem] font-semibold',
        tone,
        className,
      )}
      title={'Due ' + formatDateTime(dueAt)}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm.75 3.25a.75.75 0 0 0-1.5 0V8c0 .2.08.39.22.53l1.75 1.75a.75.75 0 1 0 1.06-1.06L8.75 7.69V4.75Z" />
      </svg>
      {countdown?.label ?? 'No deadline'}
      {withDate ? <span className="font-normal opacity-80">({formatDateTime(dueAt)})</span> : null}
    </span>
  );
}
