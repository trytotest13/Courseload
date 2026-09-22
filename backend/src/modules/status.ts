import { query } from '../db/pool';

export type EffectiveStatus = 'pending' | 'submitted' | 'acknowledged';
export type SubmissionType = 'individual' | 'group';

export interface StatusRow {
  studentId: string;
  studentName: string;
  courseId: string;
  assignmentId: string;
  assignmentTitle: string;
  submissionType: SubmissionType;
  dueAt: string;
  groupId: string | null;
  groupName: string | null;
  status: EffectiveStatus;
  isLate: boolean;
  submittedAt: string | null;
  acknowledgedAt: string | null;
}

interface Row {
  student_id: string;
  student_name: string;
  course_id: string;
  assignment_id: string;
  assignment_title: string;
  submission_type: SubmissionType;
  due_at: Date;
  group_id: string | null;
  group_name: string | null;
  status: string | null;
  is_late: boolean;
  submitted_at: Date | null;
  acknowledged_at: Date | null;
}

export interface StatusFilter {
  courseId?: string;
  studentId?: string;
  assignmentId?: string;
}

/**
 * One row per student and assignment pair, carrying the status that student should see.
 * Group work is attached to every member of the group, which is how the leader's
 * acknowledgement reaches the rest of the team.
 */
export async function loadStatusMatrix(filter: StatusFilter = {}): Promise<StatusRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.courseId) {
    params.push(filter.courseId);
    conditions.push('c.id = $' + params.length);
  }
  if (filter.studentId) {
    params.push(filter.studentId);
    conditions.push('e.student_id = $' + params.length);
  }
  if (filter.assignmentId) {
    params.push(filter.assignmentId);
    conditions.push('a.id = $' + params.length);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await query<Row>(
    `SELECT e.student_id,
            u.name AS student_name,
            c.id AS course_id,
            a.id AS assignment_id,
            a.title AS assignment_title,
            a.submission_type,
            a.due_at,
            g.id AS group_id,
            g.name AS group_name,
            COALESCE(s.status::text, gs.status::text) AS status,
            COALESCE(s.is_late, gs.is_late, false) AS is_late,
            COALESCE(s.submitted_at, gs.submitted_at) AS submitted_at,
            COALESCE(s.acknowledged_at, gs.acknowledged_at) AS acknowledged_at
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       JOIN assignments a ON a.course_id = c.id
       -- Exactly one group per student and assignment. Joining group_members
       -- directly would repeat the row for every group the student belongs to.
       LEFT JOIN LATERAL (
         SELECT g.id, g.name
           FROM groups g
           JOIN group_members m ON m.group_id = g.id
          WHERE g.assignment_id = a.id AND m.student_id = e.student_id
          LIMIT 1
       ) g ON true
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
       LEFT JOIN submissions gs ON gs.assignment_id = a.id AND gs.group_id = g.id
       ${where}
      ORDER BY a.due_at, u.name`,
    params,
  );

  return rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    courseId: row.course_id,
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    submissionType: row.submission_type,
    dueAt: new Date(row.due_at).toISOString(),
    groupId: row.group_id,
    groupName: row.group_name,
    status: (row.status ?? 'pending') as EffectiveStatus,
    isLate: row.is_late,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null,
  }));
}

export interface Tally {
  expected: number;
  submitted: number;
  acknowledged: number;
  pending: number;
  late: number;
}

/**
 * Counts for one assignment. An individual assignment counts students, a group
 * assignment counts groups, otherwise team work would be counted once per member.
 */
export function tallyAssignment(rows: StatusRow[], expected: number): Tally {
  if (rows.length === 0) {
    return { expected, submitted: 0, acknowledged: 0, pending: expected, late: 0 };
  }

  if (rows[0].submissionType === 'individual') {
    const submitted = rows.filter((row) => row.status !== 'pending').length;
    const acknowledged = rows.filter((row) => row.status === 'acknowledged').length;
    return {
      expected,
      submitted,
      acknowledged,
      pending: Math.max(expected - submitted, 0),
      late: rows.filter((row) => row.isLate).length,
    };
  }

  const byGroup = new Map<string, StatusRow[]>();
  for (const row of rows) {
    if (!row.groupId) continue;
    const bucket = byGroup.get(row.groupId) ?? [];
    bucket.push(row);
    byGroup.set(row.groupId, bucket);
  }

  let submitted = 0;
  let acknowledged = 0;
  let late = 0;
  for (const members of byGroup.values()) {
    const touched = members.some((row) => row.status !== 'pending');
    if (touched) submitted += 1;
    if (members.some((row) => row.status === 'acknowledged')) acknowledged += 1;
    if (members.some((row) => row.isLate)) late += 1;
  }

  return {
    expected: expected || byGroup.size,
    submitted,
    acknowledged,
    pending: Math.max((expected || byGroup.size) - submitted, 0),
    late,
  };
}
