import { useState } from 'react';
import { ApiError } from '../../api/client';
import { submissionsApi } from '../../api/endpoints';
import type { StudentAssignment } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../lib/format';
import { validateSubmission, hasErrors, type FieldErrors } from '../../lib/validation';
import { Button, Card, StatusPill, TextAreaField, TextField } from '../ui';

export function SubmissionPanel({
  assignment,
  leaderName,
  onUpdated,
}: {
  assignment: StudentAssignment;
  leaderName?: string | null;
  onUpdated: () => void;
}) {
  const { push } = useToast();
  const [content, setContent] = useState(assignment.content ?? '');
  const [linkUrl, setLinkUrl] = useState(assignment.linkUrl ?? '');
  const [errors, setErrors] = useState<FieldErrors<'content' | 'linkUrl'>>({});
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const hasSubmitted = assignment.status !== 'pending';
  const isAcknowledged = assignment.status === 'acknowledged';
  const isGroup = assignment.submissionType === 'group';
  // Whoever hands the work in, the acknowledgement belongs to the group leader.
  const canAcknowledge = !isGroup || assignment.isGroupLeader;
  const leaderLabel = leaderName ?? 'your group leader';

  const handleSubmit = async () => {
    const nextErrors = validateSubmission(content, linkUrl);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSaving(true);
    try {
      const result = await submissionsApi.submit(assignment.id, {
        content: content.trim(),
        linkUrl: linkUrl.trim() || undefined,
      });
      push({
        title: hasSubmitted ? 'Submission updated' : 'Work handed in',
        description: result.submission.isLate
          ? 'Saved after the deadline, so it is flagged as late.'
          : 'Your professor can see it now.',
        tone: 'success',
      });
      onUpdated();
    } catch (error) {
      push({
        title: 'That did not save',
        description: error instanceof ApiError ? error.message : 'Try again in a moment.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!assignment.submissionId) return;
    setAcknowledging(true);
    try {
      await submissionsApi.acknowledge(assignment.submissionId);
      push({
        title: isGroup ? 'Acknowledged for your group' : 'Submission acknowledged',
        description: isGroup
          ? 'Every member of your group now sees this as acknowledged.'
          : 'Your professor can see that you have confirmed it.',
        tone: 'success',
      });
      onUpdated();
    } catch (error) {
      push({
        title: 'Could not acknowledge',
        description: error instanceof ApiError ? error.message : 'Try again in a moment.',
        tone: 'error',
      });
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-micro">{isGroup ? 'Group submission' : 'Your submission'}</p>
          <p className="mt-1.5 text-[0.85rem] text-ink-soft">
            {hasSubmitted && assignment.submittedAt
              ? 'Handed in ' + formatDateTime(assignment.submittedAt)
              : 'Nothing handed in yet.'}
          </p>
        </div>
        <StatusPill status={assignment.status} isLate={assignment.isLate} />
      </div>

      {isAcknowledged ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-field border border-status-acknowledged/25 bg-status-acknowledged-tint px-3.5 py-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 animate-pop items-center justify-center rounded-full bg-status-acknowledged text-white">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" strokeWidth="2.4">
              <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-[0.82rem] leading-relaxed text-status-acknowledged">
            Acknowledged
            {assignment.acknowledgedAt ? ' on ' + formatDateTime(assignment.acknowledgedAt) : ''}
            {assignment.acknowledgedBy ? ' by ' + assignment.acknowledgedBy : ''}. Editing the work sends it
            back for review.
          </p>
        </div>
      ) : null}

      {assignment.grade !== null ? (
        <div className="mt-4 rounded-field border border-line bg-paper px-3.5 py-3">
          <p className="label-micro">Grade</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {assignment.grade}
            <span className="text-base font-normal text-ink-faint"> / {assignment.maxPoints}</span>
          </p>
          {assignment.feedback ? (
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">{assignment.feedback}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        <TextAreaField
          name="content"
          label={isGroup ? 'Note for your group submission' : 'Note for your professor'}
          placeholder={
            isGroup
              ? 'What did the team do? Mention who handled which part.'
              : 'What are you handing in, and anything the marker should know.'
          }
          value={content}
          error={errors.content}
          onChange={(event) => setContent(event.target.value)}
        />

        <TextField
          name="linkUrl"
          label="Link (optional)"
          placeholder="https://github.com/you/assignment"
          inputMode="url"
          value={linkUrl}
          error={errors.linkUrl}
          hint="A repository, document or deploy link works well."
          onChange={(event) => setLinkUrl(event.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSubmit} loading={saving}>
            {hasSubmitted ? 'Update submission' : 'Hand in work'}
          </Button>

          {hasSubmitted && !isAcknowledged && canAcknowledge ? (
            <Button variant="secondary" onClick={handleAcknowledge} loading={acknowledging}>
              Acknowledge submission
            </Button>
          ) : null}
        </div>

        {isGroup && !assignment.isGroupLeader ? (
          <p className="rounded-field bg-paper px-3 py-2.5 text-[0.78rem] leading-relaxed text-ink-soft">
            {isAcknowledged
              ? leaderLabel +
                ' confirmed this for the team. Any member can still hand in updated work, which sends it back for review.'
              : 'Any member can hand this in. Only ' +
                leaderLabel +
                ' can acknowledge it, so ' +
                leaderLabel +
                ' confirms it for everyone once the team is happy with the work.'}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
