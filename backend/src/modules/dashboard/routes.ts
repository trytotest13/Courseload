import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth } from '../../middleware/auth';
import { getDashboard } from './service';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getDashboard(currentUser(req)));
  }),
);
