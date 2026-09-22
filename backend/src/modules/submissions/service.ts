import { query } from '../../db/pool';
import { ApiError } from '../../lib/errors';
import type { AuthUser } from '../../lib/jwt';
import type { GradeInput, SubmissionInput } from '../assignments/schema';
import { assertAssignmentAccess, loadAssignment, loadStudentGroup, logActivity } from '../access';

interface SubmissionRecord {
  id: string;
  assignment_id: string;
  student_id: string | null;
  group_id: string | null;
  status: 'submitted' | 'acknowledged';
  group_name: string | null;
  leader_id: string | null;
}

async function loadSubmission(submissionId: string): Promise<SubmissionRecord> {
  const { rows } = await query<SubmissionRecord>(
    `SELECT s.id, s.assignment_id, s.student_id, s.group_id, s.status::text,
            g.name AS group_name, g.leader_id
       FROM submissions s
       LEFT JOIN groups g ON g.id = s.group_id
      WHERE s.id = $1`,
    [submissionId],
  );
  const row = rows[0];
  if (!row) throw ApiError.notFound('We could not find that submission.');
  return row;
}

function isPastDue(dueAt: string): boolean {
  return Date.now() > new Date(dueAt).getTime();
}

/** A student submits their own work, or their group's shared work. */
export async function submitAssignment(
  user: AuthUser,
  assignmentId: string,
  input: SubmissionInput,
) {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);

  const late = isPastDue(assignment.dueAt);

  if (assignment.submissionType === 'individual') {
    const { rows } = await query<{ id: string; status: string; is_late: boolean }>(
      `INSERT INTO submissions (assignment_id, student_id, content, link_url, status, is_late, submitted_at)
       VALUES ($1, $2, $3, $4, 'submitted', $5, now())
       ON CONFLICT (assignment_id, student_id) WHERE student_id IS NOT NULL
       DO UPDATE SET content = EXCLUDED.content,
                     link_url = EXCLUDED.link_url,
                     is_late = EXCLUDED.is_late,
                     submitted_at = now(),
                     status = 'submitted',
                     acknowledged_at = NULL,
                     acknowledged_by = NULL
       RETURNING id, status::text, is_late`,
      [assignment.id, user.id, input.content, input.linkUrl ?? null, late],
    );

    const submission = rows[0];
    if (!submission) throw new Error('submission upsert returned no row');

    await logActivity({
      actorId: user.id,
      assignmentId: assignment.id,
      submissionId: submission.id,
      action: 'submitted',
      summary: user.name + ' submitted their work',
    });

    return { id: submission.id, status: submission.status, isLate: submission.is_late };
  }

  const group = await loadStudentGroup(assignment.id, user.id);
  if (!group) {
    throw ApiError.forbidden(
      'You are not in a group for this assignment yet. Your professor sets those up.',
    );
  }

  const { rows } = await query<{ id: string; status: string; is_late: boolean }>(
    `INSERT INTO submissions (assignment_id, group_id, content, link_url, status, is_late, submitted_at)
     VALUES ($1, $2, $3, $4, 'submitted', $5, now())
     ON CONFLICT (assignment_id, group_id) WHERE group_id IS NOT NULL
     DO UPDATE SET content = EXCLUDED.content,
                   link_url = EXCLUDED.link_url,
                   is_late = EXCLUDED.is_late,
                   submitted_at = now(),
                   status = 'submitted',
                   acknowledged_at = NULL,
                   acknowledged_by = NULL
     RETURNING id, status::text, is_late`,
    [assignment.id, group.id, input.content, input.linkUrl ?? null, late],
  );

  const submission = rows[0];
  if (!submission) throw new Error('group submission upsert returned no row');

  await logActivity({
    actorId: user.id,
    assignmentId: assignment.id,
    submissionId: submission.id,
    action: 'submitted',
    summary: user.name + ' submitted for ' + group.name,
  });

  return { id: submission.id, status: submission.status, isLate: submission.is_late };
}

/**
 * The one rule the brief calls out: a group submission is acknowledged by the
 * group leader, and that single acknowledgement covers every member.
 */
export async function acknowledgeSubmission(user: AuthUser, submissionId: string) {
  const submission = await loadSubmission(submissionId);
  const assignment = await loadAssignment(submission.assignment_id);
  await assertAssignmentAccess(user, assignment);

  if (submission.group_id) {
    if (submission.leader_id !== user.id) {
      throw ApiError.forbidden('Only the group leader can acknowledge for the team.');
    }
  } else if (submission.student_id !== user.id) {
    throw ApiError.forbidden('That submission belongs to another student.');
  }

  if (submission.status === 'acknowledged') {
    return { id: submission.id, status: 'acknowledged' as const };
  }

  await query(
    `UPDATE submissions
        SET status = 'acknowledged', acknowledged_at = now(), acknowledged_by = $2
      WHERE id = $1`,
    [submission.id, user.id],
  );

  await logActivity({
    actorId: user.id,
    assignmentId: assignment.id,
    submissionId: submission.id,
    action: 'acknowledged',
    // The feed prints the actor name next to the summary, so keep it out of here.
    summary: submission.group_name
      ? 'acknowledged on behalf of ' + submission.group_name
      : 'acknowledged the submission',
  });

  return { id: submission.id, status: 'acknowledged' as const };
}

export async function gradeSubmission(user: AuthUser, submissionId: string, input: GradeInput) {
  const submission = await loadSubmission(submissionId);
  const assignment = await loadAssignment(submission.assignment_id);
  await assertAssignmentAccess(user, assignment);

  if (input.grade > assignment.maxPoints) {
    throw ApiError.badRequest('That is more than the ' + assignment.maxPoints + ' points available.');
  }

  await query('UPDATE submissions SET grade = $2, feedback = $3 WHERE id = $1', [
    submission.id,
    input.grade,
    input.feedback,
  ]);

  await logActivity({
    actorId: user.id,
    assignmentId: assignment.id,
    submissionId: submission.id,
    action: 'graded',
    summary: 'graded this submission ' + input.grade + '/' + assignment.maxPoints,
  });

  return { id: submission.id, grade: input.grade, feedback: input.feedback };
}
