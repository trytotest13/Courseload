import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/endpoints';
import { ProfessorCourseCard } from '../../components/app/CourseCard';
import {
  Card,
  CountdownChip,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  SkeletonCard,
  StatTile,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { formatToday, greeting, percent, pluralise } from '../../lib/format';

export function ProfessorDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.load(), [user?.id]);

  const dashboard = data && data.role === 'professor' ? data : null;
  const firstName = (user?.name ?? '').split(' ')[0];
  const ackRate = dashboard ? percent(dashboard.stats.acknowledged, Math.max(dashboard.stats.expected, 1)) : 0;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow={<p className="label-micro">{formatToday()}</p>}
        title={greeting() + ', Professor ' + firstName}
        description="Everything you teach, and who still has work outstanding."
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Class numbers">
            <StatTile
              label="Courses"
              value={dashboard.stats.courses}
              hint={pluralise(dashboard.stats.assignments, 'assignment') + ' set'}
            />
            <StatTile label="Students" value={dashboard.stats.students} hint="Across your courses" />
            <StatTile
              label="To review"
              value={dashboard.stats.toReview}
              tone={dashboard.stats.toReview > 0 ? 'warn' : 'good'}
              hint="Handed in, not acknowledged"
            />
            <StatTile
              label="Acknowledged"
              value={ackRate + '%'}
              tone="good"
              hint={dashboard.stats.acknowledged + ' of ' + dashboard.stats.expected + ' expected'}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Courses you teach</h2>
                <span className="text-[0.78rem] text-ink-faint">
                  {pluralise(dashboard.courses.length, 'course')}
                </span>
              </div>

              {dashboard.courses.length === 0 ? (
                <EmptyState
                  title="No courses yet"
                  description="Create a course through the API to get started, then add assignments to it."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {dashboard.courses.map((course) => (
                    <ProfessorCourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-ink">Needs attention</h2>

              {dashboard.needsAttention.length === 0 ? (
                <EmptyState
                  title="Nothing closing soon"
                  description="No deadline in the next 48 hours is still waiting on students."
                />
              ) : (
                <ol className="flex flex-col gap-3">
                  {dashboard.needsAttention.map((item, index) => (
                    <li key={item.id} className="animate-fade-rise" style={{ animationDelay: index * 45 + 'ms' }}>
                      <Link
                        to={'/professor/assignments/' + item.id}
                        className="block rounded-card border border-line bg-surface px-4 py-3.5 transition hover:border-ink-faint hover:shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[0.7rem] uppercase text-ink-faint">{item.courseCode}</p>
                            <p className="mt-1 truncate font-semibold text-ink">{item.title}</p>
                          </div>
                          <CountdownChip dueAt={item.dueAt} />
                        </div>
                        <div className="mt-3">
                          <ProgressBar
                            value={percent(item.expected - item.pending, item.expected)}
                            tone="pending"
                            thickness="thin"
                            label={item.title + ' submission rate'}
                          />
                          <p className="mt-1.5 text-[0.76rem] text-ink-soft">
                            {item.pending} of {item.expected} still to hand in
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}

              <Card className="bg-primary-tint/60 p-4">
                <p className="text-[0.84rem] font-semibold text-primary">Acknowledgement tells you more than submission</p>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
                  A submission means work arrived. An acknowledgement means the student has seen the
                  final version. For group work, the leader confirms once for the whole team.
                </p>
              </Card>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
