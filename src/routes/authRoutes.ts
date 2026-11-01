import { Hono } from 'hono'

import { authController } from '~/controllers/authController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { loginRateLimiter, refreshRateLimiter } from '~/middlewares/rateLimiter'
import { zodValidator } from '~/middlewares/validator'
import type { AppVariables, Bindings } from '~/types'
import { loginSchema, logoutSchema, refreshTokenSchema, seedAdminSchema } from '~/validation/auth'

import {
  loginRouteDoc,
  logoutRouteDoc,
  meRouteDoc,
  refreshRouteDoc,
  seedAdminRouteDoc
} from './docs/authDocs'

const authRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

authRoutes.post(
  '/login',
  loginRouteDoc,
  loginRateLimiter,
  zodValidator('json', loginSchema),
  authController.login
)

authRoutes.post(
  '/refresh',
  refreshRouteDoc,
  refreshRateLimiter,
  zodValidator('json', refreshTokenSchema),
  authController.refresh
)

authRoutes.post(
  '/logout',
  logoutRouteDoc,
  zodValidator('json', logoutSchema),
  authController.logout
)

authRoutes.get('/me', meRouteDoc, authMiddleware, authController.getMe)

authRoutes.post(
  '/seed-admin',
  seedAdminRouteDoc,
  zodValidator('json', seedAdminSchema),
  authController.seedAdmin
)

export default authRoutes
