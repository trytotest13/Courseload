import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, auth, closeDb, registerUser, resetDb } from './helpers';

describe('authentication', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('registers a student and returns a token with the role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test Student',
      email: 'new.student@test.dev',
      password: 'password-1234',
      role: 'student',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('student');
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('lowercases the email so sign in is not case sensitive', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Case Test',
      email: 'MixedCase@test.dev',
      password: 'password-1234',
      role: 'student',
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mixedcase@test.dev', password: 'password-1234' });

    expect(login.status).toBe(200);
  });

  it('rejects a duplicate email with a message a human can act on', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First',
      email: 'duplicate@test.dev',
      password: 'password-1234',
      role: 'student',
    });

    const second = await request(app).post('/api/auth/register').send({
      name: 'Second',
      email: 'duplicate@test.dev',
      password: 'password-1234',
      role: 'student',
    });

    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/already registered/i);
  });

  it('reports which field failed validation', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Short Password',
      email: 'not-an-email',
      password: 'abc',
      role: 'student',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toBeDefined();
    expect(response.body.error.details.password).toBeDefined();
  });

  it('answers the same way for a wrong password and an unknown email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Known User',
      email: 'known@test.dev',
      password: 'password-1234',
      role: 'professor',
    });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@test.dev', password: 'not-the-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.dev', password: 'not-the-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('returns the signed in user for /me', async () => {
    const user = await registerUser('professor');

    const response = await request(app).get('/api/auth/me').set(auth(user.token));

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.user.role).toBe('professor');
  });

  it('turns away requests without a valid token', async () => {
    const missing = await request(app).get('/api/auth/me');
    const garbage = await request(app).get('/api/auth/me').set({ Authorization: 'Bearer nonsense' });

    expect(missing.status).toBe(401);
    expect(garbage.status).toBe(401);
  });
});
