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

describe('submissions', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('stores a submission and reports it back with the status submitted', async () => {
    const { student, assignment } = await courseWithStudent();

    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'My writeup is attached.', linkUrl: 'https://example.com/work' });

    expect(created.status).toBe(201);
    expect(created.body.submission.status).toBe('submitted');

    const detail = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(student.token));

    expect(detail.body.assignment.status).toBe('submitted');
    expect(detail.body.assignment.content).toBe('My writeup is attached.');
    expect(detail.body.activity[0].action).toBe('submitted');
  });

  it('wants a note or a link before accepting the work', async () => {
    const { student, assignment } = await courseWithStudent();

    const response = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/note or a link/i);
  });

  it('marks work handed in after the deadline as late', async () => {
    const { student, assignment } = await courseWithStudent({
      dueAt: new Date(Date.now() - 3_600_000).toISOString(),
    });

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'Sorry this is late.' });

    const detail = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(student.token));

    expect(detail.body.assignment.isLate).toBe(true);
  });

  it('refuses work from a student who is not enrolled', async () => {
    const professor = await registerUser('professor');
    const outsider = await registerUser('student');
    const course = await createCourse(professor);
    const assignment = await createAssignment(professor, course.id);

    const response = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(outsider.token))
      .send({ content: 'Let me in.' });

    expect(response.status).toBe(403);
  });

  it('refuses a group submission from a student with no group', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const loner = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, loner.id);

    const assignment = await createAssignment(professor, course.id, {
      submissionType: 'group',
      groups: [{ name: 'Team Only', leaderId: leader.id, memberIds: [leader.id] }],
    });

    const response = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(loner.token))
      .send({ content: 'I have no team.' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/not in a group/i);
  });

  it('shares one submission across every member of the group', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    const assignment = await createAssignment(professor, course.id, {
      submissionType: 'group',
      groups: [{ name: 'Team Shared', leaderId: leader.id, memberIds: [leader.id, member.id] }],
    });

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(leader.token))
      .send({ content: 'Team work from the leader.' });

    const memberView = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(member.token));

    expect(memberView.body.assignment.status).toBe('submitted');
    expect(memberView.body.assignment.content).toBe('Team work from the leader.');
    expect(memberView.body.assignment.isGroupLeader).toBe(false);
    expect(memberView.body.group.members).toHaveLength(2);
  });

  it('lets only the group leader acknowledge, then every member sees it', async () => {
    const professor = await registerUser('professor');
    const leader = await registerUser('student');
    const member = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, leader.id);
    await enroll(course.id, member.id);

    const assignment = await createAssignment(professor, course.id, {
      submissionType: 'group',
      groups: [{ name: 'Team Vote', leaderId: leader.id, memberIds: [leader.id, member.id] }],
    });

    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(leader.token))
      .send({ content: 'Ready for review.' });

    const submissionId = created.body.submission.id;

    const memberAttempt = await request(app)
      .post('/api/submissions/' + submissionId + '/acknowledge')
      .set(auth(member.token));

    expect(memberAttempt.status).toBe(403);
    expect(memberAttempt.body.error.message).toMatch(/group leader/i);

    const leaderAttempt = await request(app)
      .post('/api/submissions/' + submissionId + '/acknowledge')
      .set(auth(leader.token));

    expect(leaderAttempt.status).toBe(200);

    for (const student of [leader, member]) {
      const view = await request(app)
        .get('/api/assignments/' + assignment.id)
        .set(auth(student.token));

      expect(view.body.assignment.status).toBe('acknowledged');
      expect(view.body.assignment.acknowledgedAt).toBeTruthy();
    }

    const table = await request(app)
      .get('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(professor.token));

    expect(table.body.tally.acknowledged).toBe(1);
    expect(table.body.rows[0].acknowledgedBy).toBe(leader.name);
  });

  it('works the same way for individual work', async () => {
    const { student, assignment } = await courseWithStudent();

    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'Individual submission.' });

    const acknowledged = await request(app)
      .post('/api/submissions/' + created.body.submission.id + '/acknowledge')
      .set(auth(student.token));

    expect(acknowledged.status).toBe(200);

    const detail = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(student.token));

    expect(detail.body.assignment.status).toBe('acknowledged');
  });

  it('stops one student acknowledging another student submission', async () => {
    const professor = await registerUser('professor');
    const owner = await registerUser('student');
    const other = await registerUser('student');
    const course = await createCourse(professor);
    await enroll(course.id, owner.id);
    await enroll(course.id, other.id);
    const assignment = await createAssignment(professor, course.id);

    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(owner.token))
      .send({ content: 'Mine.' });

    const response = await request(app)
      .post('/api/submissions/' + created.body.submission.id + '/acknowledge')
      .set(auth(other.token));

    expect(response.status).toBe(403);
  });

  it('sends the work back to submitted when a student edits after acknowledging', async () => {
    const { student, assignment } = await courseWithStudent();

    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'First version.' });

    await request(app)
      .post('/api/submissions/' + created.body.submission.id + '/acknowledge')
      .set(auth(student.token));

    await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'Actually, here is the fixed version.' });

    const detail = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(student.token));

    expect(detail.body.assignment.status).toBe('submitted');
    expect(detail.body.assignment.acknowledgedAt).toBeNull();
  });

  it('grades a submission inside the point limit only', async () => {
    const { professor, student, assignment } = await courseWithStudent();
    const created = await request(app)
      .post('/api/assignments/' + assignment.id + '/submissions')
      .set(auth(student.token))
      .send({ content: 'Please grade me.' });

    const tooHigh = await request(app)
      .patch('/api/submissions/' + created.body.submission.id + '/grade')
      .set(auth(professor.token))
      .send({ grade: 150, feedback: '' });

    expect(tooHigh.status).toBe(400);

    const graded = await request(app)
      .patch('/api/submissions/' + created.body.submission.id + '/grade')
      .set(auth(professor.token))
      .send({ grade: 88, feedback: 'Clear structure. Tighten the conclusion.' });

    expect(graded.status).toBe(200);

    const detail = await request(app)
      .get('/api/assignments/' + assignment.id)
      .set(auth(student.token));

    expect(detail.body.assignment.grade).toBe(88);
    expect(detail.body.assignment.feedback).toMatch(/conclusion/i);
  });
});
