import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  trailingLabel?: ReactNode;
}

export function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  trailingLabel,
}: FieldShellProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
        {trailingLabel}
      </div>
      {children}
      {error ? (
        <p className="field-error" id={htmlFor + '-error'}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.78rem] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailingLabel?: ReactNode;
}

export function TextField({ label, error, hint, trailingLabel, className, id, ...rest }: TextFieldProps) {
  const fieldId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldShell
      label={label}
      htmlFor={fieldId}
      error={error}
      hint={hint}
      className={className}
      trailingLabel={trailingLabel}
    >
      <input
        {...rest}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-error' : undefined}
        className={cx('field-input', error && 'border-status-overdue/60 focus:border-status-overdue')}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, className, id, ...rest }: TextAreaFieldProps) {
  const fieldId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} className={className}>
      <textarea
        {...rest}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-error' : undefined}
        className={cx(
          'field-input min-h-[120px] resize-y',
          error && 'border-status-overdue/60 focus:border-status-overdue',
        )}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function SelectField({ label, error, hint, className, id, children, ...rest }: SelectFieldProps) {
  const fieldId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} className={className}>
      <select {...rest} id={fieldId} className="field-input pr-8">
        {children}
      </select>
    </FieldShell>
  );
}
