import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, auth, closeDb, createCourse, enroll, registerUser, resetDb } from './helpers';

describe('courses', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('lets a professor create a course', async () => {
    const professor = await registerUser('professor');
    const course = await createCourse(professor, { code: 'CS999', title: 'Edge cases' });

    expect(course.code).toBe('CS999');
  });

  it('keeps students out of course creation', async () => {
    const student = await registerUser('student');

    const response = await request(app)
      .post('/api/courses')
      .set(auth(student.token))
      .send({ code: 'CS888', title: 'Not allowed', description: '' });

    expect(response.status).toBe(403);
  });

  it('shows a student only the courses they are enrolled in', async () => {
    const professor = await registerUser('professor');
    const student = await registerUser('student');
    const enrolled = await createCourse(professor, { code: 'CS111', title: 'Enrolled course' });
    await createCourse(professor, { code: 'CS222', title: 'Other course' });
    await enroll(enrolled.id, student.id);

    const response = await request(app).get('/api/courses').set(auth(student.token));

    expect(response.status).toBe(200);
    expect(response.body.courses).toHaveLength(1);
    expect(response.body.courses[0].code).toBe('CS111');
    expect(response.body.courses[0].professorName).toBeDefined();
  });

  it('refuses to open a course the student is not enrolled in', async () => {
    const professor = await registerUser('professor');
    const student = await registerUser('student');
    const course = await createCourse(professor);

    const response = await request(app)
      .get('/api/courses/' + course.id)
      .set(auth(student.token));

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/not enrolled/i);
  });

  it('refuses to open a course owned by another professor', async () => {
    const owner = await registerUser('professor');
    const intruder = await registerUser('professor');
    const course = await createCourse(owner);

    const response = await request(app)
      .get('/api/courses/' + course.id)
      .set(auth(intruder.token));

    expect(response.status).toBe(403);
  });

  it('gives the professor a roster with per student counts', async () => {
    const professor = await registerUser('professor');
    const first = await registerUser('student');
    const second = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, first.id);
    await enroll(course.id, second.id);

    await request(app)
      .post('/api/courses/' + course.id + '/assignments')
      .set(auth(professor.token))
      .send({
        title: 'Roster check',
        description: 'Counts should start at zero.',
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        submissionType: 'individual',
        maxPoints: 50,
      });

    const response = await request(app)
      .get('/api/courses/' + course.id)
      .set(auth(professor.token));

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('professor');
    expect(response.body.roster).toHaveLength(2);
    expect(response.body.roster[0].pending).toBe(1);
    expect(response.body.assignments[0].expected).toBe(2);
    expect(response.body.assignments[0].submitted).toBe(0);
  });

  it('answers 404 for a course id that is not a uuid', async () => {
    const professor = await registerUser('professor');

    const response = await request(app)
      .get('/api/courses/not-a-real-id')
      .set(auth(professor.token));

    expect(response.status).toBe(404);
  });
});
