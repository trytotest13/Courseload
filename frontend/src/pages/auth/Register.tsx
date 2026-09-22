import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import type { UserRole } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button, ProgressBar, SegmentedControl, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../lib/roles';
import {
  hasErrors,
  passwordStrength,
  validateEmail,
  validateName,
  validatePassword,
  type FieldErrors,
} from '../../lib/validation';
import { AuthLayout } from '../../layouts/AuthLayout';

type Field = 'name' | 'email' | 'password' | 'confirm';

export function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: FieldErrors<Field> = {};
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    if (password !== confirm) nextErrors.confirm = 'Both passwords have to match.';
    if (!agreed) nextErrors.confirm = nextErrors.confirm ?? 'Tick the box to continue.';

    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const created = await register({ name: name.trim(), email: email.trim(), password, role });
      navigate(homeFor(created.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.details).length > 0) {
        setErrors(error.details as FieldErrors<Field>);
      }
      setFormError(
        error instanceof ApiError ? error.message : 'We could not create that account just now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Students hand work in and confirm it. Professors watch the whole class at a glance."
      footer={
        <>
          Already signed up?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <div>
          <p className="field-label">I am joining as</p>
          <SegmentedControl
            name="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'student', label: 'Student', description: 'Submit work and confirm it.' },
              { value: 'professor', label: 'Professor', description: 'Set work and track the class.' },
            ]}
          />
        </div>

        <TextField
          name="name"
          label="Full name"
          autoComplete="name"
          placeholder="Aarav Sharma"
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />

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

        <div>
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {password ? (
            <div className="mt-2 flex items-center gap-2.5">
              <ProgressBar
                value={(strength.score / 4) * 100}
                className="flex-1"
                thickness="thin"
                label="Password strength"
              />
              <span className="text-[0.74rem] font-semibold text-ink-soft">{strength.label}</span>
            </div>
          ) : null}
        </div>

        <TextField
          name="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Type it once more"
          value={confirm}
          error={errors.confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <label className="flex items-start gap-2.5 rounded-field border border-line bg-surface/70 px-3.5 py-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary"
          />
          <span className="text-[0.8rem] leading-relaxed text-ink-soft">
            I understand this is coursework data and that my professor can see my submission status.
          </span>
        </label>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Creating your account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
