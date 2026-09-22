import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { coursesApi } from '../../api/endpoints';
import { ProfessorAssignmentRow } from '../../components/app/AssignmentRow';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatTile,
  Tabs,
  type TabItem,
} from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { percent, pluralise } from '../../lib/format';

type Tab = 'assignments' | 'roster';

export function ProfessorCourseDetail() {
  const { courseId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('assignments');
  const { data, loading, error, reload } = useAsync(() => coursesApi.detail(courseId), [courseId]);

  const detail = data && data.role === 'professor' ? data : null;
  const assignments = detail?.assignments ?? [];
  const roster = detail?.roster ?? [];

  const totals = assignments.reduce(
    (acc, assignment) => ({
      expected: acc.expected + assignment.expected,
      submitted: acc.submitted + assignment.submitted,
      acknowledged: acc.acknowledged + assignment.acknowledged,
      pending: acc.pending + assignment.pending,
    }),
    { expected: 0, submitted: 0, acknowledged: 0, pending: 0 },
  );

  const tabs: Array<TabItem<Tab>> = [
    { value: 'assignments', label: 'Assignments', count: assignments.length },
    { value: 'roster', label: 'Roster', count: roster.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/professor' }, { label: detail?.course.code ?? 'Course' }]}
        eyebrow={
          detail ? (
            <p className="font-mono text-[0.78rem] font-medium text-primary">{detail.course.code}</p>
          ) : undefined
        }
        title={detail?.course.title ?? 'Loading course'}
        description={detail?.course.description}
        actions={
          <Link to={'/professor/courses/' + courseId + '/assignments/new'}>
            <Button leading={<span aria-hidden="true">+</span>}>New assignment</Button>
          </Link>
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !detail ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      ) : null}

      {detail ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Course numbers">
            <StatTile label="Students" value={roster.length} hint="Enrolled in this course" />
            <StatTile
              label="Handed in"
              value={totals.submitted + ' / ' + totals.expected}
              hint={percent(totals.submitted, totals.expected) + '% of expected work'}
            />
            <StatTile
              label="Acknowledged"
              value={totals.acknowledged}
              tone="good"
              hint="Confirmed by the student or leader"
            />
            <StatTile
              label="Outstanding"
              value={totals.pending}
              tone={totals.pending > 0 ? 'warn' : 'good'}
              hint="Still to hand in or acknowledge"
            />
          </section>

          <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Course sections" />

          {tab === 'assignments' ? (
            assignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Set the first piece of work and it will show up for every enrolled student."
                action={
                  <Link to={'/professor/courses/' + courseId + '/assignments/new'}>
                    <Button>Create the first assignment</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {assignments.map((assignment, index) => (
                  <li key={assignment.id} className="animate-fade-rise" style={{ animationDelay: index * 40 + 'ms' }}>
                    <ProfessorAssignmentRow assignment={assignment} />
                  </li>
                ))}
              </ul>
            )
          ) : roster.length === 0 ? (
            <EmptyState
              title="Nobody enrolled yet"
              description="Enrolments come from the course setup. Add students through the API for now."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="hidden grid-cols-[2fr_1.4fr_1fr_1fr] gap-4 border-b border-line bg-paper/60 px-5 py-3 md:grid">
                <span className="label-micro">Student</span>
                <span className="label-micro">Progress</span>
                <span className="label-micro">Handed in</span>
                <span className="label-micro">Acknowledged</span>
              </div>
              <ul>
                {roster.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[2fr_1.4fr_1fr_1fr] md:items-center md:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={entry.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[0.88rem] font-semibold text-ink">{entry.name}</p>
                        <p className="truncate text-[0.75rem] text-ink-faint">{entry.email}</p>
                      </div>
                    </div>

                    <div>
                      <ProgressBar
                        value={percent(entry.submitted, Math.max(assignments.length, 1))}
                        thickness="thin"
                        label={entry.name + ' submission progress'}
                      />
                      <p className="mt-1.5 text-[0.74rem] text-ink-faint">
                        {entry.pending > 0
                          ? pluralise(entry.pending, 'item') + ' outstanding'
                          : 'Nothing outstanding'}
                      </p>
                    </div>

                    <p className="text-[0.84rem] text-ink">
                      <span className="font-semibold">{entry.submitted}</span>
                      <span className="text-ink-faint"> / {assignments.length}</span>
                    </p>

                    <p className="text-[0.84rem] text-ink">
                      <span className="font-semibold">{entry.acknowledged}</span>
                      <span className="text-ink-faint"> / {assignments.length}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
