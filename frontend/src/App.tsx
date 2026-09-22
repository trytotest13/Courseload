import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { homeFor } from './lib/roles';
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { NotFoundPage } from './pages/NotFound';
import { ProfilePage } from './pages/Profile';
import { AssignmentForm } from './pages/professor/AssignmentForm';
import { ProfessorAssignmentDetail } from './pages/professor/AssignmentDetail';
import { ProfessorCourseDetail } from './pages/professor/CourseDetail';
import { ProfessorDashboard } from './pages/professor/Dashboard';
import { StudentAssignmentDetail } from './pages/student/AssignmentDetail';
import { StudentCourseDetail } from './pages/student/CourseDetail';
import { StudentDashboard } from './pages/student/Dashboard';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 text-ink-soft">
      <Spinner />
      <span className="text-sm">Loading your workspace</span>
    </div>
  );
}

/** Keeps the layout mounted and sends a signed in user to their own side of the app. */
function RoleGate({ role, children }: { role: 'student' | 'professor'; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route
          path="/student"
          element={
            <RoleGate role="student">
              <StudentDashboard />
            </RoleGate>
          }
        />
        <Route
          path="/student/courses/:courseId"
          element={
            <RoleGate role="student">
              <StudentCourseDetail />
            </RoleGate>
          }
        />
        <Route
          path="/student/assignments/:assignmentId"
          element={
            <RoleGate role="student">
              <StudentAssignmentDetail />
            </RoleGate>
          }
        />

        <Route
          path="/professor"
          element={
            <RoleGate role="professor">
              <ProfessorDashboard />
            </RoleGate>
          }
        />
        <Route
          path="/professor/courses/:courseId"
          element={
            <RoleGate role="professor">
              <ProfessorCourseDetail />
            </RoleGate>
          }
        />
        <Route
          path="/professor/courses/:courseId/assignments/new"
          element={
            <RoleGate role="professor">
              <AssignmentForm mode="create" />
            </RoleGate>
          }
        />
        <Route
          path="/professor/assignments/:assignmentId"
          element={
            <RoleGate role="professor">
              <ProfessorAssignmentDetail />
            </RoleGate>
          }
        />
        <Route
          path="/professor/assignments/:assignmentId/edit"
          element={
            <RoleGate role="professor">
              <AssignmentForm mode="edit" />
            </RoleGate>
          }
        />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
