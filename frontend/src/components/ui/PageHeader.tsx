import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <header className="animate-fade-rise">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-ink-faint">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label + index} className="flex items-center gap-1.5">
                {crumb.to ? (
                  <Link to={crumb.to} className="font-medium text-ink-soft transition hover:text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
          <h1 className="font-display text-display-sm font-semibold text-ink sm:text-display">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
