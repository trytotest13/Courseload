import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  // bcrypt only reads the first 72 bytes, so stop the user before that matters.
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Keep the password under 72 characters.'),
  role: z.enum(['student', 'professor'], {
    errorMap: () => ({ message: 'Choose whether you are a student or a professor.' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
