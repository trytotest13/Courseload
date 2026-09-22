import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { ApiError } from '../../lib/errors';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { loginSchema, registerSchema } from './schema';
import { getUserById, loginUser, registerUser } from './service';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body);
    res.json(result);
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(currentUser(req).id);
    if (!user) throw ApiError.unauthorized('That account no longer exists.');
    res.json({ user });
  }),
);
