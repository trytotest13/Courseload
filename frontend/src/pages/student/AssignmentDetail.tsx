import { useParams } from 'react-router-dom';
import { assignmentsApi } from '../../api/endpoints';
import { ActivityFeed } from '../../components/app/ActivityFeed';
import { GroupPanel } from '../../components/app/GroupPanel';
import { SubmissionPanel } from '../../components/app/SubmissionPanel';
import {
  Card,
  CountdownChip,
  ErrorState,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatusPill,
  StatusTimeline,
  TypeBadge,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useCountdown } from '../../hooks/useCountdown';
import { formatDate, formatDateTime, pluralise } from '../../lib/format';
import { statusMeta } from '../../lib/status';

export function StudentAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => assignmentsApi.detail(assignmentId), [assignmentId]);

  const detail = data && data.role === 'student' ? data : null;
  const assignment = detail?.assignment;
  const countdown = useCountdown(assignment?.dueAt);
  const overdue = Boolean(countdown?.overdue && assignment?.status === 'pending');

  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (error || !assignment) {
    return <ErrorState message={error ?? 'We could not load that assignment.'} onRetry={reload} />;
  }

  const meta = statusMeta(assignment.status, { isLate: assignment.isLate, overdue });
  const progress =
    assignment.status === 'acknowledged' ? 100 : assignment.status === 'submitted' ? 68 : 18;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/student' },
          { label: assignment.courseCode, to: '/student/courses/' + assignment.courseId },
          { label: 'Assignment' },
        ]}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={assignment.submissionType} />
            <span className="font-mono text-[0.74rem] text-ink-faint">
              {assignment.courseCode} / {pluralise(assignment.maxPoints, 'point')}
            </span>
          </div>
        }
        title={assignment.title}
        actions={<CountdownChip dueAt={assignment.dueAt} withDate />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-ink">What to do</h2>
              <StatusPill status={assignment.status} isLate={assignment.isLate} overdue={overdue} />
            </div>
            <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-soft">
              {assignment.description || 'Your professor did not add a description for this one.'}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[0.82rem] sm:grid-cols-3">
              <div>
                <dt className="label-micro">Due</dt>
                <dd className="mt-1 text-ink">{formatDateTime(assignment.dueAt)}</dd>
              </div>
              <div>
                <dt className="label-micro">Submitted</dt>
                <dd className="mt-1 text-ink">
                  {assignment.submittedAt ? formatDateTime(assignment.submittedAt) : 'Not yet'}
                </dd>
              </div>
              <div>
                <dt className="label-micro">Time left</dt>
                <dd className="mt-1 text-ink">{countdown?.label ?? formatDate(assignment.dueAt)}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[0.76rem] text-ink-soft">
                <span>{meta.hint}</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <ProgressBar
                value={progress}
                tone={meta.tone}
                className="mt-2"
                label={assignment.title + ' progress'}
              />
            </div>
          </Card>

          <ActivityFeed entries={detail.activity} />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <p className="label-micro">Status</p>
            <div className="mt-3">
              <StatusTimeline status={assignment.status} isLate={assignment.isLate} />
            </div>
          </Card>

          <SubmissionPanel
            assignment={assignment}
            leaderName={detail.group?.leaderName}
            onUpdated={reload}
          />

          {detail.group ? (
            <GroupPanel
              group={detail.group}
              viewerId={user?.id ?? ''}
              canAcknowledge={assignment.isGroupLeader}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
