import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { assignmentSchema } from '../assignments/schema';
import { createAssignment, listAssignmentsForCourse } from '../assignments/service';
import { createCourseSchema } from './schema';
import { createCourse, getCourseDetail, listCourses } from './service';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ courses: await listCourses(currentUser(req)) });
  }),
);

coursesRouter.post(
  '/',
  requireRole('professor'),
  validateBody(createCourseSchema),
  asyncHandler(async (req, res) => {
    const course = await createCourse(currentUser(req), req.body);
    res.status(201).json({ course });
  }),
);

coursesRouter.get(
  '/:courseId',
  asyncHandler(async (req, res) => {
    res.json(await getCourseDetail(currentUser(req), req.params.courseId));
  }),
);

// Lets the professor load the assignment list for the course they are editing.
coursesRouter.get(
  '/:courseId/assignments',
  requireRole('professor'),
  asyncHandler(async (req, res) => {
    const detail = await getCourseDetail(currentUser(req), req.params.courseId);
    res.json({ assignments: detail.role === 'professor' ? detail.assignments : [] });
  }),
);

coursesRouter.post(
  '/:courseId/assignments',
  requireRole('professor'),
  validateBody(assignmentSchema),
  asyncHandler(async (req, res) => {
    const assignment = await createAssignment(currentUser(req), req.params.courseId, req.body);
    res.status(201).json({ assignment });
  }),
);
