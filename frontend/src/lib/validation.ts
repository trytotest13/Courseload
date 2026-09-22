export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Enter your full name.';
  if (trimmed.length > 80) return 'That name is too long.';
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'That email address does not look right.';
  if (trimmed.length > 160) return 'That email is too long.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Use at least 8 characters.';
  if (value.length > 72) return 'Keep the password under 72 characters.';
  return null;
}

export function validateLoginPassword(value: string): string | null {
  return value.length === 0 ? 'Enter your password.' : null;
}

export interface Strength {
  score: number;
  label: string;
  tone: 'overdue' | 'pending' | 'submitted' | 'acknowledged';
}

export function passwordStrength(value: string): Strength {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Too short', 'Getting there', 'Reasonable', 'Strong', 'Very strong'];
  const tones: Array<Strength['tone']> = ['overdue', 'overdue', 'pending', 'submitted', 'acknowledged'];

  return { score: capped, label: labels[capped], tone: tones[capped] };
}

export function validateLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return 'Links need to start with http:// or https://';
  if (trimmed.length > 500) return 'That link is too long.';
  return null;
}

export function validateSubmission(content: string, link: string): FieldErrors<'content' | 'linkUrl'> {
  const errors: FieldErrors<'content' | 'linkUrl'> = {};
  const linkError = validateLink(link);
  if (linkError) errors.linkUrl = linkError;
  if (!content.trim() && !link.trim()) errors.content = 'Add a short note or a link before submitting.';
  if (content.trim().length > 4000) errors.content = 'That note is too long.';
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
