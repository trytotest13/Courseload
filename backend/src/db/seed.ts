import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { migrate } from './migrate';

const PROFESSOR_PASSWORD = 'professor123';
const STUDENT_PASSWORD = 'student123';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const professors = [
  { name: 'Meera Iyer', email: 'meera.iyer@campus.edu' },
  { name: 'Arun Verma', email: 'arun.verma@campus.edu' },
];

const students = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@campus.edu' },
  { name: 'Diya Patel', email: 'diya.patel@campus.edu' },
  { name: 'Kabir Nair', email: 'kabir.nair@campus.edu' },
  { name: 'Isha Rao', email: 'isha.rao@campus.edu' },
  { name: 'Rohan Menon', email: 'rohan.menon@campus.edu' },
  { name: 'Sara Khan', email: 'sara.khan@campus.edu' },
  { name: 'Vivaan Gupta', email: 'vivaan.gupta@campus.edu' },
  { name: 'Ananya Bose', email: 'ananya.bose@campus.edu' },
];

const courses = [
  {
    code: 'CS301',
    title: 'Data Structures and Algorithms',
    description: 'Trees, graphs and the cost of the choices we make in code.',
    accent: 'teal',
    professor: 'meera.iyer@campus.edu',
    students: [
      'aarav.sharma@campus.edu',
      'diya.patel@campus.edu',
      'kabir.nair@campus.edu',
      'isha.rao@campus.edu',
      'rohan.menon@campus.edu',
      'sara.khan@campus.edu',
    ],
  },
  {
    code: 'CS410',
    title: 'Machine Learning Foundations',
    description: 'Models, metrics and the harm a careless model can do.',
    accent: 'plum',
    professor: 'meera.iyer@campus.edu',
    students: [
      'aarav.sharma@campus.edu',
      'diya.patel@campus.edu',
      'kabir.nair@campus.edu',
      'vivaan.gupta@campus.edu',
    ],
  },
  {
    code: 'CS220',
    title: 'Web Systems',
    description: 'Layout, accessibility and the browser as a runtime.',
    accent: 'ochre',
    professor: 'arun.verma@campus.edu',
    students: [
      'isha.rao@campus.edu',
      'rohan.menon@campus.edu',
      'sara.khan@campus.edu',
      'vivaan.gupta@campus.edu',
      'ananya.bose@campus.edu',
    ],
  },
];

type IndividualSubmission = {
  student: string;
  status: 'submitted' | 'acknowledged';
  late?: boolean;
  content: string;
  link?: string;
  grade?: number;
};

type GroupSubmission = {
  group: string;
  status: 'submitted' | 'acknowledged';
  late?: boolean;
  content: string;
  link?: string;
  acknowledgedBy?: string;
  grade?: number;
};

const assignments: Array<{
  courseCode: string;
  title: string;
  description: string;
  dueInDays: number;
  submissionType: 'individual' | 'group';
  maxPoints: number;
  groups?: Array<{ name: string; leader: string; members: string[] }>;
  submissions?: Array<IndividualSubmission | GroupSubmission>;
}> = [
  {
    courseCode: 'CS301',
    title: 'Binary search tree report',
    description:
      'Build a BST with insert, delete and an in-order walk. Write up the worst case for each operation and paste the timing you measured for 10k inserts.',
    dueInDays: 3,
    submissionType: 'individual',
    maxPoints: 100,
    submissions: [
      {
        student: 'aarav.sharma@campus.edu',
        status: 'acknowledged',
        content: 'Delete has three cases. The two child case is where my first version leaked nodes.',
        link: 'https://github.com/aarav/bst-report',
        grade: 92,
      },
      {
        student: 'diya.patel@campus.edu',
        status: 'submitted',
        content: 'In-order walk gives sorted output, so the tree doubles as a sort with no extra array.',
        link: 'https://gist.github.com/diya/bst',
      },
      {
        student: 'isha.rao@campus.edu',
        status: 'acknowledged',
        late: true,
        content: 'Inserted 10k keys, average depth came out at 21, worst case 38.',
        grade: 78,
      },
      {
        student: 'sara.khan@campus.edu',
        status: 'submitted',
        content: 'Timing run attached. I also compared against a sorted array for lookups.',
      },
    ],
  },
  {
    courseCode: 'CS301',
    title: 'Graph traversal lab',
    description:
      'Run BFS and DFS over the campus map from the lab handout. Explain why the two visit orders differ.',
    dueInDays: 9,
    submissionType: 'individual',
    maxPoints: 60,
  },
  {
    courseCode: 'CS301',
    title: 'Semester project, part 1',
    description:
      'Your team picks a dataset, stores it in a structure you can defend and ships a working prototype. Part 1 is the data layer plus a short demo.',
    dueInDays: 5,
    submissionType: 'group',
    maxPoints: 150,
    groups: [
      {
        name: 'Team Atlas',
        leader: 'aarav.sharma@campus.edu',
        members: ['aarav.sharma@campus.edu', 'diya.patel@campus.edu', 'kabir.nair@campus.edu'],
      },
      {
        name: 'Team Orbit',
        leader: 'isha.rao@campus.edu',
        members: ['isha.rao@campus.edu', 'rohan.menon@campus.edu', 'sara.khan@campus.edu'],
      },
    ],
    submissions: [
      {
        group: 'Team Atlas',
        status: 'acknowledged',
        content: 'Data layer is a hash index over the raw CSV plus a sorted view for range queries.',
        link: 'https://github.com/team-atlas/project-1',
        acknowledgedBy: 'aarav.sharma@campus.edu',
        grade: 138,
      },
      {
        group: 'Team Orbit',
        status: 'submitted',
        content: 'We kept the raw feed as the source of truth and built a small cache on top.',
      },
    ],
  },
  {
    courseCode: 'CS410',
    title: 'Bias audit writeup',
    description:
      'Take the classifier from week 2, measure its error rate across each subgroup and write one page on what you would change.',
    dueInDays: 2,
    submissionType: 'individual',
    maxPoints: 80,
    submissions: [
      {
        student: 'aarav.sharma@campus.edu',
        status: 'acknowledged',
        content: 'Error rate doubled for the smallest subgroup. The split was unbalanced in the training set.',
        grade: 74,
      },
      {
        student: 'diya.patel@campus.edu',
        status: 'submitted',
        content: 'Attached the per group table and the confusion matrix for each cut.',
      },
    ],
  },
  {
    courseCode: 'CS410',
    title: 'Model card review',
    description:
      'In pairs, review the model card of a deployed system and list what it leaves out for a non technical reader.',
    dueInDays: 6,
    submissionType: 'group',
    maxPoints: 50,
    groups: [
      { name: 'Team Drift', leader: 'aarav.sharma@campus.edu', members: ['aarav.sharma@campus.edu', 'diya.patel@campus.edu'] },
      { name: 'Team Kernel', leader: 'vivaan.gupta@campus.edu', members: ['vivaan.gupta@campus.edu', 'kabir.nair@campus.edu'] },
    ],
  },
  {
    courseCode: 'CS220',
    title: 'Responsive layout critique',
    description:
      'Pick a real site, resize it from 320px to 1440px and screenshot every place the layout breaks. Suggest one fix per break.',
    dueInDays: -1,
    submissionType: 'individual',
    maxPoints: 40,
    submissions: [
      {
        student: 'isha.rao@campus.edu',
        status: 'submitted',
        late: true,
        content: 'It fell apart at 375px. The nav overlapped the search box, fix is a wrapping flex row.',
      },
      {
        student: 'vivaan.gupta@campus.edu',
        status: 'acknowledged',
        content: 'Found four breaks. Worst one was a fixed height card clipping its own footer.',
        grade: 36,
      },
    ],
  },
  {
    courseCode: 'CS220',
    title: 'Group API integration',
    description:
      'Wire a frontend to a real API with loading, empty and error states. Show all three in your demo.',
    dueInDays: 4,
    submissionType: 'group',
    maxPoints: 90,
    groups: [
      { name: 'Team Relay', leader: 'isha.rao@campus.edu', members: ['isha.rao@campus.edu', 'rohan.menon@campus.edu'] },
      {
        name: 'Team Signal',
        leader: 'vivaan.gupta@campus.edu',
        members: ['vivaan.gupta@campus.edu', 'ananya.bose@campus.edu', 'sara.khan@campus.edu'],
      },
    ],
  },
];

async function seed(): Promise<void> {
  await migrate();
  const client = await pool.connect();
  const now = Date.now();

  try {
    await client.query('BEGIN');
    await client.query(
      'TRUNCATE activities, submissions, group_members, groups, assignments, enrollments, courses, users RESTART IDENTITY CASCADE',
    );

    const professorHash = await bcrypt.hash(PROFESSOR_PASSWORD, 10);
    const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 10);

    const professorIds = new Map<string, string>();
    for (const professor of professors) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'professor') RETURNING id`,
        [professor.name, professor.email, professorHash],
      );
      professorIds.set(professor.email, rows[0].id);
    }

    const studentIds = new Map<string, string>();
    for (const student of students) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id`,
        [student.name, student.email, studentHash],
      );
      studentIds.set(student.email, rows[0].id);
    }

    const courseIds = new Map<string, string>();
    for (const course of courses) {
      const professorId = professorIds.get(course.professor);
      if (!professorId) throw new Error('missing professor ' + course.professor);
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO courses (code, title, description, accent, professor_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [course.code, course.title, course.description, course.accent, professorId],
      );
      courseIds.set(course.code, rows[0].id);

      for (const email of course.students) {
        const studentId = studentIds.get(email);
        if (!studentId) throw new Error('missing student ' + email);
        await client.query('INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2)', [
          rows[0].id,
          studentId,
        ]);
      }
    }

    for (const spec of assignments) {
      const courseId = courseIds.get(spec.courseCode);
      if (!courseId) throw new Error('missing course ' + spec.courseCode);
      const course = courses.find((item) => item.code === spec.courseCode);
      const professorId = professorIds.get(course?.professor ?? '');
      if (!professorId) throw new Error('missing professor for ' + spec.courseCode);

      const dueAt = new Date(now + spec.dueInDays * DAY);
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO assignments (course_id, title, description, due_at, submission_type, max_points, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [courseId, spec.title, spec.description, dueAt.toISOString(), spec.submissionType, spec.maxPoints, professorId],
      );
      const assignmentId = rows[0].id;

      await client.query(
        `INSERT INTO activities (actor_id, assignment_id, action, summary) VALUES ($1, $2, 'created', $3)`,
        [professorId, assignmentId, 'created this assignment'],
      );

      const groupIds = new Map<string, string>();
      for (const group of spec.groups ?? []) {
        const leaderId = studentIds.get(group.leader);
        if (!leaderId) throw new Error('missing leader ' + group.leader);
        const created = await client.query<{ id: string }>(
          'INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id',
          [assignmentId, group.name, leaderId],
        );
        groupIds.set(group.name, created.rows[0].id);
        for (const email of group.members) {
          const memberId = studentIds.get(email);
          if (!memberId) throw new Error('missing member ' + email);
          await client.query('INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)', [
            created.rows[0].id,
            memberId,
          ]);
        }
      }

      // Work handed in a day before the deadline, but never in the future.
      const submittedAt = new Date(Math.min(dueAt.getTime() - 20 * HOUR, now - 2 * HOUR));

      for (const submission of spec.submissions ?? []) {
        const acknowledged = submission.status === 'acknowledged';
        const isGroup = 'group' in submission;

        if (isGroup) {
          const groupId = groupIds.get(submission.group);
          if (!groupId) throw new Error('missing group ' + submission.group);
          const actorId = submission.acknowledgedBy
            ? studentIds.get(submission.acknowledgedBy) ?? null
            : null;
          const { rows: created } = await client.query<{ id: string }>(
            `INSERT INTO submissions (assignment_id, group_id, content, link_url, status, is_late,
                                      submitted_at, acknowledged_at, acknowledged_by, grade)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              assignmentId,
              groupId,
              submission.content,
              submission.link ?? null,
              submission.status,
              submission.late ?? false,
              submittedAt.toISOString(),
              acknowledged ? new Date(submittedAt.getTime() + 6 * HOUR).toISOString() : null,
              acknowledged ? actorId : null,
              submission.grade ?? null,
            ],
          );
          const leaderId = studentIds.get(
            spec.groups?.find((group) => group.name === submission.group)?.leader ?? '',
          );
          if (leaderId) {
            await client.query(
              `INSERT INTO activities (actor_id, assignment_id, submission_id, action, summary)
               VALUES ($1, $2, $3, 'submitted', $4)`,
              [leaderId, assignmentId, created[0].id, 'submitted for ' + submission.group],
            );
          }
          if (acknowledged && actorId) {
            await client.query(
              `INSERT INTO activities (actor_id, assignment_id, submission_id, action, summary)
               VALUES ($1, $2, $3, 'acknowledged', $4)`,
              [actorId, assignmentId, created[0].id, 'acknowledged on behalf of ' + submission.group],
            );
          }
        } else {
          const studentId = studentIds.get(submission.student);
          if (!studentId) throw new Error('missing student ' + submission.student);
          const { rows: created } = await client.query<{ id: string }>(
            `INSERT INTO submissions (assignment_id, student_id, content, link_url, status, is_late,
                                      submitted_at, acknowledged_at, acknowledged_by, grade)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              assignmentId,
              studentId,
              submission.content,
              submission.link ?? null,
              submission.status,
              submission.late ?? false,
              submittedAt.toISOString(),
              acknowledged ? new Date(submittedAt.getTime() + 8 * HOUR).toISOString() : null,
              acknowledged ? professorId : null,
              submission.grade ?? null,
            ],
          );
          await client.query(
            `INSERT INTO activities (actor_id, assignment_id, submission_id, action, summary)
             VALUES ($1, $2, $3, 'submitted', 'submitted their work')`,
            [studentId, assignmentId, created[0].id],
          );
        }
      }
    }

    await client.query('COMMIT');

    console.log('Demo data is in place.\n');
    console.log('  Professor  meera.iyer@campus.edu / ' + PROFESSOR_PASSWORD);
    console.log('  Professor  arun.verma@campus.edu / ' + PROFESSOR_PASSWORD);
    console.log('  Student    aarav.sharma@campus.edu / ' + STUDENT_PASSWORD + '  (group leader)');
    console.log('  Student    isha.rao@campus.edu / ' + STUDENT_PASSWORD + '  (group leader)');
    console.log('  Student    kabir.nair@campus.edu / ' + STUDENT_PASSWORD + '  (group member)');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };
