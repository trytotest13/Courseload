import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Feedback';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leading?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-dark focus-visible:ring-primary/30 disabled:hover:bg-primary',
  secondary:
    'border border-line bg-surface text-ink hover:border-ink-faint hover:bg-paper focus-visible:ring-primary/20',
  ghost: 'text-ink-soft hover:bg-paper hover:text-ink focus-visible:ring-primary/20',
  danger:
    'bg-status-overdue text-white shadow-sm hover:brightness-95 focus-visible:ring-status-overdue/30',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[0.82rem]',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-[0.95rem]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-field font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <Spinner /> : leading}
      {children}
    </button>
  );
}
