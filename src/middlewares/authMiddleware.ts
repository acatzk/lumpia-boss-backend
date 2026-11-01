import { eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'

import { users } from '~/db/schema'
import { tokenService } from '~/services/tokenService'
import type { AppContext, SafeUser, UserRole } from '~/types'
import { forbiddenJson, unauthorizedJson } from '~/utils/response'

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  } else {
    token = getCookie(c, 'lbs_access_token')
  }

  if (!token) {
    return unauthorizedJson(c, 'Authentication required. No bearer token provided.')
  }

  const jwtSecret = c.env.JWT_SECRET || 'lumpia-boss-fallback-secret-development'

  try {
    const payload = await tokenService.verifyAccessToken(token, jwtSecret)
    const ctx = c as unknown as AppContext

    const [userRecord] = await ctx.var.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    if (!userRecord || !userRecord.isActive) {
      return unauthorizedJson(c, 'User account is deactivated or no longer exists.')
    }

    const safeUser: SafeUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt
    }

    c.set('user', safeUser)
    await next()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid token'
    return unauthorizedJson(c, `Authentication failed: ${message}`)
  }
}

export const requireRoles = (...allowedRoles: UserRole[]): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user') as SafeUser | undefined
    if (!user) {
      return unauthorizedJson(c, 'Authentication required.')
    }

    if (!allowedRoles.includes(user.role)) {
      return forbiddenJson(c, 'Access denied: Insufficient permissions for this resource.')
    }

    await next()
  }
}
