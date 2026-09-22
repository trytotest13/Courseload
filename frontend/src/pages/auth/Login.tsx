import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Button, Spinner, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../lib/roles';
import { validateEmail, validateLoginPassword, hasErrors, type FieldErrors } from '../../lib/validation';
import { AuthLayout } from '../../layouts/AuthLayout';

const demoAccounts = [
  { label: 'Student', email: 'aarav.sharma@campus.edu', password: 'student123' },
  { label: 'Another student', email: 'kabir.nair@campus.edu', password: 'student123' },
  { label: 'Professor', email: 'meera.iyer@campus.edu', password: 'professor123' },
];

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: FieldErrors<'email' | 'password'> = {};
    const emailError = validateEmail(email);
    const passwordError = validateLoginPassword(password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const signedIn = await login(email.trim(), password);
      navigate(homeFor(signedIn.role), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not sign you in just now. Try again in a moment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
    setFormError(null);
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where your coursework left off."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@campus.edu"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="At least 8 characters"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
          trailingLabel={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="text-[0.76rem] font-semibold text-ink-soft transition hover:text-primary"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>

        <div className="rounded-card border border-dashed border-line bg-surface/70 px-4 py-3">
          <p className="label-micro">Demo accounts</p>
          <p className="mt-1 text-[0.78rem] text-ink-soft">
            Seeded data, safe to sign in with. Pick one to fill the form.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[0.74rem] font-semibold text-ink-soft transition hover:border-primary hover:text-primary"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        {submitting ? (
          <p className="flex items-center justify-center gap-2 text-[0.78rem] text-ink-faint">
            <Spinner className="h-3 w-3" /> Checking your details
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}
