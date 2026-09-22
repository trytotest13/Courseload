import bcrypt from 'bcryptjs';
import { query } from '../../db/pool';
import { ApiError } from '../../lib/errors';
import { signToken, type AuthUser, type UserRole } from '../../lib/jwt';
import type { LoginInput, RegisterInput } from './schema';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password_hash: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const BCRYPT_ROUNDS = 10;

// Used when the email does not exist, so a failed login always costs one hash comparison.
// Without it, response time leaks which emails are registered.
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, password_hash`,
      [input.name, input.email, passwordHash, input.role],
    );
    const row = rows[0];
    if (!row) throw new Error('insert returned no row');
    const user = toPublicUser(row);
    return { token: signToken(user as AuthUser), user };
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw ApiError.conflict('That email is already registered. Try signing in instead.');
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const { rows } = await query<UserRow>(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [input.email],
  );
  const row = rows[0];
  const passwordMatches = await bcrypt.compare(input.password, row?.password_hash ?? DUMMY_HASH);

  if (!row || !passwordMatches) {
    throw ApiError.unauthorized('Those details do not match an account. Check the email and password.');
  }

  const user = toPublicUser(row);
  return { token: signToken(user as AuthUser), user };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const { rows } = await query<UserRow>(
    'SELECT id, name, email, role, password_hash FROM users WHERE id = $1',
    [id],
  );
  const row = rows[0];
  return row ? toPublicUser(row) : null;
}
