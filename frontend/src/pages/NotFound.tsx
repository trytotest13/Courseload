import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../lib/roles';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-ink-faint">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        This page took a different course.
      </h1>
      <p className="mt-3 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
        The link is either old or mistyped. Your dashboard is still where you left it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to={user ? homeFor(user.role) : '/login'}>
          <Button size="lg">{user ? 'Back to dashboard' : 'Sign in'}</Button>
        </Link>
        {user ? (
          <Link to="/profile">
            <Button variant="secondary" size="lg">
              Your profile
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
