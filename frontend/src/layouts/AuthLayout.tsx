import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* The left panel carries the product voice, so the form side stays quiet. */}
      <aside className="relative hidden overflow-hidden bg-ink px-10 py-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, #0E6B5C 0, transparent 42%), radial-gradient(circle at 80% 75%, #C8794A 0, transparent 45%)',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-paper text-base font-bold text-ink">
              C
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Courseload</span>
          </Link>

          <p className="mt-16 max-w-md font-display text-[2.35rem] font-semibold leading-[1.1] tracking-tight">
            Every deadline, submission and acknowledgement in one place.
          </p>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-paper/75">
            Students hand work in and confirm it. Professors see who is still quiet, without chasing
            anybody for a status update.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-4 border-t border-paper/15 pt-6 text-[0.78rem]">
          <div>
            <dt className="text-paper/60">Courses tracked</dt>
            <dd className="mt-1 font-display text-xl font-semibold">12</dd>
          </div>
          <div>
            <dt className="text-paper/60">Submissions logged</dt>
            <dd className="mt-1 font-display text-xl font-semibold">340</dd>
          </div>
          <div>
            <dt className="text-paper/60">Acknowledged</dt>
            <dd className="mt-1 font-display text-xl font-semibold">298</dd>
          </div>
        </dl>
      </aside>

      <main className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md animate-fade-rise">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink text-sm font-bold text-paper">
              C
            </span>
            <span className="font-display text-base font-semibold">Courseload</span>
          </Link>

          <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-ink">{title}</h1>
          <p className="mt-2 text-[0.92rem] text-ink-soft">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 text-[0.85rem] text-ink-soft">{footer}</div>
        </div>
      </main>
    </div>
  );
}
