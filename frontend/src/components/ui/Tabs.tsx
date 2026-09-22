import { cx } from '../../lib/cx';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className, ariaLabel }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? 'Filters'}
      className={cx('flex flex-wrap gap-1 rounded-field border border-line bg-surface p-1', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              'rounded-[7px] px-3 py-1.5 text-[0.82rem] font-semibold transition',
              active ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:bg-paper hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className={cx('ml-1.5', active ? 'text-white/80' : 'text-ink-faint')}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string; description?: string }>;
  value: T;
  onChange: (value: T) => void;
  name: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'rounded-card border px-4 py-3 text-left transition',
              active
                ? 'border-primary bg-primary-tint shadow-sm'
                : 'border-line bg-surface hover:border-ink-faint',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  'flex h-4 w-4 items-center justify-center rounded-full border-2 transition',
                  active ? 'border-primary' : 'border-line',
                )}
                aria-hidden="true"
              >
                {active ? <span className="h-2 w-2 rounded-full bg-primary animate-pop" /> : null}
              </span>
              <span className="text-sm font-semibold text-ink">{option.label}</span>
            </span>
            {option.description ? (
              <span className="mt-1.5 block text-[0.78rem] leading-snug text-ink-soft">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
