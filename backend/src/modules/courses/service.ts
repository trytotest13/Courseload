import { pool, query } from '../../db/pool';
import type { AuthUser } from '../../lib/jwt';
import { assertCourseAccess, loadCourse, type CourseRecord } from '../access';
import { loadStatusMatrix, tallyAssignment } from '../status';
import { listAssignmentsForCourse, listStudentAssignments } from '../assignments/service';
import type { CreateCourseInput } from './schema';

interface ProfessorCourseRow {
  id: string;
  code: string;
  title: string;
  description: string;
  accent: string;
  student_count: number;
  assignment_count: number;
}

export interface ProfessorCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  accent: string;
  studentCount: number;
  assignmentCount: number;
  submitted: number;
  acknowledged: number;
  pending: number;
}

export interface StudentCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  accent: string;
  professorName: string;
  assignmentCount: number;
  done: number;
  acknowledged: number;
  pending: number;
}

export async function listCourses(user: AuthUser): Promise<ProfessorCourse[] | StudentCourse[]> {
  if (user.role === 'professor') return listProfessorCourses(user.id);

  const [assignments, { rows }] = await Promise.all([
    listStudentAssignments(user.id),
    query<{
      id: string;
      code: string;
      title: string;
      description: string;
      accent: string;
      professor_name: string;
    }>(
      `SELECT c.id, c.code, c.title, c.description, c.accent, p.name AS professor_name
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users p ON p.id = c.professor_id
        WHERE e.student_id = $1
        ORDER BY c.code`,
      [user.id],
    ),
  ]);

  return rows.map<StudentCourse>((row) => {
    const mine = assignments.filter((assignment) => assignment.courseId === row.id);
    const done = mine.filter((assignment) => assignment.status !== 'pending').length;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      accent: row.accent,
      professorName: row.professor_name,
      assignmentCount: mine.length,
      done,
      acknowledged: mine.filter((assignment) => assignment.status === 'acknowledged').length,
      pending: mine.filter((assignment) => assignment.status === 'pending').length,
    };
  });
}

async function listProfessorCourses(professorId: string): Promise<ProfessorCourse[]> {
  const [{ rows }, matrix] = await Promise.all([
    query<ProfessorCourseRow>(
      `SELECT c.id, c.code, c.title, c.description, c.accent,
              (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS student_count,
              (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) AS assignment_count
         FROM courses c
        WHERE c.professor_id = $1
        ORDER BY c.code`,
      [professorId],
    ),
    loadStatusMatrix(),
  ]);

  return rows.map((row) => {
    const mine = matrix.filter((entry) => entry.courseId === row.id);
    const assignmentIds = [...new Set(mine.map((entry) => entry.assignmentId))];

    let submitted = 0;
    let acknowledged = 0;
    let expected = 0;
    for (const assignmentId of assignmentIds) {
      const rowsForAssignment = mine.filter((entry) => entry.assignmentId === assignmentId);
      const isGroup = rowsForAssignment[0]?.submissionType === 'group';
      const unitCount = isGroup
        ? new Set(rowsForAssignment.map((entry) => entry.groupId).filter(Boolean)).size
        : row.student_count;
      const tally = tallyAssignment(rowsForAssignment, unitCount);
      submitted += tally.submitted;
      acknowledged += tally.acknowledged;
      expected += tally.expected;
    }

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      accent: row.accent,
      studentCount: row.student_count,
      assignmentCount: row.assignment_count,
      submitted,
      acknowledged,
      pending: Math.max(expected - submitted, 0),
    };
  });
}

export interface RosterEntry {
  id: string;
  name: string;
  email: string;
  submitted: number;
  acknowledged: number;
  pending: number;
}

export async function getCourseDetail(user: AuthUser, courseId: string) {
  const course: CourseRecord = await loadCourse(courseId);
  await assertCourseAccess(user, course);

  if (user.role === 'professor') {
    const [roster, assignments] = await Promise.all([
      loadRoster(courseId),
      listAssignmentsForCourse(courseId),
    ]);
    return { role: 'professor' as const, course, roster, assignments };
  }

  const assignments = await listStudentAssignments(user.id, { courseId });
  return { role: 'student' as const, course, assignments };
}

async function loadRoster(courseId: string): Promise<RosterEntry[]> {
  const [{ rows }, matrix] = await Promise.all([
    query<{ id: string; name: string; email: string }>(
      `SELECT u.id, u.name, u.email
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
        WHERE e.course_id = $1
        ORDER BY u.name`,
      [courseId],
    ),
    loadStatusMatrix({ courseId }),
  ]);

  return rows.map((row) => {
    const mine = matrix.filter((entry) => entry.studentId === row.id);
    return {
      ...row,
      submitted: mine.filter((entry) => entry.status !== 'pending').length,
      acknowledged: mine.filter((entry) => entry.status === 'acknowledged').length,
      pending: mine.filter((entry) => entry.status === 'pending').length,
    };
  });
}

export async function createCourse(user: AuthUser, input: CreateCourseInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO courses (code, title, description, accent, professor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, title, description, accent`,
      [input.code, input.title, input.description, input.accent, user.id],
    );
    const course = rows[0];

    if (input.studentIds.length > 0) {
      await client.query(
        `INSERT INTO enrollments (course_id, student_id)
         SELECT $1, unnest($2::uuid[])
         ON CONFLICT (course_id, student_id) DO NOTHING`,
        [course.id, input.studentIds],
      );
    }

    await client.query('COMMIT');
    return course;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
