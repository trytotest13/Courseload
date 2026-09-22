import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  app,
  auth,
  closeDb,
  courseWithStudent,
  createAssignment,
  createCourse,
  enroll,
  registerUser,
  resetDb,
} from './helpers';

describe('dashboards', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('summarises the student workload', async () => {
    const { student, professor, course, assignment } = await courseWithStudent();
    await createAssignment(professor, course.id, {
      dueAt: new Date(Date.now() - 86_400_000).toISOString(),
      title: 'Already overdue',
    });

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'One down.' });

    const response = await request(app).get('/api/dashboard').set(auth(student.token));

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('student');
    expect(response.body.stats.courses).toBe(1);
    expect(response.body.stats.assignments).toBe(2);
    expect(response.body.stats.waitingOnYou).toBe(1);
    expect(response.body.stats.overdue).toBe(1);
    expect(response.body.stats.dueThisWeek).toBe(1);
    expect(response.body.courses[0].done).toBe(1);
  });

  it('surfaces the next few deadlines in order', async () => {
    const { student, professor, course } = await courseWithStudent();
    await createAssignment(professor, course.id, { title: 'Later', dueAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });
    await createAssignment(professor, course.id, { title: 'Sooner', dueAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });

    const response = await request(app).get('/api/dashboard').set(auth(student.token));

    const titles: string[] = response.body.upcoming.map((entry: { title: string }) => entry.title);
    expect(titles.indexOf('Sooner')).toBeLessThan(titles.indexOf('Later'));

    const sooner = response.body.upcoming.find((entry: { title: string }) => entry.title === 'Sooner');
    expect(sooner.daysLeft).toBeLessThanOrEqual(2);

    const days: number[] = response.body.upcoming.map((entry: { daysLeft: number }) => entry.daysLeft);
    expect(days).toStrictEqual([...days].sort((a, b) => a - b));
  });

  it('gives the professor students, review counts and assignments closing soon', async () => {
    const professor = await registerUser('professor');
    const first = await registerUser('student');
    const second = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, first.id);
    await enroll(course.id, second.id);

    const dueSoon = await createAssignment(professor, course.id, {
      dueAt: new Date(Date.now() + 20 * 3_600_000).toISOString(),
      title: 'Closing soon',
    });
    await createAssignment(professor, course.id, {
      dueAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      title: 'Plenty of time',
    });

    await request(app)
      .post('/api/assignments/' + dueSoon.id + '/submissions')
      .set(auth(first.token))
      .send({ content: 'Handing this one in.' });

    const response = await request(app).get('/api/dashboard').set(auth(professor.token));

    expect(response.body.role).toBe('professor');
    expect(response.body.stats.students).toBe(2);
    expect(response.body.stats.assignments).toBe(2);
    expect(response.body.stats.toReview).toBe(1);
    expect(response.body.stats.expected).toBe(4);
    expect(response.body.needsAttention).toHaveLength(1);
    expect(response.body.needsAttention[0].pending).toBe(1);
  });
});
