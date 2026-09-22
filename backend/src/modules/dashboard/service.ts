import type { AuthUser } from '../../lib/jwt';
import { listAssignmentsForCourse, listStudentAssignments } from '../assignments/service';
import { listCourses } from '../courses/service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SOON_MS = 48 * 60 * 60 * 1000;

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function getDashboard(user: AuthUser) {
  return user.role === 'student' ? getStudentDashboard(user) : getProfessorDashboard(user);
}

async function getStudentDashboard(user: AuthUser) {
  const [assignments, courses] = await Promise.all([
    listStudentAssignments(user.id),
    listCourses(user),
  ]);

  const now = Date.now();
  const upcoming = assignments
    .filter((assignment) => new Date(assignment.dueAt).getTime() >= now)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const pending = assignments.filter((assignment) => assignment.status === 'pending');

  return {
    role: 'student' as const,
    greetingName: user.name,
    stats: {
      courses: courses.length,
      assignments: assignments.length,
      dueThisWeek: assignments.filter((assignment) => {
        const due = new Date(assignment.dueAt).getTime();
        return due >= now && due - now <= WEEK_MS;
      }).length,
      waitingOnYou: pending.length,
      overdue: pending.filter((assignment) => new Date(assignment.dueAt).getTime() < now).length,
      acknowledged: assignments.filter((assignment) => assignment.status === 'acknowledged').length,
    },
    courses,
    upcoming: upcoming.slice(0, 6).map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      courseCode: assignment.courseCode,
      courseId: assignment.courseId,
      dueAt: assignment.dueAt,
      status: assignment.status,
      submissionType: assignment.submissionType,
      daysLeft: daysUntil(assignment.dueAt),
    })),
  };
}

async function getProfessorDashboard(user: AuthUser) {
  const courses = (await listCourses(user)) as Awaited<ReturnType<typeof listCourses>>;
  const professorCourses = courses as Array<{
    id: string;
    code: string;
    title: string;
    accent: string;
    studentCount: number;
    assignmentCount: number;
    submitted: number;
    acknowledged: number;
    pending: number;
  }>;

  const perCourse = await Promise.all(
    professorCourses.map(async (course) => ({
      course,
      assignments: await listAssignmentsForCourse(course.id),
    })),
  );

  const allAssignments = perCourse.flatMap((entry) => entry.assignments);
  const expected = allAssignments.reduce((total, assignment) => total + assignment.expected, 0);
  const submitted = allAssignments.reduce((total, assignment) => total + assignment.submitted, 0);
  const acknowledged = allAssignments.reduce(
    (total, assignment) => total + assignment.acknowledged,
    0,
  );

  const now = Date.now();

  return {
    role: 'professor' as const,
    greetingName: user.name,
    stats: {
      courses: professorCourses.length,
      students: professorCourses.reduce((total, course) => total + course.studentCount, 0),
      assignments: allAssignments.length,
      toReview: Math.max(submitted - acknowledged, 0),
      acknowledged,
      expected,
      ackRate: expected === 0 ? 0 : Math.round((acknowledged / expected) * 100),
    },
    courses: professorCourses,
    needsAttention: allAssignments
      .filter((assignment) => {
        const due = new Date(assignment.dueAt).getTime();
        return due >= now && due - now <= SOON_MS && assignment.pending > 0;
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 5)
      .map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        courseCode: assignment.courseCode,
        dueAt: assignment.dueAt,
        pending: assignment.pending,
        expected: assignment.expected,
        hoursLeft: Math.max(Math.round((new Date(assignment.dueAt).getTime() - now) / 3_600_000), 0),
      })),
  };
}
