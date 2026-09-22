import type { EffectiveStatus } from '../../api/types';
import { cx } from '../../lib/cx';
import { statusMeta } from '../../lib/status';

const steps = [
  { key: 'started', label: 'Not started', reached: () => false },
  { key: 'submitted', label: 'Submitted', reached: (status: EffectiveStatus) => status !== 'pending' },
  {
    key: 'acknowledged',
    label: 'Acknowledged',
    reached: (status: EffectiveStatus) => status === 'acknowledged',
  },
];

export function StatusTimeline({ status, isLate }: { status: EffectiveStatus; isLate?: boolean }) {
  const meta = statusMeta(status, { isLate });

  return (
    <ol className="flex flex-col gap-0" aria-label="Submission progress">
      {steps.map((step, index) => {
        const done = index === 0 ? true : step.reached(status);
        const isCurrent = status === 'pending' ? index === 0 : !done ? index === 1 : index === 2;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-bold transition',
                  done
                    ? 'border-transparent bg-primary text-white'
                    : 'border-line bg-surface text-ink-faint',
                  index === 1 && status === 'submitted' ? 'animate-pop' : '',
                )}
                aria-hidden="true"
              >
                {done ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" strokeWidth="2.4">
                    <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cx(
                    'my-0.5 w-0.5 flex-1 origin-top rounded-full',
                    done && step.reached(status) ? 'bg-primary/40' : 'bg-line',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className={cx('pb-5', index === steps.length - 1 && 'pb-0')}>
              <p
                className={cx(
                  'text-sm font-semibold',
                  done ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {step.label}
                {isCurrent ? (
                  <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wide text-ink-soft">
                    current
                  </span>
                ) : null}
              </p>
              {index === 1 ? <p className="mt-0.5 text-[0.78rem] text-ink-soft">{meta.hint}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
