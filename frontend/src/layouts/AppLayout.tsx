import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { coursesApi } from '../api/endpoints';
import { Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { cx } from '../lib/cx';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function icon(path: string) {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" strokeWidth="1.6" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const dashboardIcon = icon('M3.5 8.5 10 3.5l6.5 5v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7Z');
const profileIcon = icon('M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 7c0-2.4 2.7-4 6-4s6 1.6 6 4');

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const courses = useAsync(() => coursesApi.list(), [user?.id]);
  const isStudent = user?.role === 'student';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const root = isStudent ? '/student' : '/professor';
  const navItems: NavItem[] = [
    { to: root, label: 'Dashboard', icon: dashboardIcon },
    { to: '/profile', label: 'Profile', icon: profileIcon },
  ];

  const courseLinks = (courses.data?.courses ?? []).map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    accent: course.accent,
    to: root + '/courses/' + course.id,
  }));

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar, desktop only */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link to={root} className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink text-sm font-bold text-paper">
            C
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Courseload</span>
        </Link>

        <nav className="mt-7 flex flex-col gap-1" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === root}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-field px-2.5 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-primary-tint text-primary' : 'text-ink-soft hover:bg-paper hover:text-ink',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-7 flex-1 overflow-y-auto">
          <p className="label-micro px-2.5">
            {isStudent ? 'Enrolled courses' : 'Courses you teach'}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {courseLinks.map((course) => (
              <li key={course.id}>
                <NavLink
                  to={course.to}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-field px-2.5 py-2 text-[0.84rem] transition',
                      isActive ? 'bg-paper font-semibold text-ink' : 'text-ink-soft hover:bg-paper hover:text-ink',
                    )
                  }
                >
                  <span className="w-12 shrink-0 font-mono text-[0.72rem] font-medium text-ink-faint">
                    {course.code}
                  </span>
                  <span className="truncate">{course.title}</span>
                </NavLink>
              </li>
            ))}
            {courses.loading ? (
              <li className="px-2.5 py-2 text-[0.8rem] text-ink-faint">Loading courses...</li>
            ) : null}
            {!courses.loading && courseLinks.length === 0 ? (
              <li className="px-2.5 py-2 text-[0.8rem] text-ink-faint">
                {isStudent ? 'No enrolments yet.' : 'No courses yet.'}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-card border border-line bg-paper px-3 py-2.5">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-semibold text-ink">{user.name}</p>
            <p className="text-[0.72rem] capitalize text-ink-faint">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md px-2 py-1 text-[0.72rem] font-semibold text-ink-soft transition hover:bg-surface hover:text-status-overdue"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar, mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link to={root} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-ink text-[0.78rem] font-bold text-paper">
              C
            </span>
            <span className="font-display text-[0.95rem] font-semibold">Courseload</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5"
          >
            <Avatar name={user.name} size="sm" />
            <span className="text-[0.75rem] font-semibold text-ink-soft">
              {menuOpen ? 'Close' : 'Account'}
            </span>
          </button>
        </header>

        {menuOpen ? (
          <div className="animate-fade-rise border-b border-line bg-surface px-4 py-3 lg:hidden">
            <p className="text-[0.82rem] font-semibold text-ink">{user.name}</p>
            <p className="text-[0.75rem] text-ink-faint">
              <span className="capitalize">{user.role}</span> / {user.email}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 w-full rounded-field border border-line px-3 py-2 text-[0.82rem] font-semibold text-status-overdue"
            >
              Sign out
            </button>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9 lg:pb-12">
          <Outlet />
        </main>

        {/* Bottom nav, mobile */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === root}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold transition',
                  isActive ? 'text-primary' : 'text-ink-faint',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
