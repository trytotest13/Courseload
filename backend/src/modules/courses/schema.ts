import { z } from 'zod';

export const createCourseSchema = z.object({
  code: z.string().trim().min(2, 'Enter a course code.').max(16, 'Keep the code short.').toUpperCase(),
  title: z.string().trim().min(3, 'Enter a course title.').max(120),
  description: z.string().trim().max(600).default(''),
  accent: z.enum(['teal', 'ochre', 'plum', 'moss', 'slate']).default('teal'),
  studentIds: z.array(z.string().uuid()).max(200).default([]),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
