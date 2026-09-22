import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { assignmentsApi, submissionsApi } from '../../api/endpoints';
import type { StatusFilter, SubmissionRow } from '../../api/types';
import { ActivityFeed } from '../../components/app/ActivityFeed';
import {
  Avatar,
  AvatarGroup,
  Button,
  Card,
  CountdownChip,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatTile,
  StatusPill,
  Tabs,
  TextAreaField,
  TextField,
  TypeBadge,
  type TabItem,
} from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime, percent, pluralise } from '../../lib/format';

export function ProfessorAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const { push } = useToast();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [grading, setGrading] = useState<SubmissionRow | null>(null);

  // Give the search box a moment before it hits the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const detail = useAsync(() => assignmentsApi.detail(assignmentId), [assignmentId]);
  const table = useAsync(
    () => assignmentsApi.submissions(assignmentId, { status, q: debouncedQuery }),
    [assignmentId, status, debouncedQuery],
  );

  const overview = detail.data && detail.data.role === 'professor' ? detail.data : null;
  const rows: SubmissionRow[] = table.data?.rows ?? [];
  const tally = table.data?.tally ?? overview?.tally;

  const tabs = useMemo<Array<TabItem<StatusFilter>>>(() => {
    const base = overview?.tally ?? { pending: 0, submitted: 0, acknowledged: 0, late: 0, expected: 0 };
    return [
      { value: 'all', label: 'All', count: base.expected },
      { value: 'pending', label: 'Not handed in', count: base.pending },
      {
        value: 'submitted',
        label: 'Awaiting confirmation',
        // The submitted filter returns rows that are handed in but not yet
        // acknowledged, so the count has to match that, not every hand in.
        count: Math.max(base.submitted - base.acknowledged, 0),
      },
      { value: 'acknowledged', label: 'Acknowledged', count: base.acknowledged },
      { value: 'late', label: 'Late', count: base.late },
    ];
  }, [overview]);

  const handleGraded = () => {
    setGrading(null);
    table.reload();
    detail.reload();
  };

  if (detail.loading && !overview) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  if (detail.error || !overview) {
    return <ErrorState message={detail.error ?? 'We could not load that assignment.'} onRetry={detail.reload} />;
  }

  const { assignment } = overview;
  const isGroup = assignment.submissionType === 'group';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/professor' },
          { label: assignment.courseCode, to: '/professor/courses/' + assignment.courseId },
          { label: 'Submissions' },
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
        description={assignment.description}
        actions={
          <>
            <CountdownChip dueAt={assignment.dueAt} withDate />
            <Link to={'/professor/assignments/' + assignmentId + '/edit'}>
              <Button variant="secondary">Edit assignment</Button>
            </Link>
          </>
        }
      />

      {tally ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Submission numbers">
          <StatTile
            label={isGroup ? 'Groups' : 'Students'}
            value={tally.expected}
            hint={isGroup ? 'Each group hands in once' : 'Enrolled on this course'}
          />
          <StatTile
            label="Handed in"
            value={tally.submitted}
            hint={percent(tally.submitted, Math.max(tally.expected, 1)) + '% of expected'}
          />
          <StatTile label="Acknowledged" value={tally.acknowledged} tone="good" hint="Confirmed by the student or leader" />
          <StatTile
            label={tally.late > 0 ? 'Late arrivals' : 'Still outstanding'}
            value={tally.late > 0 ? tally.late : tally.pending}
            tone="warn"
            hint={tally.late > 0 ? 'Handed in after the deadline' : 'No submission on file'}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={tabs} value={status} onChange={setStatus} ariaLabel="Filter submissions by status" />
        <label className="relative">
          <span className="sr-only">Search by student or group</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names"
            className="field-input w-full sm:w-64"
          />
        </label>
      </div>

      {table.error ? <ErrorState message={table.error} onRetry={table.reload} /> : null}

      {rows.length === 0 && !table.loading ? (
        <EmptyState
          title={status === 'all' ? 'Nobody has handed anything in yet' : 'Nothing matches this filter'}
          description={
            status === 'all'
              ? isGroup
                ? 'Group work shows up here as soon as a team hands it in.'
                : 'Submissions appear here the moment a student hands work in.'
              : 'Try a different filter or clear the search.'
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.8fr_1fr_1.2fr_1.2fr_0.9fr_auto] gap-4 border-b border-line bg-paper/60 px-5 py-3 lg:grid">
            <span className="label-micro">{isGroup ? 'Group' : 'Student'}</span>
            <span className="label-micro">Status</span>
            <span className="label-micro">Handed in</span>
            <span className="label-micro">Acknowledged</span>
            <span className="label-micro">Grade</span>
            <span className="label-micro">Action</span>
          </div>

          <ul>
            {rows.map((row) => (
              <li
                key={(row.groupId ?? row.studentId ?? 'row') + row.status}
                className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 lg:grid-cols-[1.8fr_1fr_1.2fr_1.2fr_0.9fr_auto] lg:items-center lg:gap-4"
              >
                <div className="flex items-center gap-3">
                  {isGroup && row.members.length > 0 ? (
                    <AvatarGroup people={row.members} max={3} />
                  ) : (
                    <Avatar name={row.studentName} size="sm" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[0.88rem] font-semibold text-ink">
                      {isGroup ? row.groupName : row.studentName}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink-faint">
                      {isGroup
                        ? 'Led by ' + row.leaderName + ' / ' + pluralise(row.members.length, 'member')
                        : row.studentEmail ?? ''}
                    </p>
                  </div>
                </div>

                <div>
                  <StatusPill status={row.status} isLate={row.isLate} />
                  {row.status !== 'pending' ? (
                    <ProgressBar
                      value={row.status === 'acknowledged' ? 100 : 65}
                      tone={row.status === 'acknowledged' ? 'acknowledged' : 'submitted'}
                      thickness="thin"
                      className="mt-2"
                      label={(row.groupName ?? row.studentName) + ' progress'}
                    />
                  ) : null}
                </div>

                <p className="text-[0.82rem] text-ink-soft">
                  {row.submittedAt ? formatDateTime(row.submittedAt) : 'Not yet'}
                </p>

                <p className="text-[0.82rem] text-ink-soft">
                  {row.acknowledgedAt ? (
                    <>
                      {formatDateTime(row.acknowledgedAt)}
                      {row.acknowledgedBy ? (
                        <span className="block text-[0.74rem] text-ink-faint">{row.acknowledgedBy}</span>
                      ) : null}
                    </>
                  ) : (
                    'Waiting'
                  )}
                </p>

                <p className="text-[0.82rem] text-ink">
                  {row.grade !== null ? (
                    <>
                      <span className="font-semibold">{row.grade}</span>
                      <span className="text-ink-faint"> / {assignment.maxPoints}</span>
                    </>
                  ) : (
                    <span className="text-ink-faint">Not graded</span>
                  )}
                </p>

                <div className="flex lg:justify-end">
                  <Button
                    size="sm"
                    variant={row.status === 'pending' ? 'ghost' : 'secondary'}
                    disabled={row.status === 'pending'}
                    onClick={() => setGrading(row)}
                  >
                    {row.grade !== null ? 'Edit grade' : 'Grade'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isGroup && overview.groups.length > 0 ? (
        <Card className="p-5">
          <h2 className="font-display text-base font-semibold text-ink">Groups on this assignment</h2>
          <p className="mt-1 text-[0.82rem] text-ink-soft">
            The leader confirms the acknowledgement for the whole team. {pluralise(overview.groups.length, 'group')} set up.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {overview.groups.map((group) => (
              <li key={group.id} className="rounded-field border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{group.name}</p>
                  <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[0.68rem] font-semibold uppercase text-accent">
                    Leader {group.leaderName.split(' ')[0]}
                  </span>
                </div>
                <p className="mt-1.5 text-[0.78rem] text-ink-soft">
                  {group.members.map((member) => member.name.split(' ')[0]).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ActivityFeed entries={overview.activity} />

      <GradeDialog
        row={grading}
        maxPoints={assignment.maxPoints}
        onClose={() => setGrading(null)}
        onSaved={handleGraded}
        onError={(message) => push({ title: 'Could not save the grade', description: message, tone: 'error' })}
        onSuccess={() => push({ title: 'Grade saved', tone: 'success' })}
      />
    </div>
  );
}

function GradeDialog({
  row,
  maxPoints,
  onClose,
  onSaved,
  onSuccess,
  onError,
}: {
  row: SubmissionRow | null;
  maxPoints: number;
  onClose: () => void;
  onSaved: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setGrade(row?.grade !== null && row?.grade !== undefined ? String(row.grade) : '');
    setFeedback(row?.feedback ?? '');
    setError(undefined);
  }, [row]);

  if (!row || !row.id) return null;

  const submissionId = row.id;

  const save = async () => {
    const value = Number(grade);
    if (!Number.isFinite(value) || value < 0) {
      setError('Enter a grade of 0 or more.');
      return;
    }
    if (value > maxPoints) {
      setError('That is more than the ' + maxPoints + ' points available.');
      return;
    }

    setSaving(true);
    try {
      await submissionsApi.grade(submissionId, { grade: value, feedback: feedback.trim() });
      onSuccess();
      onSaved();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title="Grade this submission"
      description={
        (row.groupName ?? row.studentName) +
        (row.isLate ? ' / handed in late' : '') +
        ' / ' +
        (row.submittedAt ? formatDateTime(row.submittedAt) : 'not handed in')
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save grade
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {row.content ? (
          <div className="rounded-field border border-line bg-paper px-3.5 py-3">
            <p className="label-micro">What they handed in</p>
            <p className="mt-1.5 whitespace-pre-line text-[0.84rem] leading-relaxed text-ink-soft">
              {row.content}
            </p>
            {row.linkUrl ? (
              <a
                href={row.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="link mt-2 inline-block text-[0.82rem]"
              >
                Open their link
              </a>
            ) : null}
          </div>
        ) : null}

        <TextField
          name="grade"
          label={'Grade out of ' + maxPoints}
          type="number"
          min={0}
          max={maxPoints}
          value={grade}
          error={error}
          onChange={(event) => setGrade(event.target.value)}
        />

        <TextAreaField
          name="feedback"
          label="Feedback (optional)"
          placeholder="What worked, what to fix next time."
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </div>
    </Modal>
  );
}
