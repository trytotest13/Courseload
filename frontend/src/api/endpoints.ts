import { api } from './client';
import type {
  AssignmentDetailResponse,
  AuthResponse,
  CourseAssignmentRecord,
  CourseDetailResponse,
  DashboardResponse,
  GroupView,
  ProfessorCourse,
  StatusFilter,
  StudentCourse,
  SubmissionFilterResponse,
  User,
  UserRole,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
  register: (input: { name: string; email: string; password: string; role: UserRole }) =>
    api.post<AuthResponse>('/api/auth/register', input),
  me: () => api.get<{ user: User }>('/api/auth/me'),
};

export const dashboardApi = {
  load: () => api.get<DashboardResponse>('/api/dashboard'),
};

export interface AssignmentPayload {
  title: string;
  description: string;
  dueAt: string;
  submissionType: 'individual' | 'group';
  maxPoints: number;
  groups?: Array<{ name: string; leaderId: string; memberIds: string[] }>;
}

export const coursesApi = {
  list: () => api.get<{ courses: Array<StudentCourse | ProfessorCourse> }>('/api/courses'),
  detail: (courseId: string) => api.get<CourseDetailResponse>('/api/courses/' + courseId),
  create: (input: { code: string; title: string; description: string; accent: string }) =>
    api.post<{ course: { id: string; code: string; title: string } }>('/api/courses', input),
};

export const assignmentsApi = {
  detail: (assignmentId: string) =>
    api.get<AssignmentDetailResponse>('/api/assignments/' + assignmentId),
  create: (courseId: string, payload: AssignmentPayload) =>
    api.post<{ assignment: CourseAssignmentRecord }>('/api/courses/' + courseId + '/assignments', payload),
  update: (assignmentId: string, payload: Partial<AssignmentPayload>) =>
    api.patch<{ assignment: CourseAssignmentRecord }>('/api/assignments/' + assignmentId, payload),
  remove: (assignmentId: string) => api.delete<void>('/api/assignments/' + assignmentId),
  submissions: (assignmentId: string, filter: { status: StatusFilter; q: string }) => {
    const params = new URLSearchParams({ status: filter.status, q: filter.q });
    return api.get<SubmissionFilterResponse>(
      '/api/assignments/' + assignmentId + '/submissions?' + params.toString(),
    );
  },
  groups: (assignmentId: string) =>
    api.get<{ groups: GroupView[] }>('/api/assignments/' + assignmentId + '/groups'),
};

export const submissionsApi = {
  submit: (assignmentId: string, payload: { content: string; linkUrl?: string }) =>
    api.post<{ submission: { id: string; status: string; isLate: boolean } }>(
      '/api/assignments/' + assignmentId + '/submissions',
      payload,
    ),
  acknowledge: (submissionId: string) =>
    api.post<{ submission: { id: string; status: string } }>(
      '/api/submissions/' + submissionId + '/acknowledge',
    ),
  grade: (submissionId: string, payload: { grade: number; feedback: string }) =>
    api.patch<{ submission: { id: string; grade: number; feedback: string } }>(
      '/api/submissions/' + submissionId + '/grade',
      payload,
    ),
};
