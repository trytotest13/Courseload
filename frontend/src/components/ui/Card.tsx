import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cx('card', interactive && 'transition hover:-translate-y-0.5 hover:shadow-lift', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[0.82rem] text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'warn' | 'good';
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-status-pending'
      : tone === 'good'
        ? 'text-status-acknowledged'
        : 'text-ink';

  return (
    <div className="card px-4 py-3.5">
      <p className="label-micro">{label}</p>
      <p className={cx('mt-1.5 font-display text-2xl font-semibold leading-none', toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-[0.74rem] text-ink-faint">{hint}</p> : null}
    </div>
  );
}
