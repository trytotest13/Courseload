import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const tones: Record<AlertTone, string> = {
  error: 'border-status-overdue/30 bg-status-overdue-tint text-status-overdue',
  success: 'border-status-acknowledged/30 bg-status-acknowledged-tint text-status-acknowledged',
  info: 'border-status-submitted/25 bg-status-submitted-tint text-status-submitted',
  warning: 'border-status-pending/30 bg-status-pending-tint text-status-pending',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('animate-fade-rise rounded-card border px-3.5 py-3', tones[tone], className)}
    >
      {title ? <p className="text-[0.82rem] font-semibold">{title}</p> : null}
      <div className={cx('text-[0.82rem] leading-relaxed', title && 'mt-0.5')}>{children}</div>
    </div>
  );
}
