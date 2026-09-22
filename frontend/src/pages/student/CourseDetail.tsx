import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { coursesApi } from '../../api/endpoints';
import type { StudentAssignment } from '../../api/types';
import { StudentAssignmentRow } from '../../components/app/AssignmentRow';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  Tabs,
  type TabItem,
} from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { pluralise } from '../../lib/format';

type Filter = 'all' | 'open' | 'submitted' | 'acknowledged';

export function StudentCourseDetail() {
  const { courseId = '' } = useParams();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, loading, error, reload } = useAsync(() => coursesApi.detail(courseId), [courseId]);

  const detail = data && data.role === 'student' ? data : null;
  const assignments: StudentAssignment[] = detail?.assignments ?? [];

  const counts = useMemo(
    () => ({
      all: assignments.length,
      open: assignments.filter((item) => item.status === 'pending').length,
      submitted: assignments.filter((item) => item.status === 'submitted').length,
      acknowledged: assignments.filter((item) => item.status === 'acknowledged').length,
    }),
    [assignments],
  );

  const visible = assignments.filter((item) => {
    if (filter === 'open') return item.status === 'pending';
    if (filter === 'submitted') return item.status === 'submitted';
    if (filter === 'acknowledged') return item.status === 'acknowledged';
    return true;
  });

  const tabs: Array<TabItem<Filter>> = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'open', label: 'Not started', count: counts.open },
    { value: 'submitted', label: 'Submitted', count: counts.submitted },
    { value: 'acknowledged', label: 'Acknowledged', count: counts.acknowledged },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/student' }, { label: detail?.course.code ?? 'Course' }]}
        eyebrow={
          detail ? <p className="font-mono text-[0.78rem] font-medium text-primary">{detail.course.code}</p> : undefined
        }
        title={detail?.course.title ?? 'Loading course'}
        description={detail?.course.description}
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={tabs} value={filter} onChange={setFilter} ariaLabel="Filter assignments" />
        <p className="text-[0.78rem] text-ink-faint">
          {pluralise(visible.length, 'assignment')} shown
        </p>
      </div>

      {loading && !detail ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 rounded-card" />
          ))}
        </div>
      ) : null}

      {detail && visible.length === 0 ? (
        <EmptyState
          title={counts.all === 0 ? 'No assignments yet' : 'Nothing in this filter'}
          description={
            counts.all === 0
              ? 'Your professor has not set any work for this course yet.'
              : 'Try another filter to see the rest of your work.'
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visible.map((assignment, index) => (
            <li key={assignment.id} className="animate-fade-rise" style={{ animationDelay: index * 40 + 'ms' }}>
              <StudentAssignmentRow assignment={assignment} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
