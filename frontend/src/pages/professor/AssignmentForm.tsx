import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { assignmentsApi, coursesApi, type AssignmentPayload } from '../../api/endpoints';
import type { RosterEntry, SubmissionType } from '../../api/types';
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { cx } from '../../lib/cx';

interface GroupDraft {
  name: string;
  leaderId: string;
  memberIds: string[];
}

/** datetime-local wants local time in the input, not a UTC string. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

function defaultDue(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date.toISOString());
}

export function AssignmentForm({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const assignmentId = params.assignmentId ?? '';
  const courseIdFromPath = params.courseId ?? '';

  const source = useAsync(
    async () => {
      if (mode === 'edit') {
        const detail = await assignmentsApi.detail(assignmentId);
        if (detail.role !== 'professor') throw new Error('not allowed');
        const course = await coursesApi.detail(detail.assignment.courseId);
        return { assignment: detail.assignment, groups: detail.groups, roster: course.role === 'professor' ? course.roster : [] };
      }
      const course = await coursesApi.detail(courseIdFromPath);
      return { assignment: null, groups: [], roster: course.role === 'professor' ? course.roster : [] };
    },
    [mode, assignmentId, courseIdFromPath],
  );

  const courseId = mode === 'edit' ? source.data?.assignment?.courseId ?? '' : courseIdFromPath;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState(defaultDue());
  const [submissionType, setSubmissionType] = useState<SubmissionType>('individual');
  const [maxPoints, setMaxPoints] = useState('100');
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [groupsDirty, setGroupsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Once the source data lands, seed the form from it.
  useEffect(() => {
    const data = source.data;
    if (!data) return;
    if (data.assignment) {
      setTitle(data.assignment.title);
      setDescription(data.assignment.description);
      setDueAt(toLocalInput(data.assignment.dueAt));
      setSubmissionType(data.assignment.submissionType);
      setMaxPoints(String(data.assignment.maxPoints));
    }
    setGroups(
      data.groups.map((group) => ({
        name: group.name,
        leaderId: group.leaderId,
        memberIds: group.members.map((member) => member.id),
      })),
    );
  }, [source.data]);

  const roster: RosterEntry[] = source.data?.roster ?? [];

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (title.trim().length < 3) next.title = 'Give the assignment a title.';
    if (!dueAt) next.dueAt = 'Pick a due date and time.';
    const points = Number(maxPoints);
    if (!Number.isInteger(points) || points < 1 || points > 1000) {
      next.maxPoints = 'Points have to be between 1 and 1000.';
    }
    if (submissionType === 'group' && groups.length > 0) {
      groups.forEach((group, index) => {
        if (!group.name.trim()) next['group-' + index] = 'Name this group.';
        if (!group.leaderId) next['group-' + index] = 'Pick a leader.';
        if (group.memberIds.length === 0) next['group-' + index] = 'Add at least one member.';
        if (group.leaderId && !group.memberIds.includes(group.leaderId)) {
          next['group-' + index] = 'The leader has to be a member of the group.';
        }
      });
    }
    setErrors(next);
    return Object.values(next).every((value) => !value);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload: AssignmentPayload = {
      title: title.trim(),
      description: description.trim(),
      dueAt: new Date(dueAt).toISOString(),
      submissionType,
      maxPoints: Number(maxPoints),
    };

    // Only send groups when they exist or actually changed, so editing the title
    // of a group assignment does not trip the group lock on the server.
    if (submissionType === 'group' && (mode === 'create' ? groups.length > 0 : groupsDirty)) {
      payload.groups = groups.map((group) => ({
        name: group.name.trim(),
        leaderId: group.leaderId,
        memberIds: group.memberIds,
      }));
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await assignmentsApi.create(courseId, payload);
        push({ title: 'Assignment created', description: 'Students can see it now.', tone: 'success' });
        navigate('/professor/assignments/' + created.assignment.id);
      } else {
        await assignmentsApi.update(assignmentId, payload);
        push({ title: 'Assignment updated', tone: 'success' });
        navigate('/professor/assignments/' + assignmentId);
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'That did not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (source.loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  if (source.error) {
    return <ErrorState message={source.error} onRetry={source.reload} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/professor' },
          ...(courseId
            ? [{ label: 'Course', to: '/professor/courses/' + courseId }]
            : []),
          { label: mode === 'create' ? 'New assignment' : 'Edit assignment' },
        ]}
        title={mode === 'create' ? 'Set an assignment' : 'Edit assignment'}
        description="Students see the title, brief, deadline and whether it is individual or group work."
      />

      {formError ? (
        <p role="alert" className="rounded-card border border-status-overdue/30 bg-status-overdue-tint px-4 py-3 text-[0.84rem] font-semibold text-status-overdue">
          {formError}
        </p>
      ) : null}

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <TextField
          name="title"
          label="Title"
          placeholder="Binary search tree report"
          value={title}
          error={errors.title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <TextAreaField
          name="description"
          label="Brief"
          placeholder="What should students do, and what will you be looking for?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="dueAt"
            label="Due date and time"
            type="datetime-local"
            value={dueAt}
            error={errors.dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          <TextField
            name="maxPoints"
            label="Points available"
            type="number"
            min={1}
            max={1000}
            value={maxPoints}
            error={errors.maxPoints}
            onChange={(event) => setMaxPoints(event.target.value)}
          />
        </div>

        <div>
          <p className="field-label">Submission type</p>
          <SegmentedControl
            name="Submission type"
            value={submissionType}
            onChange={(value) => {
              setSubmissionType(value);
              setGroupsDirty(true);
            }}
            options={[
              {
                value: 'individual',
                label: 'Individual',
                description: 'Every student hands in their own work and confirms it themselves.',
              },
              {
                value: 'group',
                label: 'Group',
                description: 'One shared submission per team. Only the leader confirms it.',
              },
            ]}
          />
        </div>
      </Card>

      {submissionType === 'group' ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Groups</h2>
              <p className="mt-1 text-[0.82rem] text-ink-soft">
                Each group hands in one piece of work. The leader is the one who can acknowledge it.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setGroups((current) => [
                  ...current,
                  { name: 'Team ' + (current.length + 1), leaderId: '', memberIds: [] },
                ]);
                setGroupsDirty(true);
              }}
              disabled={roster.length === 0}
            >
              Add group
            </Button>
          </div>

          {roster.length === 0 ? (
            <p className="mt-4 rounded-field bg-paper px-3.5 py-3 text-[0.82rem] text-ink-soft">
              Enrol students on the course first, then come back to build groups.
            </p>
          ) : null}

          {mode === 'edit' && groups.length > 0 ? (
            <p className="mt-4 rounded-field border border-status-pending/25 bg-status-pending-tint px-3.5 py-3 text-[0.78rem] leading-relaxed text-status-pending">
              Changing groups is only possible while nobody has handed work in. Once a team submits, the
              groups lock.
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-4">
            {groups.map((group, index) => (
              <GroupRow
                key={index}
                group={group}
                roster={roster}
                error={errors['group-' + index]}
                onChange={(next) => {
                  setGroups((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)));
                  setGroupsDirty(true);
                }}
                onRemove={() => {
                  setGroups((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  setGroupsDirty(true);
                }}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={saving}>
          {mode === 'create' ? 'Create assignment' : 'Save changes'}
        </Button>
        <Link
          to={courseId ? '/professor/courses/' + courseId : '/professor'}
          className="text-[0.85rem] font-semibold text-ink-soft transition hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function GroupRow({
  group,
  roster,
  error,
  onChange,
  onRemove,
}: {
  group: GroupDraft;
  roster: RosterEntry[];
  error?: string;
  onChange: (next: GroupDraft) => void;
  onRemove: () => void;
}) {
  const toggleMember = (studentId: string) => {
    const memberIds = group.memberIds.includes(studentId)
      ? group.memberIds.filter((id) => id !== studentId)
      : [...group.memberIds, studentId];
    const leaderId = memberIds.includes(group.leaderId) ? group.leaderId : '';
    onChange({ ...group, memberIds, leaderId });
  };

  return (
    <div className={cx('rounded-card border p-4', error ? 'border-status-overdue/40' : 'border-line')}>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          className="flex-1"
          label="Group name"
          value={group.name}
          onChange={(event) => onChange({ ...group, name: event.target.value })}
        />
        <label className="flex-1">
          <span className="field-label">Leader</span>
          <select
            className="field-input"
            value={group.leaderId}
            onChange={(event) => onChange({ ...group, leaderId: event.target.value })}
          >
            <option value="">Pick a member</option>
            {roster
              .filter((student) => group.memberIds.includes(student.id))
              .map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
          </select>
        </label>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <fieldset className="mt-3">
        <legend className="field-label">Members</legend>
        <div className="flex flex-wrap gap-2">
          {roster.map((student) => {
            const checked = group.memberIds.includes(student.id);
            return (
              <label
                key={student.id}
                className={cx(
                  'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition',
                  checked ? 'border-primary bg-primary-tint text-primary' : 'border-line bg-surface text-ink-soft',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMember(student.id)}
                  className="sr-only"
                />
                {student.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
