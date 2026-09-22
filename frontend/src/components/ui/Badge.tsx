import type { ReactNode } from 'react';
import type { EffectiveStatus, SubmissionType } from '../../api/types';
import { cx } from '../../lib/cx';
import { assignmentTypeLabel, statusMeta, typeBadgeClass } from '../../lib/status';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface StatusPillProps {
  status: EffectiveStatus;
  isLate?: boolean;
  overdue?: boolean;
  className?: string;
}

export function StatusPill({ status, isLate, overdue, className }: StatusPillProps) {
  const meta = statusMeta(status, { isLate, overdue });
  return (
    <Badge className={cx(meta.pill, className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

export function TypeBadge({ type, className }: { type: SubmissionType; className?: string }) {
  return (
    <Badge className={cx(typeBadgeClass(type), className)}>
      {type === 'group' ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="currentColor">
          <path d="M5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm-3 .5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm7.5 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="currentColor">
          <path d="M8 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm0 1.2c2.4 0 4.5 1.2 4.5 2.8v1H3.5v-1c0-1.6 2.1-2.8 4.5-2.8Z" />
        </svg>
      )}
      {assignmentTypeLabel(type)}
    </Badge>
  );
}
