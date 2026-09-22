import request from 'supertest';
import { createApp } from '../src/app';
import { migrate } from '../src/db/migrate';
import { pool, query } from '../src/db/pool';
import type { UserRole } from '../src/lib/jwt';

export const app = createApp();

const PASSWORD = 'test-password-123';

export function auth(token: string) {
  return { Authorization: 'Bearer ' + token };
}

let counter = 0;
function uniqueEmail(role: UserRole) {
  counter += 1;
  return role + '-' + counter + '-' + Math.random().toString(36).slice(2, 8) + '@test.dev';
}

export async function resetDb(): Promise<void> {
  await migrate();
  await query(
    'TRUNCATE activities, submissions, group_members, groups, assignments, enrollments, courses, users RESTART IDENTITY CASCADE',
  );
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export async function registerUser(role: UserRole, name?: string): Promise<TestUser> {
  const email = uniqueEmail(role);
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: name ?? role + ' tester', email, password: PASSWORD, role });

  if (response.status !== 201) {
    throw new Error('could not register ' + role + ': ' + JSON.stringify(response.body));
  }

  return { ...response.body.user, token: response.body.token };
}

export async function createCourse(
  professor: TestUser,
  overrides: Partial<{ code: string; title: string }> = {},
) {
  const response = await request(app)
    .post('/api/courses')
    .set(auth(professor.token))
    .send({
      code: overrides.code ?? 'CS' + Math.floor(Math.random() * 900 + 100),
      title: overrides.title ?? 'Testing course',
      description: 'Course created by the test suite.',
      accent: 'teal',
    });

  if (response.status !== 201) {
    throw new Error('could not create course: ' + JSON.stringify(response.body));
  }
  return response.body.course as { id: string; code: string };
}

export async function enroll(courseId: string, studentId: string): Promise<void> {
  await query(
    'INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [courseId, studentId],
  );
}

export async function createAssignment(
  professor: TestUser,
  courseId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults: Record<string, unknown> = {
    title: 'Test assignment',
    description: 'Created by the test suite.',
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    submissionType: 'individual',
    maxPoints: 100,
    groups: [],
  };
  const payload: Record<string, unknown> = { ...defaults, ...overrides };
  // An overridden undefined means "use the default", not "send null".
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) payload[key] = defaults[key];
  }

  const response = await request(app)
    .post('/api/courses/' + courseId + '/assignments')
    .set(auth(professor.token))
    .send(payload);

  if (response.status !== 201) {
    throw new Error('could not create assignment: ' + JSON.stringify(response.body));
  }
  return response.body.assignment as { id: string };
}

/** Sets up a course with one enrolled student and one assignment. */
export async function courseWithStudent(
  options: {
    submissionType?: 'individual' | 'group';
    dueAt?: string;
    groups?: Array<{ name: string; leaderId: string; memberIds: string[] }>;
  } = {},
) {
  const professor = await registerUser('professor');
  const student = await registerUser('student');
  const course = await createCourse(professor);
  await enroll(course.id, student.id);

  const assignment = await createAssignment(professor, course.id, {
    submissionType: options.submissionType ?? 'individual',
    dueAt: options.dueAt,
    groups: options.groups ?? [],
  });

  return { professor, student, course, assignment };
}
