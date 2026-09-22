import { useNavigate } from 'react-router-dom';
import { coursesApi } from '../api/endpoints';
import { Avatar, Button, Card, Skeleton, StatTile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../lib/format';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const courses = useAsync(() => coursesApi.list(), []);

  if (!user) return null;

  const isStudent = user.role === 'student';
  const list = courses.data?.courses ?? [];
  const studentCourses = list.filter((course) => 'professorName' in course);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-ink">{user.name}</h1>
            <p className="text-[0.85rem] text-ink-soft">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-full border border-primary/25 bg-primary-tint px-2.5 py-0.5 text-[0.72rem] font-semibold capitalize text-primary">
              {user.role}
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {courses.loading ? (
          <>
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </>
        ) : (
          <>
            <StatTile
              label={isStudent ? 'Enrolled courses' : 'Courses you teach'}
              value={list.length}
            />
            <StatTile
              label={isStudent ? 'Assignments to hand in' : 'Assignments set'}
              value={list.reduce((total, course) => total + course.assignmentCount, 0)}
            />
            <StatTile
              label="Member since"
              value={<span className="text-xl">{formatDate(new Date().toISOString())}</span>}
              hint="Seeded demo account"
            />
          </>
        )}
      </section>

      <Card className="p-5">
        <h2 className="font-display text-base font-semibold text-ink">How this account works</h2>
        <ul className="mt-3 flex flex-col gap-2.5 text-[0.85rem] leading-relaxed text-ink-soft">
          {isStudent ? (
            <>
              <li>You see the courses you are enrolled in, and nothing else.</li>
              <li>Handing work in marks it submitted. Confirming it marks it acknowledged.</li>
              <li>On group work, one shared submission covers the whole team and the leader confirms it.</li>
            </>
          ) : (
            <>
              <li>You see the courses you own, with the full roster and every submission.</li>
              <li>You can set, edit and track assignments, and filter by submission status.</li>
              <li>An acknowledgement tells you the student has seen the final version of the work.</li>
            </>
          )}
          <li>Signing out clears the token stored in this browser.</li>
        </ul>

        {isStudent && studentCourses.length > 0 ? (
          <p className="mt-4 text-[0.82rem] text-ink-faint">
            {studentCourses.map((course) => course.code).join(', ')}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
