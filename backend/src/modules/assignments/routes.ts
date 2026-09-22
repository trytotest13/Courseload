import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { createGroup, deleteGroup, listGroupsForAssignment, setGroupLeader } from '../groups/service';
import {
  acknowledgeSubmission,
  gradeSubmission,
  submitAssignment,
} from '../submissions/service';
import {
  gradeSchema,
  groupInputSchema,
  submissionFilterSchema,
  submissionSchema,
  updateAssignmentSchema,
} from './schema';
import { deleteAssignment, getAssignmentDetail, listSubmissions, updateAssignment } from './service';
import { z } from 'zod';

export const assignmentsRouter = Router();

assignmentsRouter.use(requireAuth);

assignmentsRouter.get(
  '/:assignmentId',
  asyncHandler(async (req, res) => {
    res.json(await getAssignmentDetail(currentUser(req), req.params.assignmentId));
  }),
);

assignmentsRouter.patch(
  '/:assignmentId',
  requireRole('professor'),
  validateBody(updateAssignmentSchema),
  asyncHandler(async (req, res) => {
    const assignment = await updateAssignment(currentUser(req), req.params.assignmentId, req.body);
    res.json({ assignment });
  }),
);

assignmentsRouter.delete(
  '/:assignmentId',
  requireRole('professor'),
  asyncHandler(async (req, res) => {
    await deleteAssignment(currentUser(req), req.params.assignmentId);
    res.status(204).send();
  }),
);

assignmentsRouter.get(
  '/:assignmentId/submissions',
  requireRole('professor'),
  validateQuery(submissionFilterSchema),
  asyncHandler(async (req, res) => {
    const result = await listSubmissions(req.params.assignmentId, res.locals.query);
    res.json(result);
  }),
);

assignmentsRouter.get(
  '/:assignmentId/groups',
  asyncHandler(async (req, res) => {
    res.json({ groups: await listGroupsForAssignment(currentUser(req), req.params.assignmentId) });
  }),
);

assignmentsRouter.post(
  '/:assignmentId/groups',
  requireRole('professor'),
  validateBody(groupInputSchema),
  asyncHandler(async (req, res) => {
    const group = await createGroup(currentUser(req), req.params.assignmentId, req.body);
    res.status(201).json({ group });
  }),
);

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

groupsRouter.patch(
  '/:groupId/leader',
  requireRole('professor'),
  validateBody(z.object({ leaderId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const group = await setGroupLeader(currentUser(req), req.params.groupId, req.body.leaderId);
    res.json({ group });
  }),
);

groupsRouter.delete(
  '/:groupId',
  requireRole('professor'),
  asyncHandler(async (req, res) => {
    await deleteGroup(currentUser(req), req.params.groupId);
    res.status(204).send();
  }),
);

/** Submission endpoints live under the assignment they belong to. */
export const submissionRouter = Router();
submissionRouter.use(requireAuth);

submissionRouter.post(
  '/assignments/:assignmentId/submissions',
  requireRole('student'),
  validateBody(submissionSchema),
  asyncHandler(async (req, res) => {
    const result = await submitAssignment(currentUser(req), req.params.assignmentId, req.body);
    res.status(201).json({ submission: result });
  }),
);

submissionRouter.post(
  '/submissions/:submissionId/acknowledge',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const result = await acknowledgeSubmission(currentUser(req), req.params.submissionId);
    res.json({ submission: result });
  }),
);

submissionRouter.patch(
  '/submissions/:submissionId/grade',
  requireRole('professor'),
  validateBody(gradeSchema),
  asyncHandler(async (req, res) => {
    const result = await gradeSubmission(currentUser(req), req.params.submissionId, req.body);
    res.json({ submission: result });
  }),
);
