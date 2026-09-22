import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/endpoints';
import { StudentCourseCard } from '../../components/app/CourseCard';
import {
  Card,
  CountdownChip,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  StatTile,
  StatusPill,
  TypeBadge,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { formatToday, greeting, pluralise } from '../../lib/format';

export function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.load(), [user?.id]);

  const dashboard = data && data.role === 'student' ? data : null;
  const firstName = (user?.name ?? '').split(' ')[0];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow={<p className="label-micro">{formatToday()}</p>}
        title={greeting() + ', ' + firstName}
        description="Here is what your courses need from you this week."
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your numbers">
            <StatTile
              label="Courses"
              value={dashboard.stats.courses}
              hint={pluralise(dashboard.stats.assignments, 'assignment') + ' in total'}
            />
            <StatTile
              label="Due this week"
              value={dashboard.stats.dueThisWeek}
              hint="Next seven days"
            />
            <StatTile
              label="Waiting on you"
              value={dashboard.stats.waitingOnYou}
              tone={dashboard.stats.waitingOnYou > 0 ? 'warn' : 'good'}
              hint={dashboard.stats.overdue > 0 ? dashboard.stats.overdue + ' already past due' : 'Nothing past due'}
            />
            <StatTile
              label="Acknowledged"
              value={dashboard.stats.acknowledged}
              tone="good"
              hint="Confirmed with your professor"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Your courses</h2>
                <span className="text-[0.78rem] text-ink-faint">
                  {pluralise(dashboard.courses.length, 'course')}
                </span>
              </div>

              {dashboard.courses.length === 0 ? (
                <EmptyState
                  title="No courses yet"
                  description="Your professor adds you to a course. Check back once enrolment is done."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {dashboard.courses.map((course) => (
                    <StudentCourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-ink">Next up</h2>

              {dashboard.upcoming.length === 0 ? (
                <EmptyState
                  title="Nothing on the horizon"
                  description="No deadlines in front of you right now. Enjoy it while it lasts."
                />
              ) : (
                <ol className="flex flex-col gap-3">
                  {dashboard.upcoming.map((item, index) => (
                    <li key={item.id} className="animate-fade-rise" style={{ animationDelay: index * 45 + 'ms' }}>
                      <Link
                        to={'/student/assignments/' + item.id}
                        className="block rounded-card border border-line bg-surface px-4 py-3.5 transition hover:border-ink-faint hover:shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[0.7rem] uppercase text-ink-faint">
                              {item.courseCode}
                            </p>
                            <p className="mt-1 truncate font-semibold text-ink">{item.title}</p>
                          </div>
                          <CountdownChip dueAt={item.dueAt} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <StatusPill
                            status={item.status}
                            overdue={item.status === 'pending' && new Date(item.dueAt).getTime() < Date.now()}
                          />
                          <TypeBadge type={item.submissionType} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}

              <Card className="bg-primary-tint/60 p-4">
                <p className="text-[0.84rem] font-semibold text-primary">How acknowledgement works</p>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
                  Handing work in marks it submitted. Confirming it marks it acknowledged, which tells
                  your professor you have seen the final version. For group work the leader confirms for
                  everybody.
                </p>
              </Card>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
