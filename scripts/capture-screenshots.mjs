/**
 * Captures the screenshots used in the README, and doubles as an end to end
 * smoke test: every page has to render before its picture is taken.
 *
 * Run the API on :4000 and the frontend on :5173 first, then:
 *   npm run screenshots
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:4000';
const OUT = 'docs/screenshots';

const STUDENT = { email: 'aarav.sharma@campus.edu', password: 'student123' };
const LEADER = { email: 'isha.rao@campus.edu', password: 'student123' };
const PROFESSOR = { email: 'meera.iyer@campus.edu', password: 'professor123' };

async function apiFetch(path, token) {
  const response = await fetch(API + path, {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  if (!response.ok) throw new Error(path + ' answered ' + response.status);
  return response.json();
}

async function signIn(credentials) {
  const response = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) throw new Error('could not sign in as ' + credentials.email);
  return response.json();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const student = await signIn(STUDENT);
  const professor = await signIn(PROFESSOR);

  const studentCourses = (await apiFetch('/api/courses', student.token)).courses;
  const dataStructures = studentCourses.find((course) => course.code === 'CS301');
  const studentWork = (await apiFetch('/api/courses/' + dataStructures.id, student.token)).assignments;
  const groupWork = studentWork.find((item) => item.submissionType === 'group');
  const openWork = studentWork.find((item) => item.status === 'pending') ?? studentWork[0];

  const professorCourses = (await apiFetch('/api/courses', professor.token)).courses;
  const taught = professorCourses.find((course) => course.code === 'CS301');
  const courseDetail = await apiFetch('/api/courses/' + taught.id, professor.token);
  const mixed = courseDetail.assignments.find((item) => item.submissionType === 'group');
  const individual = courseDetail.assignments.find((item) => item.submissionType === 'individual');

  const browser = await chromium.launch();

  const shots = [
    { name: '01-login', path: '/login', session: null, note: 'Sign in with validation and demo accounts' },
    { name: '02-register', path: '/register', session: null },
    { name: '03-student-dashboard', path: '/student', session: student.token },
    { name: '04-student-course', path: '/student/courses/' + dataStructures.id, session: student.token },
    { name: '05-student-assignment-group', path: '/student/assignments/' + groupWork.id, session: student.token },
    { name: '06-student-assignment-open', path: '/student/assignments/' + openWork.id, session: student.token },
    { name: '07-professor-dashboard', path: '/professor', session: professor.token },
    { name: '08-professor-course-roster', path: '/professor/courses/' + taught.id, session: professor.token },
    { name: '09-professor-submissions', path: '/professor/assignments/' + mixed.id, session: professor.token },
    { name: '10-professor-individual-submissions', path: '/professor/assignments/' + individual.id, session: professor.token },
    { name: '11-professor-new-assignment', path: '/professor/courses/' + taught.id + '/assignments/new', session: professor.token },
  ];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: 1360, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    if (shot.session) {
      await page.goto(WEB + '/login');
      await page.evaluate((token) => window.localStorage.setItem('courseload.token', token), shot.session);
    }

    await page.goto(WEB + shot.path, { waitUntil: 'networkidle' });
    await page.waitForSelector('main, h1', { timeout: 15000 });
    // Let the entrance animations settle before the shutter.
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + '/' + shot.name + '.png', fullPage: true });
    console.log('captured ' + shot.name + (shot.note ? ' (' + shot.note + ')' : ''));
    await context.close();
  }

  // Phone sized shots of the two screens people use standing up.
  for (const shot of [
    { name: '12-mobile-student-dashboard', path: '/student', session: student.token },
    { name: '13-mobile-assignment', path: '/student/assignments/' + groupWork.id, session: student.token },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(WEB + '/login');
    await page.evaluate((token) => window.localStorage.setItem('courseload.token', token), shot.session);
    await page.goto(WEB + shot.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + '/' + shot.name + '.png', fullPage: true });
    console.log('captured ' + shot.name);
    await context.close();
  }

  // The leader view proves the acknowledgement button only appears for them.
  const leader = await signIn(LEADER);
  const leaderContext = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
  const leaderPage = await leaderContext.newPage();
  await leaderPage.goto(WEB + '/login');
  await leaderPage.evaluate((token) => window.localStorage.setItem('courseload.token', token), leader.token);
  await leaderPage.goto(WEB + '/student/assignments/' + groupWork.id, { waitUntil: 'networkidle' });
  await leaderPage.waitForTimeout(600);
  await leaderPage.screenshot({ path: OUT + '/14-student-assignment-leader.png', fullPage: true });
  console.log('captured 14-student-assignment-leader');
  await leaderContext.close();

  await browser.close();
  console.log('\nScreenshots are in ' + OUT);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
