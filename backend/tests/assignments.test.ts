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

describe('assignments', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('creates a group assignment with groups and a leader', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    const assignment = await createAssignment(professor, course.id, {
      title: 'Team project',
      submissionType: 'group',
      groups: [
        {
          name: 'Team Atlas',
          leaderId: leader.id,
          memberIds: [leader.id, member.id],
        },
      ],
    });

    const groups = await request(app)
      .get('/api/assignments/' + assignment.id + '/groups')
      .set(auth(professor.token));

    expect(groups.status).toBe(200);
    expect(groups.body.groups).toHaveLength(1);
    expect(groups.body.groups[0].leaderName).toBe(leader.name);
    expect(groups.body.groups[0].members).toHaveLength(2);
  });

  it('rejects a group whose leader is not a member', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    const response = await request(app)
      .post('/api/courses/' + course.id + '/assignments')
      .set(auth(professor.token))
      .send({
        title: 'Broken group',
        description: '',
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        submissionType: 'group',
        maxPoints: 40,
        groups: [{ name: 'Team Loose', leaderId: leader.id, memberIds: [member.id] }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/leader/i);
  });

  it('rejects a group member who is not enrolled in the course', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const outsider = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);

    const response = await request(app)
      .post('/api/courses/' + course.id + '/assignments')
      .set(auth(professor.token))
      .send({
        title: 'Outsider group',
        description: '',
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        submissionType: 'group',
        maxPoints: 40,
        groups: [{ name: 'Team Outside', leaderId: leader.id, memberIds: [leader.id, outsider.id] }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/enrolled/i);
  });

  it('validates the due date', async () => {
    const professor = await registerUser('professor');
    const course = await createCourse(professor);

    const response = await request(app)
      .post('/api/courses/' + course.id + '/assignments')
      .set(auth(professor.token))
      .send({
        title: 'No deadline',
        description: '',
        dueAt: 'sometime next week',
        submissionType: 'individual',
        maxPoints: 20,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.dueAt).toBeDefined();
  });

  it('lets the owner edit and keeps other professors out', async () => {
    const { professor, assignment } = await courseWithStudent();
    const intruder = await registerUser('professor');
    const newDue = new Date(Date.now() + 3 * 86_400_000).toISOString();

    const updated = await request(app)
      .patch('/api/assignments/' + assignment.id)
      .set(auth(professor.token))
      .send({ title: 'Renamed assignment', dueAt: newDue });

    expect(updated.status).toBe(200);
    expect(updated.body.assignment.title).toBe('Renamed assignment');

    const blocked = await request(app)
      .patch('/api/assignments/' + assignment.id)
      .set(auth(intruder.token))
      .send({ title: 'Not yours' });

    expect(blocked.status).toBe(403);
  });

  it('locks the groups once somebody has submitted', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);

    const assignment = await createAssignment(professor, course.id, {
      submissionType: 'group',
      groups: [{ name: 'Team First', leaderId: leader.id, memberIds: [leader.id] }],
    });

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(leader.token))
      .send({ content: 'Handing this in early.' });

    const response = await request(app)
      .patch('/api/assignments/' + assignment.id)
      .set(auth(professor.token))
      .send({
        groups: [{ name: 'Team Second', leaderId: leader.id, memberIds: [leader.id] }],
        submissionType: 'group',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/locked/i);
  });

  it('filters the submission table by status', async () => {
    const professor = await registerUser('professor');
    const first = await registerUser('student');
    const second = await registerUser('student');
    const third = await registerUser('student');
    const course = await createCourse(professor);
    for (const student of [first, second, third]) await enroll(course.id, student.id);

    const assignment = await createAssignment(professor, course.id);
    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(first.token))
      .send({ content: 'Done and dusted.' });

    const all = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(professor.token));
    const submitted = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions?status=submitted')
      .set(auth(professor.token));
    const pending = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions?status=pending')
      .set(auth(professor.token));

    expect(all.body.rows).toHaveLength(3);
    expect(submitted.body.rows).toHaveLength(1);
    expect(pending.body.rows).toHaveLength(2);
    expect(all.body.tally.pending).toBe(2);
  });

  it('searches the submission table by student name', async () => {
    const { professor, student, assignment } = await courseWithStudent();

    const response = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions?q=' + encodeURIComponent(student.name))
      .set(auth(professor.token));

    expect(response.body.rows).toHaveLength(1);
    expect(response.body.rows[0].studentId).toBe(student.id);
  });

  it('counts an assignment once for a student who is in two different groups', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    for (const title of ['First group task', 'Second group task']) {
      await createAssignment(professor, course.id, {
        title,
        submissionType: 'group',
        groups: [
          { name: title + ' team', leaderId: leader.id, memberIds: [leader.id, member.id] },
        ],
      });
    }

    const studentView = await request(app).get('/api/courses/' + course.id).set(auth(leader.token));
    expect(studentView.status).toBe(200);
    expect(studentView.body.assignments).toHaveLength(2);

    const dashboard = await request(app).get('/api/dashboard').set(auth(leader.token));
    expect(dashboard.body.stats.assignments).toBe(2);
    expect(dashboard.body.stats.waitingOnYou).toBe(2);

    const professorView = await request(app).get('/api/courses/' + course.id).set(auth(professor.token));
    expect(professorView.body.assignments).toHaveLength(2);
    expect(professorView.body.assignments[0].expected).toBe(1);
    expect(professorView.body.assignments[0].groupCount).toBe(1);
  });

  it('counts a group submission once when a team hands it in', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    const assignment = await createAssignment(professor, course.id, {
      submissionType: 'group',
      groups: [{ name: 'Team Counted', leaderId: leader.id, memberIds: [leader.id, member.id] }],
    });

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(leader.token))
      .send({ content: 'One shared submission.' });

    const course_view = await request(app)
      .get('/api/courses/' + course.id)
      .set(auth(professor.token));

    expect(course_view.body.assignments[0].submitted).toBe(1);
    expect(course_view.body.assignments[0].expected).toBe(1);

    for (const student of [leader, member]) {
      const view = await request(app).get('/api/courses/' + course.id).set(auth(student.token));
      expect(view.body.assignments).toHaveLength(1);
      expect(view.body.assignments[0].status).toBe('submitted');
    }
  });

  it('keeps students out of the submission table', async () => {
    const { student, assignment } = await courseWithStudent();

    const response = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token));

    expect(response.status).toBe(403);
  });
});
