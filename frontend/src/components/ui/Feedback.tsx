import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton h-4 w-full', className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5" aria-hidden="true">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-5 h-2 w-full" />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-status-overdue/25 bg-status-overdue-tint px-5 py-4">
      <p className="text-sm font-semibold text-status-overdue">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-[0.82rem] font-semibold text-status-overdue underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
