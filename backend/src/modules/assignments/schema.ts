import { z } from 'zod';

const dueDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Pick a valid due date and time.',
});

export const groupInputSchema = z.object({
  name: z.string().trim().min(1, 'Name the group.').max(40, 'Keep the group name short.'),
  leaderId: z.string().uuid('Pick a group leader.'),
  memberIds: z.array(z.string().uuid()).min(1, 'Add at least one member to the group.').max(30),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(3, 'Give the assignment a title.').max(140),
  description: z.string().trim().max(4000).default(''),
  dueAt: dueDate,
  submissionType: z.enum(['individual', 'group']),
  maxPoints: z.coerce.number().int().min(1, 'Points have to be at least 1.').max(1000).default(100),
  groups: z.array(groupInputSchema).max(60).default([]),
});

export const updateAssignmentSchema = assignmentSchema.partial();

export const submissionSchema = z
  .object({
    content: z.string().trim().max(4000, 'That note is too long.').default(''),
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
        message: 'Links need to start with http:// or https://',
      }),
  })
  .refine((value) => value.content.length > 0 || Boolean(value.linkUrl), {
    message: 'Add a short note or a link before submitting.',
    path: ['content'],
  });

export const gradeSchema = z.object({
  grade: z.coerce.number().int().min(0, 'Grades cannot be negative.').max(1000),
  feedback: z.string().trim().max(2000).default(''),
});

export const submissionFilterSchema = z.object({
  status: z.enum(['all', 'pending', 'submitted', 'acknowledged', 'late']).default('all'),
  q: z.string().trim().max(80).default(''),
});

export type GroupInput = z.infer<typeof groupInputSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type SubmissionFilter = z.infer<typeof submissionFilterSchema>;
