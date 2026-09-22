import { query } from '../db/pool';
import { ApiError } from '../lib/errors';
import type { AuthUser } from '../lib/jwt';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CourseRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  accent: string;
  professorId: string;
  professorName: string;
}

export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: 'individual' | 'group';
  maxPoints: number;
  createdBy: string;
  courseCode: string;
  courseTitle: string;
  professorId: string;
}

/** Ids come from the URL, so a malformed one should read as "not found" rather than blow up.
 *  Postgres refuses to compare a non uuid against a uuid column. */
export function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw ApiError.notFound('We could not find that ' + label + '.');
  }
  return value;
}

export async function loadCourse(courseId: string): Promise<CourseRecord> {
  requireUuid(courseId, 'course');
  const { rows } = await query<{
    id: string;
    code: string;
    title: string;
    description: string;
    accent: string;
    professor_id: string;
    professor_name: string;
  }>(
    `SELECT c.id, c.code, c.title, c.description, c.accent, c.professor_id, p.name AS professor_name
       FROM courses c
       JOIN users p ON p.id = c.professor_id
      WHERE c.id = $1`,
    [courseId],
  );
  const row = rows[0];
  if (!row) throw ApiError.notFound('We could not find that course.');
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    accent: row.accent,
    professorId: row.professor_id,
    professorName: row.professor_name,
  };
}

export async function loadAssignment(assignmentId: string): Promise<AssignmentRecord> {
  requireUuid(assignmentId, 'assignment');
  const { rows } = await query<{
    id: string;
    course_id: string;
    title: string;
    description: string;
    due_at: Date;
    submission_type: 'individual' | 'group';
    max_points: number;
    created_by: string;
    course_code: string;
    course_title: string;
    professor_id: string;
  }>(
    `SELECT a.id, a.course_id, a.title, a.description, a.due_at, a.submission_type,
            a.max_points, a.created_by, c.code AS course_code, c.title AS course_title,
            c.professor_id
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
      WHERE a.id = $1`,
    [assignmentId],
  );
  const row = rows[0];
  if (!row) throw ApiError.notFound('We could not find that assignment.');
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    dueAt: new Date(row.due_at).toISOString(),
    submissionType: row.submission_type,
    maxPoints: row.max_points,
    createdBy: row.created_by,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    professorId: row.professor_id,
  };
}

export async function isEnrolled(studentId: string, courseId: string): Promise<boolean> {
  const { rowCount } = await query(
    'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId],
  );
  return Boolean(rowCount);
}

/** Students read a course they are enrolled in. Professors read a course they own. */
export async function assertCourseAccess(user: AuthUser, course: CourseRecord): Promise<void> {
  if (user.role === 'professor') {
    if (course.professorId !== user.id) {
      throw ApiError.forbidden('This course belongs to another professor.');
    }
    return;
  }
  if (!(await isEnrolled(user.id, course.id))) {
    throw ApiError.forbidden('You are not enrolled in this course.');
  }
}

export async function assertAssignmentAccess(
  user: AuthUser,
  assignment: AssignmentRecord,
): Promise<void> {
  if (user.role === 'professor') {
    if (assignment.professorId !== user.id) {
      throw ApiError.forbidden('This assignment belongs to another professor.');
    }
    return;
  }
  if (!(await isEnrolled(user.id, assignment.courseId))) {
    throw ApiError.forbidden('You are not enrolled in this course.');
  }
}

export async function loadStudentGroup(assignmentId: string, studentId: string) {
  const { rows } = await query<{
    id: string;
    name: string;
    leader_id: string;
  }>(
    `SELECT g.id, g.name, g.leader_id
       FROM groups g
       JOIN group_members m ON m.group_id = g.id
      WHERE g.assignment_id = $1 AND m.student_id = $2`,
    [assignmentId, studentId],
  );
  return rows[0] ?? null;
}

export async function logActivity(input: {
  actorId: string;
  assignmentId: string;
  submissionId?: string | null;
  action: string;
  summary: string;
}): Promise<void> {
  await query(
    `INSERT INTO activities (actor_id, assignment_id, submission_id, action, summary)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.actorId, input.assignmentId, input.submissionId ?? null, input.action, input.summary],
  );
}
