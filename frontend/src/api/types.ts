export type UserRole = 'student' | 'professor';
export type SubmissionType = 'individual' | 'group';
export type EffectiveStatus = 'pending' | 'submitted' | 'acknowledged';
export type StatusFilter = 'all' | 'pending' | 'submitted' | 'acknowledged' | 'late';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
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

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: SubmissionType;
  maxPoints: number;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseAccent: string;
  status: EffectiveStatus;
  isLate: boolean;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  submissionId: string | null;
  content: string | null;
  linkUrl: string | null;
  grade: number | null;
  feedback: string | null;
  groupId: string | null;
  groupName: string | null;
  isGroupLeader: boolean;
}

export interface ProfessorAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: SubmissionType;
  maxPoints: number;
  expected: number;
  submitted: number;
  acknowledged: number;
  pending: number;
  late: number;
  groupCount: number;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  isLeader: boolean;
}

export interface GroupView {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  members: GroupMember[];
}

export interface ActivityEntry {
  id: string;
  action: string;
  summary: string;
  actorName: string | null;
  createdAt: string;
}

export interface SubmissionRow {
  id: string | null;
  kind: SubmissionType;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  groupId: string | null;
  groupName: string | null;
  leaderName: string | null;
  members: GroupMember[];
  status: EffectiveStatus;
  isLate: boolean;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  content: string | null;
  linkUrl: string | null;
  grade: number | null;
  feedback: string | null;
}

export interface Tally {
  expected: number;
  submitted: number;
  acknowledged: number;
  pending: number;
  late: number;
}

export interface RosterEntry {
  id: string;
  name: string;
  email: string;
  submitted: number;
  acknowledged: number;
  pending: number;
}

export interface CourseRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  accent: string;
  professorId: string;
  professorName: string;
}

export type CourseDetailResponse =
  | { role: 'student'; course: CourseRecord; assignments: StudentAssignment[] }
  | { role: 'professor'; course: CourseRecord; roster: RosterEntry[]; assignments: ProfessorAssignment[] };

export type AssignmentDetailResponse =
  | { role: 'student'; assignment: StudentAssignment; group: GroupView | null; activity: ActivityEntry[] }
  | {
      role: 'professor';
      assignment: CourseAssignmentRecord;
      submissions: SubmissionRow[];
      tally: Tally;
      groups: GroupView[];
      activity: ActivityEntry[];
    };

export interface CourseAssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: string;
  submissionType: SubmissionType;
  maxPoints: number;
  createdBy: string;
  courseCode: string;
  courseTitle: string;
  professorId: string;
}

export interface StudentDashboard {
  role: 'student';
  greetingName: string;
  stats: {
    courses: number;
    assignments: number;
    dueThisWeek: number;
    waitingOnYou: number;
    overdue: number;
    acknowledged: number;
  };
  courses: StudentCourse[];
  upcoming: Array<{
    id: string;
    title: string;
    courseCode: string;
    courseId: string;
    dueAt: string;
    status: EffectiveStatus;
    submissionType: SubmissionType;
    daysLeft: number;
  }>;
}

export interface ProfessorDashboard {
  role: 'professor';
  greetingName: string;
  stats: {
    courses: number;
    students: number;
    assignments: number;
    toReview: number;
    acknowledged: number;
    expected: number;
    ackRate: number;
  };
  courses: ProfessorCourse[];
  needsAttention: Array<{
    id: string;
    title: string;
    courseCode: string;
    dueAt: string;
    pending: number;
    expected: number;
    hoursLeft: number;
  }>;
}

export type DashboardResponse = StudentDashboard | ProfessorDashboard;

export interface SubmissionFilterResponse {
  assignment: CourseAssignmentRecord;
  rows: SubmissionRow[];
  tally: Tally;
}
