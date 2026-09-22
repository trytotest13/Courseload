import { cx } from '../../lib/cx';

type ProgressTone = 'primary' | 'pending' | 'submitted' | 'acknowledged' | 'overdue';

const toneClass: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  pending: 'bg-status-pending',
  submitted: 'bg-status-submitted',
  acknowledged: 'bg-status-acknowledged',
  overdue: 'bg-status-overdue',
};

interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
  thickness?: 'thin' | 'regular';
}

export function ProgressBar({
  value,
  tone = 'primary',
  label,
  className,
  thickness = 'regular',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx(
        'w-full overflow-hidden rounded-full bg-line/70',
        thickness === 'thin' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cx('h-full rounded-full transition-all duration-500 ease-out', toneClass[tone])}
        style={{ width: clamped + '%' }}
      />
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  thickness?: number;
  tone?: ProgressTone;
  caption?: string;
}

const ringTone: Record<ProgressTone, string> = {
  primary: 'text-primary',
  pending: 'text-status-pending',
  submitted: 'text-status-submitted',
  acknowledged: 'text-status-acknowledged',
  overdue: 'text-status-overdue',
};

export function ProgressRing({
  value,
  size = 56,
  thickness = 5,
  tone = 'primary',
  caption,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={'0 0 ' + size + ' ' + size}
        className="-rotate-90"
        role="img"
        aria-label={(caption ?? 'Progress') + ': ' + clamped + ' percent'}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cx('transition-[stroke-dashoffset] duration-700 ease-out', ringTone[tone])}
          stroke="currentColor"
        />
      </svg>
      <div>
        <p className="font-display text-xl font-semibold leading-none text-ink">{clamped}%</p>
        {caption ? <p className="mt-1 text-[0.72rem] text-ink-faint">{caption}</p> : null}
      </div>
    </div>
  );
}
