import { pool, query } from '../../db/pool';
import { ApiError } from '../../lib/errors';
import type { AuthUser } from '../../lib/jwt';
import {
  assertAssignmentAccess,
  assertCourseAccess,
  isEnrolled,
  loadAssignment,
  loadCourse,
  logActivity,
} from '../access';
import { loadStatusMatrix, tallyAssignment, type EffectiveStatus } from '../status';
import type { AssignmentInput, SubmissionFilter, UpdateAssignmentInput } from './schema';

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: 'individual' | 'group';
  maxPoints: number;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseAccent: string;
  status: EffectiveStatus;
  isLate: boolean;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  submissionId: string | null;
  content: string | null;
  linkUrl: string | null;
  grade: number | null;
  feedback: string | null;
  groupId: string | null;
  groupName: string | null;
  isGroupLeader: boolean;
}

interface StudentAssignmentRow {
  id: string;
  title: string;
  description: string;
  due_at: Date;
  submission_type: 'individual' | 'group';
  max_points: number;
  course_id: string;
  course_code: string;
  course_title: string;
  course_accent: string;
  group_id: string | null;
  group_name: string | null;
  is_group_leader: boolean | null;
  status: string | null;
  is_late: boolean | null;
  submitted_at: Date | null;
  acknowledged_at: Date | null;
  acknowledged_by_name: string | null;
  submission_id: string | null;
  content: string | null;
  link_url: string | null;
  grade: number | null;
  feedback: string | null;
}

/**
 * Every assignment a student can see, with the status that student should see:
 * their own submission for individual work, their group's shared submission otherwise.
 */
export async function listStudentAssignments(
  studentId: string,
  filter: { courseId?: string; assignmentId?: string } = {},
): Promise<StudentAssignment[]> {
  const params: unknown[] = [studentId];
  const conditions: string[] = [];

  if (filter.courseId) {
    params.push(filter.courseId);
    conditions.push('c.id = $' + params.length);
  }
  if (filter.assignmentId) {
    params.push(filter.assignmentId);
    conditions.push('a.id = $' + params.length);
  }
  const where = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  const { rows } = await query<StudentAssignmentRow>(
    `SELECT a.id, a.title, a.description, a.due_at, a.submission_type, a.max_points,
            c.id AS course_id, c.code AS course_code, c.title AS course_title,
            c.accent AS course_accent,
            g.id AS group_id, g.name AS group_name, (g.leader_id = $1) AS is_group_leader,
            COALESCE(s.status::text, gs.status::text) AS status,
            COALESCE(s.is_late, gs.is_late, false) AS is_late,
            COALESCE(s.submitted_at, gs.submitted_at) AS submitted_at,
            COALESCE(s.acknowledged_at, gs.acknowledged_at) AS acknowledged_at,
            ab.name AS acknowledged_by_name,
            COALESCE(s.id, gs.id) AS submission_id,
            COALESCE(s.content, gs.content) AS content,
            COALESCE(s.link_url, gs.link_url) AS link_url,
            COALESCE(s.grade, gs.grade) AS grade,
            COALESCE(s.feedback, gs.feedback) AS feedback
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN assignments a ON a.course_id = c.id
       -- A student can be in one group per assignment, but several across the term.
       -- The lateral join keeps exactly the team that belongs to this assignment,
       -- otherwise the row count multiplies once per membership.
       LEFT JOIN LATERAL (
         SELECT g.id, g.name, g.leader_id
           FROM groups g
           JOIN group_members m ON m.group_id = g.id
          WHERE g.assignment_id = a.id AND m.student_id = e.student_id
          LIMIT 1
       ) g ON true
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
       LEFT JOIN submissions gs ON gs.assignment_id = a.id AND gs.group_id = g.id
       LEFT JOIN users ab ON ab.id = COALESCE(s.acknowledged_by, gs.acknowledged_by)
      WHERE e.student_id = $1 ${where}
      ORDER BY a.due_at`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: new Date(row.due_at).toISOString(),
    submissionType: row.submission_type,
    maxPoints: row.max_points,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    courseAccent: row.course_accent,
    status: (row.status ?? 'pending') as EffectiveStatus,
    isLate: Boolean(row.is_late),
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null,
    acknowledgedBy: row.acknowledged_by_name,
    submissionId: row.submission_id,
    content: row.content,
    linkUrl: row.link_url,
    grade: row.grade,
    feedback: row.feedback,
    groupId: row.group_id,
    groupName: row.group_name,
    isGroupLeader: Boolean(row.is_group_leader),
  }));
}

export interface ProfessorAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: 'individual' | 'group';
  maxPoints: number;
  expected: number;
  submitted: number;
  acknowledged: number;
  pending: number;
  late: number;
  groupCount: number;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  title: string;
  description: string;
  due_at: Date;
  submission_type: 'individual' | 'group';
  max_points: number;
}

async function loadAssignmentRows(courseId: string): Promise<AssignmentRow[]> {
  const { rows } = await query<AssignmentRow>(
    `SELECT a.id, a.course_id, c.code AS course_code, c.title AS course_title, a.title,
            a.description, a.due_at, a.submission_type, a.max_points
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
      WHERE a.course_id = $1
      ORDER BY a.due_at`,
    [courseId],
  );
  return rows;
}

export async function listAssignmentsForCourse(courseId: string): Promise<ProfessorAssignment[]> {
  const [assignments, matrix, enrolled, groups] = await Promise.all([
    loadAssignmentRows(courseId),
    loadStatusMatrix({ courseId }),
    query<{ course_id: string; student_count: number }>(
      'SELECT course_id, COUNT(*)::int AS student_count FROM enrollments WHERE course_id = $1 GROUP BY course_id',
      [courseId],
    ),
    query<{ assignment_id: string; group_count: number }>(
      `SELECT g.assignment_id, COUNT(*)::int AS group_count
         FROM groups g
         JOIN assignments a ON a.id = g.assignment_id
        WHERE a.course_id = $1
        GROUP BY g.assignment_id`,
      [courseId],
    ),
  ]);

  const studentCount = enrolled.rows[0]?.student_count ?? 0;
  const groupCounts = groups.rows;

  return assignments.map((assignment) => {
    const rows = matrix.filter((entry) => entry.assignmentId === assignment.id);
    const groupCount = groupCounts.find((entry) => entry.assignment_id === assignment.id)?.group_count ?? 0;
    const expected = assignment.submission_type === 'group' ? groupCount : studentCount;
    const tally = tallyAssignment(rows, expected);
    return {
      id: assignment.id,
      courseId: assignment.course_id,
      courseCode: assignment.course_code,
      courseTitle: assignment.course_title,
      title: assignment.title,
      description: assignment.description,
      dueAt: new Date(assignment.due_at).toISOString(),
      submissionType: assignment.submission_type,
      maxPoints: assignment.max_points,
      ...tally,
      groupCount,
    };
  });
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  isLeader: boolean;
}

export interface GroupView {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  members: GroupMember[];
}

export async function loadGroups(assignmentId: string): Promise<GroupView[]> {
  const { rows } = await query<{
    group_id: string;
    group_name: string;
    leader_id: string;
    leader_name: string;
    member_id: string;
    member_name: string;
    member_email: string;
  }>(
    `SELECT g.id AS group_id, g.name AS group_name, g.leader_id, l.name AS leader_name,
            m.student_id AS member_id, u.name AS member_name, u.email AS member_email
       FROM groups g
       JOIN users l ON l.id = g.leader_id
       JOIN group_members m ON m.group_id = g.id
       JOIN users u ON u.id = m.student_id
      WHERE g.assignment_id = $1
      ORDER BY g.name, u.name`,
    [assignmentId],
  );

  const groups = new Map<string, GroupView>();
  for (const row of rows) {
    const group = groups.get(row.group_id) ?? {
      id: row.group_id,
      name: row.group_name,
      leaderId: row.leader_id,
      leaderName: row.leader_name,
      members: [],
    };
    group.members.push({
      id: row.member_id,
      name: row.member_name,
      email: row.member_email,
      isLeader: row.member_id === row.leader_id,
    });
    groups.set(row.group_id, group);
  }

  return [...groups.values()];
}

export interface SubmissionView {
  id: string | null;
  kind: 'individual' | 'group';
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  groupId: string | null;
  groupName: string | null;
  leaderName: string | null;
  members: GroupMember[];
  status: EffectiveStatus;
  isLate: boolean;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  content: string | null;
  linkUrl: string | null;
  grade: number | null;
  feedback: string | null;
}

interface SubmissionRecord {
  id: string;
  student_id: string | null;
  group_id: string | null;
  content: string;
  link_url: string | null;
  status: EffectiveStatus;
  is_late: boolean;
  submitted_at: Date | null;
  acknowledged_at: Date | null;
  acknowledged_by_name: string | null;
  grade: number | null;
  feedback: string | null;
}

async function loadSubmissionRecords(assignmentId: string): Promise<SubmissionRecord[]> {
  const { rows } = await query<SubmissionRecord>(
    `SELECT s.id, s.student_id, s.group_id, s.content, s.link_url, s.status::text, s.is_late,
            s.submitted_at, s.acknowledged_at, ab.name AS acknowledged_by_name,
            s.grade, s.feedback
       FROM submissions s
       LEFT JOIN users ab ON ab.id = s.acknowledged_by
      WHERE s.assignment_id = $1`,
    [assignmentId],
  );
  return rows;
}

function matchesFilter(row: SubmissionView, filter: SubmissionFilter): boolean {
  if (filter.status === 'late' && !row.isLate) return false;
  if (filter.status !== 'all' && filter.status !== 'late' && row.status !== filter.status) return false;
  if (filter.q) {
    const needle = filter.q.toLowerCase();
    const haystack = [row.studentName, row.groupName, ...row.members.map((m) => m.name)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

/** Rows for the professor submission table: one per student, or one per group. */
export async function listSubmissions(assignmentId: string, filter: SubmissionFilter) {
  const assignment = await loadAssignment(assignmentId);
  const [submissions, matrix] = await Promise.all([
    loadSubmissionRecords(assignmentId),
    loadStatusMatrix({ assignmentId }),
  ]);

  const rows: SubmissionView[] = [];

  if (assignment.submissionType === 'individual') {
    for (const entry of matrix) {
      const submission = submissions.find((item) => item.student_id === entry.studentId);
      rows.push({
        id: submission?.id ?? null,
        kind: 'individual',
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentEmail: null,
        groupId: null,
        groupName: null,
        leaderName: null,
        members: [],
        status: entry.status,
        isLate: entry.isLate,
        submittedAt: entry.submittedAt,
        acknowledgedAt: entry.acknowledgedAt,
        acknowledgedBy: submission?.acknowledged_by_name ?? null,
        content: submission?.content ?? null,
        linkUrl: submission?.link_url ?? null,
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
      });
    }
  } else {
    const groups = await loadGroups(assignmentId);
    for (const group of groups) {
      const submission = submissions.find((item) => item.group_id === group.id);
      const members = group.members.map((member) => ({ ...member, id: member.id }));
      const status: EffectiveStatus = submission?.status ?? 'pending';
      rows.push({
        id: submission?.id ?? null,
        kind: 'group',
        studentId: null,
        studentName: group.leaderName,
        studentEmail: null,
        groupId: group.id,
        groupName: group.name,
        leaderName: group.leaderName,
        members,
        status,
        isLate: submission?.is_late ?? false,
        submittedAt: submission?.submitted_at ? new Date(submission.submitted_at).toISOString() : null,
        acknowledgedAt: submission?.acknowledged_at
          ? new Date(submission.acknowledged_at).toISOString()
          : null,
        acknowledgedBy: submission?.acknowledged_by_name ?? null,
        content: submission?.content ?? null,
        linkUrl: submission?.link_url ?? null,
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
      });
    }
  }

  return {
    assignment,
    rows: rows.filter((row) => matchesFilter(row, filter)),
    tally: {
      expected: rows.length,
      submitted: rows.filter((row) => row.status !== 'pending').length,
      acknowledged: rows.filter((row) => row.status === 'acknowledged').length,
      pending: rows.filter((row) => row.status === 'pending').length,
      late: rows.filter((row) => row.isLate).length,
    },
  };
}

export async function getAssignmentDetail(user: AuthUser, assignmentId: string) {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);

  const activity = await loadActivity(assignmentId);

  if (user.role === 'student') {
    const [view] = await listStudentAssignments(user.id, { assignmentId });
    if (!view) throw ApiError.notFound('We could not find that assignment.');

    const groups = view.groupId ? await loadGroups(assignmentId) : [];
    const group = groups.find((item) => item.id === view.groupId) ?? null;
    return { role: 'student' as const, assignment: view, group, activity };
  }

  const [submissions, groups] = await Promise.all([
    listSubmissions(assignmentId, { status: 'all', q: '' }),
    loadGroups(assignmentId),
  ]);

  return {
    role: 'professor' as const,
    assignment,
    submissions: submissions.rows,
    tally: submissions.tally,
    groups,
    activity,
  };
}

export async function loadActivity(assignmentId: string, limit = 20) {
  const { rows } = await query<{
    id: string;
    action: string;
    summary: string;
    created_at: Date;
    actor_name: string | null;
  }>(
    `SELECT a.id, a.action, a.summary, a.created_at, u.name AS actor_name
       FROM activities a
       LEFT JOIN users u ON u.id = a.actor_id
      WHERE a.assignment_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2`,
    [assignmentId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    actorName: row.actor_name,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

async function assertGroupsAreValid(
  courseId: string,
  groups: AssignmentInput['groups'],
): Promise<void> {
  for (const group of groups) {
    if (!group.memberIds.includes(group.leaderId)) {
      throw ApiError.badRequest('The leader of ' + group.name + ' has to be a member of that group.');
    }
    for (const studentId of group.memberIds) {
      if (!(await isEnrolled(studentId, courseId))) {
        throw ApiError.badRequest('Everyone in a group has to be enrolled in the course.');
      }
    }
  }

  const seen = new Set<string>();
  for (const group of groups) {
    for (const studentId of group.memberIds) {
      if (seen.has(studentId)) {
        throw ApiError.badRequest('A student can only be in one group for this assignment.');
      }
      seen.add(studentId);
    }
  }
}

export async function createAssignment(user: AuthUser, courseId: string, input: AssignmentInput) {
  const course = await loadCourse(courseId);
  await assertCourseAccess(user, course);

  if (input.submissionType === 'group') {
    await assertGroupsAreValid(course.id, input.groups);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO assignments (course_id, title, description, due_at, submission_type, max_points, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        course.id,
        input.title,
        input.description,
        new Date(input.dueAt).toISOString(),
        input.submissionType,
        input.maxPoints,
        user.id,
      ],
    );
    const assignmentId = rows[0].id;

    if (input.submissionType === 'group') {
      for (const group of input.groups) {
        const groupResult = await client.query(
          'INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id',
          [assignmentId, group.name, group.leaderId],
        );
        const groupId = groupResult.rows[0].id;
        await client.query(
          `INSERT INTO group_members (group_id, student_id)
           SELECT $1, unnest($2::uuid[])`,
          [groupId, group.memberIds],
        );
      }
    }

    await client.query('COMMIT');

    await logActivity({
      actorId: user.id,
      assignmentId,
      action: 'created',
      summary: user.name + ' created this assignment',
    });

    return loadAssignment(assignmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAssignment(
  user: AuthUser,
  assignmentId: string,
  input: UpdateAssignmentInput,
) {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);

  const fields: string[] = [];
  const params: unknown[] = [];
  const push = (column: string, value: unknown) => {
    params.push(value);
    fields.push(column + ' = $' + params.length);
  };

  if (input.title !== undefined) push('title', input.title);
  if (input.description !== undefined) push('description', input.description);
  if (input.dueAt !== undefined) push('due_at', new Date(input.dueAt).toISOString());
  if (input.submissionType !== undefined) push('submission_type', input.submissionType);
  if (input.maxPoints !== undefined) push('max_points', input.maxPoints);

  if (fields.length > 0) {
    params.push(assignmentId);
    await query('UPDATE assignments SET ' + fields.join(', ') + ' WHERE id = $' + params.length, params);
  }

  if (input.groups && input.submissionType !== 'individual') {
    const { rowCount } = await query('SELECT 1 FROM submissions WHERE assignment_id = $1 LIMIT 1', [
      assignmentId,
    ]);
    if (rowCount) {
      throw ApiError.conflict(
        'Students have already submitted, so the groups are locked for this assignment.',
      );
    }
    await assertGroupsAreValid(assignment.courseId, input.groups);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM groups WHERE assignment_id = $1', [assignmentId]);
      for (const group of input.groups) {
        const created = await client.query(
          'INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id',
          [assignmentId, group.name, group.leaderId],
        );
        await client.query('INSERT INTO group_members (group_id, student_id) SELECT $1, unnest($2::uuid[])', [
          created.rows[0].id,
          group.memberIds,
        ]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  await logActivity({
    actorId: user.id,
    assignmentId,
    action: 'updated',
    summary: user.name + ' updated the assignment',
  });

  return loadAssignment(assignmentId);
}

export async function deleteAssignment(user: AuthUser, assignmentId: string): Promise<void> {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);
  await query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
}
