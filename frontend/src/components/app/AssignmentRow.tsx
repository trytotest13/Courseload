import { Link } from 'react-router-dom';
import type { ProfessorAssignment, StudentAssignment } from '../../api/types';
import { formatDateTime, percent, pluralise } from '../../lib/format';
import { statusMeta } from '../../lib/status';
import { CountdownChip, ProgressBar, StatusPill, TypeBadge } from '../ui';

function statusProgress(status: StudentAssignment['status']): number {
  if (status === 'acknowledged') return 100;
  if (status === 'submitted') return 65;
  return 20;
}

export function StudentAssignmentRow({ assignment }: { assignment: StudentAssignment }) {
  const overdue = assignment.status === 'pending' && new Date(assignment.dueAt).getTime() < Date.now();
  const meta = statusMeta(assignment.status, { isLate: assignment.isLate, overdue });

  return (
    <Link
      to={'/student/assignments/' + assignment.id}
      className="block rounded-card border border-line bg-surface px-4 py-4 transition hover:border-ink-faint hover:shadow-card sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[1.02rem] font-semibold text-ink">{assignment.title}</h3>
            <TypeBadge type={assignment.submissionType} />
          </div>
          <p className="mt-1.5 text-[0.8rem] text-ink-soft">
            Due {formatDateTime(assignment.dueAt)}
            {assignment.grade !== null ? ' / graded ' + assignment.grade + '/' + assignment.maxPoints : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountdownChip dueAt={assignment.dueAt} />
          <StatusPill status={assignment.status} isLate={assignment.isLate} overdue={overdue} />
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar
          value={statusProgress(assignment.status)}
          tone={meta.tone}
          thickness="thin"
          label={assignment.title + ' progress'}
        />
      </div>
    </Link>
  );
}

export function ProfessorAssignmentRow({ assignment }: { assignment: ProfessorAssignment }) {
  const submitted = percent(assignment.submitted, Math.max(assignment.expected, 1));
  const tag = assignment.expected === 0 ? 'No students yet' : assignment.submitted + ' of ' + assignment.expected + ' handed in';

  return (
    <Link
      to={'/professor/assignments/' + assignment.id}
      className="block rounded-card border border-line bg-surface px-4 py-4 transition hover:border-ink-faint hover:shadow-card sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[1.02rem] font-semibold text-ink">{assignment.title}</h3>
            <TypeBadge type={assignment.submissionType} />
          </div>
          <p className="mt-1.5 text-[0.8rem] text-ink-soft">
            Due {formatDateTime(assignment.dueAt)} / {pluralise(assignment.maxPoints, 'point')}
            {assignment.submissionType === 'group'
              ? ' / ' + pluralise(assignment.groupCount, 'group')
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountdownChip dueAt={assignment.dueAt} />
          {assignment.pending > 0 ? (
            <span className="rounded-full border border-status-pending/25 bg-status-pending-tint px-2.5 py-1 text-[0.72rem] font-semibold text-status-pending">
              {assignment.pending} to review
            </span>
          ) : (
            <span className="rounded-full border border-status-acknowledged/25 bg-status-acknowledged-tint px-2.5 py-1 text-[0.72rem] font-semibold text-status-acknowledged">
              Nothing pending
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar
          value={submitted}
          tone={submitted === 100 ? 'acknowledged' : 'submitted'}
          thickness="thin"
          label={assignment.title + ' submission rate'}
          className="flex-1"
        />
        <span className="shrink-0 text-[0.74rem] font-semibold text-ink-soft">{tag}</span>
      </div>
    </Link>
  );
}
