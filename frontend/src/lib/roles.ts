import type { UserRole } from '../api/types';

export function homeFor(role: UserRole): string {
  return role === 'student' ? '/student' : '/professor';
}
